import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import { ErrorDominio } from "../../../domain/errores/error-base";
import {
  importarBloqueCompletoSchema,
  importarPausasActivasSchema,
  type ItemRutinaJson,
  type ItemEjercicioNuevoJson,
  type ReglaProgresionJson,
} from "../../../domain/entidades/planificacion-entrenamiento.entity";
import {
  tipoEstructuraDeFormato,
  type BloqueEntrenamiento,
  type ItemCalentamiento,
  type PlantillaRutina,
  type ProgresionEjercicio,
  type ReglaProgresion,
  type RutinaProgramada,
  type EstructuraSeries,
  type EstructuraTiempo,
} from "../../../domain/entidades/rutina.entity";
import { avisosDeProgresion } from "../../../domain/entidades/progresion-entrenamiento.entity";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";
import { registrarHistorialPersonal } from "../../servicios/registrar-historial-personal.service";
import { GestionarEjerciciosUseCase } from "./gestionar-ejercicios.use-case";
import { GestionarPlantillasRutinaUseCase } from "./gestionar-plantillas-rutina.use-case";
import { GestionarBloquesUseCase } from "./gestionar-bloques.use-case";
import { catalogoInfo } from "./gestionar-progresion-bloque.use-case";

function mensajeDeIssues(
  issues: { path: PropertyKey[]; message: string }[]
): string {
  return issues
    .map((i) => `${i.path.map(String).join(".") || "(raíz)"}: ${i.message}`)
    .join(" — ");
}

function normalizar(s: string): string {
  return s.toLowerCase().trim();
}

const reglaDesdeJson = (r: ReglaProgresionJson): ReglaProgresion => ({
  tipo: r.tipo,
  incremento: r.incremento,
  cadaSemanas: r.cadaSemanas,
  desdePaso: r.desdeSemana,
  tope: r.tope,
});

interface RutinaResuelta {
  id?: string;
  error?: string;
  estructura?: EstructuraSeries | EstructuraTiempo;
  calentamiento?: string;
  calentamientoEstructura?: ItemCalentamiento[];
  progresiones: ProgresionEjercicio[];
  avisos: string[];
}

/**
 * Arma Bloque + Rutinas + Ejercicios a partir de un solo JSON generado con
 * IA (Sprint 22) — todo resuelto por título EXACTO, nunca duplicando:
 * - Ejercicio: si existe en el catálogo, se reusa su id; si no, se crea
 *   (validando equipamiento contra lo que el usuario tiene de verdad, ver
 *   GestionarEjerciciosUseCase).
 * - Rutina: si existe una con ese nombre, se ACTUALIZA in-place (mismo
 *   nombre + números nuevos = "ajustar", no "otra rutina"); si no, se crea.
 *   Antes de actualizar se congela la estructura vieja en los bloques que ya
 *   la usaban, para que ajustar una rutina en un bloque nuevo no cambie el
 *   plan de los anteriores.
 * Cada Rutina programada guarda su estructura base (paso 1) y sus reglas de
 * progresión (por ejercicio o generales), mínimos y descargas.
 * Se resuelve todo SECUENCIAL (no Promise.all) a propósito: si dos Rutinas
 * del mismo JSON comparten un Ejercicio nuevo, tiene que terminar de
 * crearse antes de que la siguiente rutina intente resolverlo.
 */
export class ImportarBloqueEntrenamientoUseCase {
  private readonly ejercicios = new GestionarEjerciciosUseCase();
  private readonly plantillas = new GestionarPlantillasRutinaUseCase();
  private readonly bloques = new GestionarBloquesUseCase();

  private async resolverOCrearEjercicio(
    nombre: string,
    ejerciciosNuevos: ItemEjercicioNuevoJson[]
  ): Promise<{ id?: string; permiteCarga?: boolean; error?: string }> {
    const nombreNorm = normalizar(nombre);
    const existente = await db.catalogo_ejercicio
      .filter((e) => normalizar(e.nombre) === nombreNorm)
      .first();
    if (existente) {
      return { id: existente.id, permiteCarga: existente.permiteCarga };
    }

    const nuevo = ejerciciosNuevos.find(
      (e) => normalizar(e.nombre) === nombreNorm
    );
    if (!nuevo) {
      return {
        error: `No se encontró el ejercicio "${nombre}" (ni en el catálogo ni en "ejerciciosNuevos").`,
      };
    }
    const res = await this.ejercicios.crearEjercicio(nuevo);
    if (!res.ok) {
      return { error: `Ejercicio "${nombre}": ${res.error!.mensaje}` };
    }
    return { id: res.valor, permiteCarga: nuevo.permiteCarga ?? false };
  }

  /** La entrada en calor: texto libre, o lista de ejercicios con cantidad (se enlaza al catálogo si el nombre coincide). */
  private async resolverCalentamiento(
    cal: ItemRutinaJson["calentamiento"]
  ): Promise<{ texto?: string; estructura?: ItemCalentamiento[] }> {
    if (cal === undefined) return {};
    if (typeof cal === "string") return { texto: cal };
    const estructura: ItemCalentamiento[] = [];
    for (const it of cal) {
      const enCatalogo = await db.catalogo_ejercicio
        .filter((e) => normalizar(e.nombre) === normalizar(it.nombre))
        .first();
      estructura.push({ ...it, ejercicioId: enCatalogo?.id });
    }
    const texto = estructura
      .map((i) => {
        const cantidad =
          i.series && (i.reps || i.tiempoSeg)
            ? `${i.series}x${i.reps ?? `${i.tiempoSeg}s`}`
            : i.reps
              ? `${i.reps}`
              : i.tiempoSeg
                ? `${i.tiempoSeg}s`
                : "";
        return `${i.nombre}${cantidad ? ` (${cantidad}${i.nota ? ` ${i.nota}` : ""})` : ""}`;
      })
      .join(" + ");
    return { texto, estructura };
  }

  private async armarEstructura(
    item: ItemRutinaJson,
    ejerciciosNuevos: ItemEjercicioNuevoJson[]
  ): Promise<{
    estructura: EstructuraSeries | EstructuraTiempo;
    tipoEstructura: "series" | "tiempo";
    errores: string[];
    huboEjercicios: boolean;
    progresiones: ProgresionEjercicio[];
  }> {
    const tipo = tipoEstructuraDeFormato(item.formato);
    const errores: string[] = [];
    const progresiones: ProgresionEjercicio[] = [];

    const registrarProgresion = (
      ejercicioId: string,
      ej: (typeof item.ejercicios)[number]
    ) => {
      if (typeof ej === "string") return;
      const prog = ej.progresion;
      const sinProgresion = prog === "ninguna";
      const reglas: ReglaProgresion[] =
        prog === undefined || prog === "ninguna"
          ? []
          : (Array.isArray(prog) ? prog : [prog]).map(reglaDesdeJson);
      if (
        reglas.length === 0 &&
        !sinProgresion &&
        !ej.minimo &&
        ej.nivel === undefined
      )
        return;
      progresiones.push({
        ejercicioId,
        reglas,
        sinProgresion: sinProgresion || undefined,
        minimo: ej.minimo,
        nivelBase: tipo === "tiempo" ? ej.nivel : undefined,
      });
    };

    if (tipo === "series") {
      const bloques: EstructuraSeries["bloques"] = [];
      for (const ej of item.ejercicios) {
        const obj = typeof ej === "string" ? { nombre: ej } : ej;
        const resuelto = await this.resolverOCrearEjercicio(
          obj.nombre,
          ejerciciosNuevos
        );
        if (!resuelto.id) {
          errores.push(resuelto.error!);
          continue;
        }
        const numeroSets = typeof ej === "string" ? 3 : ej.series || 3;
        // Nunca guardar pesoKg en un ejercicio que no permite carga externa
        // (peso corporal) — sin importar lo que haya puesto la IA en el
        // JSON, para no ensuciar las estadísticas con un "1kg" inventado.
        const pesoValido =
          resuelto.permiteCarga && typeof ej !== "string"
            ? ej.pesoKg
            : undefined;
        bloques.push({
          ejercicioId: resuelto.id,
          sets: Array.from({ length: numeroSets }, () => ({
            reps: typeof ej === "string" ? undefined : ej.reps,
            pesoKg: pesoValido,
          })),
          nivel: typeof ej === "string" ? undefined : ej.nivel,
        });
        registrarProgresion(resuelto.id, ej);
      }
      return {
        estructura: { bloques },
        tipoEstructura: "series",
        errores,
        huboEjercicios: bloques.length > 0,
        progresiones,
      };
    }

    const ejercicioIds: string[] = [];
    for (const ej of item.ejercicios) {
      const nombre = typeof ej === "string" ? ej : ej.nombre;
      const resuelto = await this.resolverOCrearEjercicio(
        nombre,
        ejerciciosNuevos
      );
      if (!resuelto.id) {
        errores.push(resuelto.error!);
        continue;
      }
      ejercicioIds.push(resuelto.id);
      registrarProgresion(resuelto.id, ej);
    }
    return {
      estructura: {
        ejercicioIds,
        numeroRondas: item.numeroRondas,
        tiempoTrabajoSeg: item.tiempoTrabajoSeg,
        tiempoDescansoSeg: item.tiempoDescansoSeg,
        tiempoLimiteMin: item.tiempoLimiteMin,
      },
      tipoEstructura: "tiempo",
      errores,
      huboEjercicios: ejercicioIds.length > 0,
      progresiones,
    };
  }

  /** Antes de ajustar una plantilla, deja su estructura vieja "congelada" en los bloques que la usaban sin copia propia. */
  private async congelarEnBloques(plantilla: PlantillaRutina): Promise<void> {
    const bloques = (await db.bloque_entrenamiento.toArray()).filter(
      (b) =>
        !b.eliminado &&
        b.rutinasProgramadas.some(
          (r) => r.plantillaId === plantilla.id && !r.estructuraBase
        )
    );
    for (const b of bloques) {
      const rutinasProgramadas = b.rutinasProgramadas.map((r) =>
        r.plantillaId === plantilla.id && !r.estructuraBase
          ? {
              ...r,
              estructuraBase: plantilla.estructura,
              calentamientoBase: plantilla.calentamiento,
              calentamientoEstructuraBase: plantilla.calentamientoEstructura,
            }
          : r
      );
      const actualizadoEn = Date.now();
      await db.bloque_entrenamiento.update(b.id, {
        rutinasProgramadas,
        actualizadoEn,
      });
      await QueueService.encolar("bloque_entrenamiento", "editar", b.id, {
        id: b.id,
        rutinasProgramadas,
        actualizadoEn,
      });
    }
  }

  private async resolverOCrearRutina(
    item: ItemRutinaJson,
    ejerciciosNuevos: ItemEjercicioNuevoJson[]
  ): Promise<RutinaResuelta> {
    const {
      estructura,
      tipoEstructura,
      errores,
      huboEjercicios,
      progresiones,
    } = await this.armarEstructura(item, ejerciciosNuevos);
    if (!huboEjercicios) {
      return {
        progresiones: [],
        avisos: [],
        error: `Rutina "${item.nombre}": ningún ejercicio pudo resolverse (${errores.join(" — ") || "sin ejercicios"}).`,
      };
    }

    const cal = await this.resolverCalentamiento(item.calentamiento);
    const avisos: string[] = [];
    if (item.formato !== "pausa_activa" && !cal.estructura) {
      avisos.push(
        `Rutina "${item.nombre}": el calentamiento no viene como lista de ejercicios con cantidades (queda como texto).`
      );
    }
    if (tipoEstructura === "series") {
      const info = await catalogoInfo();
      const nombres = new Map(
        (await db.catalogo_ejercicio.toArray()).map((e) => [e.id, e.nombre])
      );
      avisos.push(
        ...avisosDeProgresion(
          estructura as EstructuraSeries,
          {
            progresiones,
            progresionGeneral: item.progresionGeneral?.map(reglaDesdeJson),
          },
          info,
          (id) => nombres.get(id) ?? id
        ).map((a) => `Rutina "${item.nombre}": ${a}`)
      );
    }

    const nombreNorm = normalizar(item.nombre);
    const existente = await db.plantilla_rutina
      .filter((p) => !p.eliminado && normalizar(p.nombre) === nombreNorm)
      .first();

    const base = {
      estructura,
      calentamiento: cal.texto,
      calentamientoEstructura: cal.estructura,
      progresiones,
      avisos,
    };
    if (existente) {
      await this.congelarEnBloques(existente);
      const res = await this.plantillas.ajustarPlantilla({
        id: existente.id,
        formato: item.formato,
        tipoEstructura,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        estructura: estructura as any,
        calentamiento: cal.texto,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        calentamientoEstructura: cal.estructura as any,
      });
      if (!res.ok) {
        return {
          ...base,
          error: `Rutina "${item.nombre}": ${res.error!.mensaje}`,
        };
      }
      return { ...base, id: existente.id };
    }

    const res = await this.plantillas.crearPlantilla({
      nombre: item.nombre,
      formato: item.formato,
      tipoEstructura,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      estructura: estructura as any,
      calentamiento: cal.texto,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      calentamientoEstructura: cal.estructura as any,
    });
    if (!res.ok) {
      return {
        ...base,
        error: `Rutina "${item.nombre}": ${res.error!.mensaje}`,
      };
    }
    return { ...base, id: res.valor };
  }

  /** Resuelve todas las Rutinas de un Bloque del JSON y las deja como Rutinas programadas (con su estructura base y reglas). */
  private async armarProgramadas(
    data: ReturnType<typeof importarBloqueCompletoSchema.parse>
  ): Promise<{
    programadas: RutinaProgramada[];
    errores: string[];
    avisos: string[];
  }> {
    const programadas: RutinaProgramada[] = [];
    const errores: string[] = [];
    const avisos: string[] = [];
    for (const r of data.rutinas) {
      const res = await this.resolverOCrearRutina(r, data.ejerciciosNuevos);
      avisos.push(...res.avisos);
      if (res.id) {
        programadas.push({
          plantillaId: res.id,
          // Sin "diasSemana" explícito, asume días hábiles — el prompt
          // siempre le pide a la IA que lo declare, esto es red de contención.
          diasSemana:
            r.diasSemana && r.diasSemana.length > 0
              ? r.diasSemana
              : [1, 2, 3, 4, 5],
          estructuraBase: res.estructura,
          calentamientoBase: res.calentamiento,
          calentamientoEstructuraBase: res.calentamientoEstructura,
          progresiones:
            res.progresiones.length > 0 ? res.progresiones : undefined,
          progresionGeneral: r.progresionGeneral?.map(reglaDesdeJson),
          progresionTiempo: r.progresionTiempo?.map(reglaDesdeJson),
        });
      } else {
        errores.push(res.error!);
      }
    }
    return { programadas, errores, avisos };
  }

  /**
   * El JSON pegado puede traer UN Bloque ({bloque,...}) o VARIOS a la vez
   * (array de esos mismos objetos — ej. varios meses planificados juntos).
   * Se procesa SECUENCIAL, no en paralelo, por el mismo motivo que la
   * resolución de Ejercicios/Rutinas.
   *
   * modo "crear" (por defecto): cada objeto es un Bloque nuevo.
   * modo "reemplazar" (reestructurar): si ya hay un Bloque vigente con ese
   * nombre, se SOBREESCRIBE (rutinas, fechas, eje, progresiones, descargas);
   * si no, se crea. Las sesiones ya registradas no se tocan nunca, y lo que
   * había antes queda en el historial.
   */
  public async importarBloqueCompleto(
    items: unknown[],
    modo: "crear" | "reemplazar" = "crear"
  ): Promise<Resultado<string>> {
    if (items.length === 0) {
      return Resultado.falla(
        new ErrorDominio("No hay ningún bloque en el JSON.")
      );
    }

    const resultados: string[] = [];
    const erroresGenerales: string[] = [];
    const avisosTotales: string[] = [];

    for (const item of items) {
      const parsed = importarBloqueCompletoSchema.safeParse(item ?? {});
      if (!parsed.success) {
        erroresGenerales.push(
          `El JSON no tiene la estructura esperada: ${mensajeDeIssues(parsed.error.issues)}`
        );
        continue;
      }
      const { programadas, errores, avisos } = await this.armarProgramadas(
        parsed.data
      );
      avisosTotales.push(...avisos);
      const b = parsed.data.bloque;

      const existente =
        modo === "reemplazar"
          ? (await db.bloque_entrenamiento.toArray()).find(
              (x) =>
                !x.eliminado &&
                x.estado !== "cerrado" &&
                normalizar(x.nombre) === normalizar(b.nombre)
            )
          : undefined;

      if (existente) {
        await this.sobreescribirBloque(existente, {
          diaInicio: b.diaInicio ?? existente.diaInicio,
          diaFin: b.diaFin,
          ejeProgresionDefault: b.ejeProgresionDefault,
          rutinasProgramadas: programadas,
          descargas: b.descargas,
        });
        resultados.push(
          `"${b.nombre}" reemplazado (${programadas.length} rutina(s))` +
            (errores.length > 0 ? ` — Con errores: ${errores.join(" — ")}` : "")
        );
        continue;
      }

      const resBloque = await this.bloques.crearBloque({
        nombre: b.nombre,
        diaInicio: b.diaInicio ?? obtenerDiaTareaHoy(),
        diaFin: b.diaFin,
        ejeProgresionDefault: b.ejeProgresionDefault,
        rutinasProgramadas: programadas as unknown as {
          plantillaId: string;
          diasSemana: number[];
        }[],
        descargas: b.descargas,
      });
      if (!resBloque.ok) {
        erroresGenerales.push(
          `Bloque "${b.nombre}": ${resBloque.error!.mensaje}`
        );
        continue;
      }

      resultados.push(
        `"${b.nombre}" (${programadas.length} rutina(s))` +
          (errores.length > 0 ? ` — Con errores: ${errores.join(" — ")}` : "")
      );
    }

    if (resultados.length === 0) {
      return Resultado.falla(
        new ErrorDominio(
          erroresGenerales.join(" — ") || "No se creó ningún bloque."
        )
      );
    }

    return Resultado.exito(
      `${resultados.length} bloque(s) ${modo === "reemplazar" ? "procesado(s)" : "creado(s)"}: ${resultados.join("; ")}.` +
        (avisosTotales.length > 0
          ? ` Ojo: ${[...new Set(avisosTotales)].join(" | ")}`
          : "") +
        (erroresGenerales.length > 0
          ? ` Con errores: ${erroresGenerales.join(" — ")}`
          : "")
    );
  }

  /** Reestructurar: reemplaza los bloques vigentes que se llamen igual y crea los que no existan. */
  public async reestructurarBloques(
    items: unknown[]
  ): Promise<Resultado<string>> {
    return this.importarBloqueCompleto(items, "reemplazar");
  }

  private async sobreescribirBloque(
    actual: BloqueEntrenamiento,
    nuevo: Pick<
      BloqueEntrenamiento,
      | "diaInicio"
      | "diaFin"
      | "ejeProgresionDefault"
      | "rutinasProgramadas"
      | "descargas"
    >
  ): Promise<void> {
    const antes = {
      diaInicio: actual.diaInicio,
      diaFin: actual.diaFin,
      ejeProgresionDefault: actual.ejeProgresionDefault,
      rutinasProgramadas: actual.rutinasProgramadas,
      pasosSemana: actual.pasosSemana ?? null,
      descargas: actual.descargas ?? null,
      excepciones: actual.excepciones ?? null,
    };
    const cambios = {
      ...nuevo,
      // El calendario se reinicia: las semanas repetidas/saltadas eran del plan anterior.
      pasosSemana: undefined,
      excepciones: [],
    };
    const actualizadoEn = Date.now();
    await db.bloque_entrenamiento.update(actual.id, {
      ...cambios,
      actualizadoEn,
    });
    await QueueService.encolar("bloque_entrenamiento", "editar", actual.id, {
      id: actual.id,
      ...cambios,
      pasosSemana: null,
      actualizadoEn,
    });
    await registrarHistorialPersonal({
      entidadTipo: "bloque",
      entidadId: actual.id,
      accion: "reestructurar",
      descripcion: `Bloque "${actual.nombre}" reestructurado (reemplazado por el plan nuevo).`,
      campoAnterior: antes,
      campoNuevo: { ...cambios, pasosSemana: null } as Record<string, unknown>,
    });
  }

  public async importarPausasActivas(
    items: unknown[]
  ): Promise<Resultado<string>> {
    const parsed = importarPausasActivasSchema.safeParse(items[0] ?? {});
    if (!parsed.success) {
      return Resultado.falla(
        new ErrorDominio(
          `El JSON no tiene la estructura esperada: ${mensajeDeIssues(parsed.error.issues)}`
        )
      );
    }

    let creadas = 0;
    const errores: string[] = [];
    for (const r of parsed.data.rutinasNuevas) {
      const res = await this.resolverOCrearRutina(
        r,
        parsed.data.ejerciciosNuevos
      );
      if (res.id) creadas++;
      else errores.push(res.error!);
    }

    if (creadas === 0) {
      return Resultado.falla(
        new ErrorDominio(
          errores.length > 0
            ? errores.join(" — ")
            : "No se creó ninguna rutina."
        )
      );
    }
    return Resultado.exito(
      `${creadas} rutina(s) de pausa activa creada(s)/actualizada(s).` +
        (errores.length > 0 ? ` Con errores: ${errores.join(" — ")}` : "")
    );
  }
}
