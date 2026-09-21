import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import type {
  BloqueEntrenamiento,
  Descarga,
  PlantillaRutina,
  ProgresionEjercicio,
  ReglaProgresion,
  RutinaProgramada,
} from "../../../domain/entidades/rutina.entity";
import {
  ajustarRitmo as calcularAjusteRitmo,
  eliminarUltimaSemana as calcularEliminarUltima,
  extenderBloque as calcularExtender,
  indiceSemanaDe,
  pasoDelDia,
  pasosDelBloque,
  planParaPaso,
  repetirSemana as calcularRepetir,
  resumirSemanaBloque,
  rutinasDelDia,
  type CatalogoInfo,
  type PlanSesion,
  type ResumenSemanaBloque,
} from "../../../domain/entidades/progresion-entrenamiento.entity";
import { sumarDias } from "../../../domain/entidades/personal.entity";
import { registrarHistorialPersonal } from "../../servicios/registrar-historial-personal.service";
import type { AccionHistorial } from "../../../domain/entidades/personal-historial.entity";

export type AlcanceAjuste = "bloque" | "este_y_siguientes";

export interface DecisionSemana {
  id: string;
  accion: AccionHistorial;
  descripcion?: string;
  nota?: string;
  indice?: number;
  creadoEn: number;
}

/** Info de catálogo que necesita el cálculo del plan (si lleva carga, qué niveles tiene). */
export async function catalogoInfo(): Promise<CatalogoInfo> {
  const catalogo = await db.catalogo_ejercicio.toArray();
  return new Map(
    catalogo.map((e) => [
      e.id,
      { permiteCarga: e.permiteCarga, niveles: e.niveles },
    ])
  );
}

/** El plan de una rutina en un día: usa la estructura base del bloque (si se guardó) y aplica progresiones, descarga y mínimos. */
export async function planDeSesion(
  bloque: BloqueEntrenamiento,
  plantilla: PlantillaRutina,
  dia: string,
  catalogo?: CatalogoInfo
): Promise<PlanSesion> {
  const programada = bloque.rutinasProgramadas.find(
    (r) => r.plantillaId === plantilla.id
  );
  return planParaPaso({
    tipoEstructura: plantilla.tipoEstructura,
    estructura: programada?.estructuraBase ?? plantilla.estructura,
    programada,
    paso: pasoDelDia(bloque, dia),
    descargas: bloque.descargas,
    catalogo: catalogo ?? (await catalogoInfo()),
  });
}

async function cargarBloque(
  id: string
): Promise<BloqueEntrenamiento | undefined> {
  const b = await db.bloque_entrenamiento.get(id);
  return b && !b.eliminado ? b : undefined;
}

/**
 * Decisiones sobre el plan de un bloque de entrenamiento: repetir, avanzar,
 * extender o acortar semanas, ajustar el ritmo de progresión, mover rutinas
 * de día y editar progresiones. TODO queda en el historial (antes/después):
 * aunque el bloque cambie después, siempre se puede ver qué se decidió y por
 * qué. Las sesiones ya registradas nunca se tocan.
 */
export class GestionarProgresionBloqueUseCase {
  private async guardarBloque(
    id: string,
    cambios: Partial<BloqueEntrenamiento>
  ): Promise<void> {
    const actualizadoEn = Date.now();
    await db.bloque_entrenamiento.update(id, { ...cambios, actualizadoEn });
    await QueueService.encolar("bloque_entrenamiento", "editar", id, {
      id,
      ...cambios,
      actualizadoEn,
    });
  }

  private async historial(
    bloqueId: string,
    accion: AccionHistorial,
    descripcion: string,
    antes: Record<string, unknown>,
    despues: Record<string, unknown>,
    nota?: string
  ) {
    await registrarHistorialPersonal({
      entidadTipo: "bloque",
      entidadId: bloqueId,
      accion,
      descripcion,
      campoAnterior: antes,
      campoNuevo: { ...despues, ...(nota ? { nota } : {}) },
    });
  }

  /** Cuando un bloque cambia de duración, los bloques planificados que le seguían se corren la misma cantidad de días (siguen encadenados). */
  private async desplazarSiguientes(
    bloque: BloqueEntrenamiento,
    finViejo: string,
    dias: number
  ): Promise<number> {
    if (dias === 0) return 0;
    const siguientes = (await db.bloque_entrenamiento.toArray()).filter(
      (b) =>
        !b.eliminado &&
        b.id !== bloque.id &&
        b.estado === "planificado" &&
        b.diaInicio > finViejo
    );
    for (const s of siguientes) {
      const cambios = {
        diaInicio: sumarDias(s.diaInicio, dias),
        diaFin: sumarDias(s.diaFin, dias),
      };
      await this.guardarBloque(s.id, cambios);
      await this.historial(
        s.id,
        "extender_bloque",
        `Corrido ${dias > 0 ? "+" : ""}${dias} día(s) porque cambió la duración de "${bloque.nombre}".`,
        { diaInicio: s.diaInicio, diaFin: s.diaFin },
        cambios
      );
    }
    return siguientes.length;
  }

  private async cambiarCalendario(
    bloque: BloqueEntrenamiento,
    cambio: { pasosSemana: number[]; diaFin: string },
    accion: AccionHistorial,
    descripcion: string,
    nota?: string
  ): Promise<Resultado<void>> {
    const antes = {
      pasosSemana: pasosDelBloque(bloque),
      diaFin: bloque.diaFin,
    };
    const [a, m, d] = bloque.diaFin.split("-").map(Number);
    const [a2, m2, d2] = cambio.diaFin.split("-").map(Number);
    const dias = Math.round(
      (Date.UTC(a2, m2 - 1, d2) - Date.UTC(a, m - 1, d)) / 86_400_000
    );
    try {
      await this.guardarBloque(bloque.id, cambio);
      await this.historial(bloque.id, accion, descripcion, antes, cambio, nota);
      await this.desplazarSiguientes(bloque, bloque.diaFin, dias);
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al cambiar el bloque."
        )
      );
    }
  }

  /** No pude hacer esta semana (o casi nada): la repito con el mismo paso y el bloque se alarga una semana. */
  public async repetirSemana(
    bloqueId: string,
    indice: number,
    nota?: string
  ): Promise<Resultado<void>> {
    const b = await cargarBloque(bloqueId);
    if (!b)
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el bloque.")
      );
    return this.cambiarCalendario(
      b,
      calcularRepetir(b, indice),
      "repetir_semana",
      `Semana ${indice + 1} repetida (paso ${pasosDelBloque(b)[indice]}); el bloque se extiende una semana.`,
      nota
    );
  }

  public async eliminarUltimaSemana(
    bloqueId: string,
    nota?: string
  ): Promise<Resultado<void>> {
    const b = await cargarBloque(bloqueId);
    if (!b)
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el bloque.")
      );
    const cambio = calcularEliminarUltima(b);
    if (!cambio) {
      return Resultado.falla(
        new ErrorDominio(
          "El bloque tiene una sola semana: no se puede acortar."
        )
      );
    }
    return this.cambiarCalendario(
      b,
      cambio,
      "eliminar_semana",
      "Se eliminó la última semana del bloque.",
      nota
    );
  }

  public async extenderBloque(
    bloqueId: string,
    nota?: string
  ): Promise<Resultado<void>> {
    const b = await cargarBloque(bloqueId);
    if (!b)
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el bloque.")
      );
    return this.cambiarCalendario(
      b,
      calcularExtender(b),
      "extender_bloque",
      "Se agregó una semana al final del bloque.",
      nota
    );
  }

  /** Con lo hecho alcanza: se sigue a la semana siguiente sin repetir. No cambia el plan, pero la decisión queda registrada. */
  public async avanzarSemana(
    bloqueId: string,
    indice: number,
    nota?: string
  ): Promise<Resultado<void>> {
    const b = await cargarBloque(bloqueId);
    if (!b)
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el bloque.")
      );
    await registrarHistorialPersonal({
      entidadTipo: "bloque",
      entidadId: bloqueId,
      accion: "avanzar_semana",
      descripcion: `Semana ${indice + 1} dada por suficiente: se sigue a la siguiente.`,
      campoNuevo: {
        indice,
        paso: pasosDelBloque(b)[indice],
        ...(nota ? { nota } : {}),
      },
    });
    return Resultado.exito(undefined);
  }

  /**
   * "Fue muy fácil / fue mucho": corre el ritmo de progresión de lo que falta.
   * delta > 0 saltea pasos (más rápido), delta < 0 los frena. Puede aplicarse
   * solo a este bloque o también a los bloques planificados que siguen.
   */
  public async ajustarRitmo(
    bloqueId: string,
    desdeIndice: number,
    delta: number,
    alcance: AlcanceAjuste = "bloque",
    nota?: string
  ): Promise<Resultado<number>> {
    if (!Number.isInteger(delta) || delta === 0) {
      return Resultado.falla(
        new ErrorDominio("Elegí cuántos pasos adelantar o atrasar.")
      );
    }
    const b = await cargarBloque(bloqueId);
    if (!b)
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el bloque.")
      );
    const objetivos: { bloque: BloqueEntrenamiento; desde: number }[] = [
      { bloque: b, desde: desdeIndice },
    ];
    if (alcance === "este_y_siguientes") {
      const siguientes = (await db.bloque_entrenamiento.toArray())
        .filter(
          (x) =>
            !x.eliminado &&
            x.id !== b.id &&
            x.estado === "planificado" &&
            x.diaInicio > b.diaFin
        )
        .sort((x, y) => x.diaInicio.localeCompare(y.diaInicio));
      siguientes.forEach((x) => objetivos.push({ bloque: x, desde: 0 }));
    }
    try {
      for (const o of objetivos) {
        const antes = pasosDelBloque(o.bloque);
        const despues = calcularAjusteRitmo(o.bloque, o.desde, delta);
        await this.guardarBloque(o.bloque.id, { pasosSemana: despues });
        await this.historial(
          o.bloque.id,
          "ajustar_ritmo",
          delta > 0
            ? `Progresión adelantada ${delta} paso(s) desde la semana ${o.desde + 1}: fue más fácil de lo esperado.`
            : `Progresión frenada ${-delta} paso(s) desde la semana ${o.desde + 1}: fue más difícil de lo esperado.`,
          { pasosSemana: antes },
          { pasosSemana: despues },
          nota
        );
      }
      return Resultado.exito(objetivos.length);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al ajustar el ritmo."
        )
      );
    }
  }

  /** Mueve una rutina de un día a otro (no la hice hoy → mañana u otro día). */
  public async moverRutina(
    bloqueId: string,
    plantillaId: string,
    deDia: string,
    aDia: string,
    nota?: string
  ): Promise<Resultado<void>> {
    const b = await cargarBloque(bloqueId);
    if (!b)
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el bloque.")
      );
    if (!b.rutinasProgramadas.some((r) => r.plantillaId === plantillaId)) {
      return Resultado.falla(
        new ErrorDominio("Esa rutina no está programada en este bloque.")
      );
    }
    if (deDia === aDia) return Resultado.exito(undefined);
    const antes = b.excepciones ?? [];
    // Si la rutina ya estaba movida a `deDia`, se reubica (no se encadenan movimientos).
    const previa = antes.find(
      (e) => e.plantillaId === plantillaId && e.aDia === deDia
    );
    const origen = previa ? previa.dia : deDia;
    let excepciones = antes.filter(
      (e) => !(e.plantillaId === plantillaId && e.aDia === deDia)
    );
    excepciones =
      origen === aDia
        ? excepciones.filter(
            (e) => !(e.plantillaId === plantillaId && e.dia === origen)
          )
        : [
            ...excepciones.filter(
              (e) => !(e.plantillaId === plantillaId && e.dia === origen)
            ),
            { plantillaId, dia: origen, aDia },
          ];
    try {
      await this.guardarBloque(bloqueId, { excepciones });
      const nombre =
        (await db.plantilla_rutina.get(plantillaId))?.nombre ?? plantillaId;
      await this.historial(
        bloqueId,
        "mover_rutina",
        `"${nombre}" movida del ${deDia} al ${aDia}.`,
        { excepciones: antes },
        { excepciones },
        nota
      );
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al mover la rutina."
        )
      );
    }
  }

  /** Edita las reglas de progresión de una rutina dentro del bloque (por ejercicio, general, por tiempo) y las descargas. */
  public async editarProgresion(
    bloqueId: string,
    plantillaId: string,
    cambios: {
      progresiones?: ProgresionEjercicio[];
      progresionGeneral?: ReglaProgresion[];
      progresionTiempo?: ReglaProgresion[];
    },
    descargas?: Descarga[],
    nota?: string
  ): Promise<Resultado<void>> {
    const b = await cargarBloque(bloqueId);
    if (!b)
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el bloque.")
      );
    const previa = b.rutinasProgramadas.find(
      (r) => r.plantillaId === plantillaId
    );
    if (!previa)
      return Resultado.falla(
        new ErrorDominio("Esa rutina no está programada en este bloque.")
      );
    const nueva: RutinaProgramada = { ...previa, ...cambios };
    const rutinasProgramadas = b.rutinasProgramadas.map((r) =>
      r.plantillaId === plantillaId ? nueva : r
    );
    const parche: Partial<BloqueEntrenamiento> = { rutinasProgramadas };
    if (descargas) parche.descargas = descargas;
    try {
      await this.guardarBloque(bloqueId, parche);
      const nombre =
        (await db.plantilla_rutina.get(plantillaId))?.nombre ?? plantillaId;
      await this.historial(
        bloqueId,
        "editar_progresion",
        `Progresión de "${nombre}" editada.`,
        {
          progresiones: previa.progresiones ?? null,
          progresionGeneral: previa.progresionGeneral ?? null,
          progresionTiempo: previa.progresionTiempo ?? null,
          descargas: b.descargas ?? null,
        },
        {
          progresiones: nueva.progresiones ?? null,
          progresionGeneral: nueva.progresionGeneral ?? null,
          progresionTiempo: nueva.progresionTiempo ?? null,
          descargas: parche.descargas ?? b.descargas ?? null,
        },
        nota
      );
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al editar la progresión."
        )
      );
    }
  }

  // ------------------------------------------------------------------------
  // Lectura
  // ------------------------------------------------------------------------

  /** Resumen de una semana del bloque (qué tocaba, qué se hizo y qué no). */
  public async resumenSemana(
    bloqueId: string,
    indice: number
  ): Promise<Resultado<ResumenSemanaBloque>> {
    const b = await cargarBloque(bloqueId);
    if (!b)
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el bloque.")
      );
    const registros = await db.registro_actividad
      .where("bloqueId")
      .equals(bloqueId)
      .toArray();
    return Resultado.exito(resumirSemanaBloque(b, indice, registros));
  }

  /** Decisiones registradas sobre un bloque, la más reciente primero. */
  public async decisiones(bloqueId: string): Promise<DecisionSemana[]> {
    const filas = await db.personal_historial
      .where("entidadId")
      .equals(bloqueId)
      .toArray();
    return filas
      .filter((h) => h.entidadTipo === "bloque")
      .map((h) => ({
        id: h.id,
        accion: h.accion,
        descripcion: h.descripcion,
        nota: (h.campoNuevo as { nota?: string } | undefined)?.nota,
        indice: (h.campoNuevo as { indice?: number } | undefined)?.indice,
        creadoEn: h.creadoEn,
      }))
      .sort((a, b) => b.creadoEn - a.creadoEn);
  }
}

/** Rutinas (con su plan efectivo) que tocan un día del bloque. */
export function rutinasDeHoy(
  bloque: BloqueEntrenamiento,
  dia: string
): RutinaProgramada[] {
  return rutinasDelDia(bloque, dia);
}

export { indiceSemanaDe };
