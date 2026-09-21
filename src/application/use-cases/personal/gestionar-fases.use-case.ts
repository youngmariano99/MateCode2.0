import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  crearFaseSchema,
  ajustarFaseSchema,
  cerrarFaseSchema,
  type CrearFaseInput,
  type AjustarFaseInput,
  type CerrarFaseInput,
  type FasePersonal,
  type FaseSugerida,
  type CierreFase,
} from "../../../domain/entidades/fase-personal.entity";
import { calcularNivelLogro } from "../../../domain/entidades/objetivo-cuantificable.entity";
import { registrarHistorialPersonal } from "../../servicios/registrar-historial-personal.service";
import { recomputarEntregable } from "../../servicios/recomputar-progreso-personal.service";

function idFase(): string {
  return `fase_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Fases — checkpoints periódicos de un Entregable, con meta propia y cierre
 * con arrastre de faltante (ver fase-personal.entity.ts). El progreso lo
 * recalcula recomputarFasesDeEntregable() a partir de las Actividades del
 * Entregable, nunca se edita a mano acá.
 */
export class GestionarFasesUseCase {
  public async crearFase(input: CrearFaseInput): Promise<Resultado<string>> {
    const parsed = crearFaseSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const entregable = await db.entregable.get(parsed.data.entregableId);
    if (!entregable) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el entregable padre.")
      );
    }
    const ahora = Date.now();
    const id = idFase();
    const registro: FasePersonal = {
      id,
      entregableId: parsed.data.entregableId,
      titulo: parsed.data.titulo.trim(),
      orden: parsed.data.orden,
      diaInicio: parsed.data.diaInicio,
      diaLimite: parsed.data.diaLimite,
      cantidadObjetivo: parsed.data.cantidadObjetivo,
      unidad: parsed.data.unidad.trim(),
      progresoActual: 0,
      bandaAceptable: parsed.data.bandaAceptable,
      bandaMejorable: parsed.data.bandaMejorable,
      estado: "abierta",
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    try {
      await db.fase_personal.add(registro);
      await QueueService.encolar("fase_personal", "crear", id, { ...registro });
      await registrarHistorialPersonal({
        entidadTipo: "fase",
        entidadId: id,
        accion: "crear",
        descripcion: `Fase "${registro.titulo}" creada bajo "${entregable.titulo}".`,
      });
      // Una Fase nueva puede caer sobre un rango donde ya hay Actividades
      // cargadas — sin recalcular, quedaba en 0 hasta que se tocara alguna.
      await recomputarEntregable(parsed.data.entregableId);
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear la fase."
        )
      );
    }
  }

  /** Crea varias Fases de una, a partir del resultado de calcularDistribucionProgresiva — para "Generar Fases automáticamente". */
  public async crearFasesDesdeDistribucion(
    entregableId: string,
    fasesSugeridas: FaseSugerida[],
    unidad: string,
    tituloBase: string
  ): Promise<Resultado<number>> {
    let creadas = 0;
    const errores: string[] = [];
    for (const f of fasesSugeridas) {
      const res = await this.crearFase({
        entregableId,
        titulo: `${tituloBase} — parte ${f.orden + 1}`,
        orden: f.orden,
        diaInicio: f.diaInicio,
        diaLimite: f.diaLimite,
        cantidadObjetivo: f.cantidadObjetivo,
        unidad,
      });
      if (res.ok) creadas++;
      else errores.push(res.error!.mensaje);
    }
    if (creadas === 0) {
      return Resultado.falla(
        new ErrorDominio(
          errores.length > 0 ? errores.join(" — ") : "No se creó ninguna fase."
        )
      );
    }
    return Resultado.exito(creadas);
  }

  public async ajustarFase(input: AjustarFaseInput): Promise<Resultado<void>> {
    const parsed = ajustarFaseSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const fase = await db.fase_personal.get(parsed.data.id);
    if (!fase) {
      return Resultado.falla(new ErrorNoEncontrado("No se encontró la fase."));
    }
    if (
      parsed.data.diaLimite === undefined &&
      parsed.data.cantidadObjetivo === undefined &&
      parsed.data.bandaAceptable === undefined &&
      parsed.data.bandaMejorable === undefined
    ) {
      return Resultado.falla(
        new ErrorDominio(
          "Indicá una nueva fecha, una nueva cantidad, una banda, o alguna combinación."
        )
      );
    }
    if (
      parsed.data.diaLimite !== undefined &&
      parsed.data.diaLimite < fase.diaInicio
    ) {
      return Resultado.falla(
        new ErrorDominio(
          "La fecha límite no puede ser anterior al inicio de la fase."
        )
      );
    }
    const actualizadoEn = Date.now();
    const cambios: Partial<FasePersonal> = { actualizadoEn };
    if (parsed.data.diaLimite !== undefined)
      cambios.diaLimite = parsed.data.diaLimite;
    if (parsed.data.cantidadObjetivo !== undefined)
      cambios.cantidadObjetivo = parsed.data.cantidadObjetivo;
    if (parsed.data.bandaAceptable !== undefined)
      cambios.bandaAceptable = parsed.data.bandaAceptable;
    if (parsed.data.bandaMejorable !== undefined)
      cambios.bandaMejorable = parsed.data.bandaMejorable;
    try {
      await db.fase_personal.update(parsed.data.id, cambios);
      await QueueService.encolar("fase_personal", "editar", parsed.data.id, {
        id: parsed.data.id,
        ...cambios,
      });
      await registrarHistorialPersonal({
        entidadTipo: "fase",
        entidadId: parsed.data.id,
        accion:
          parsed.data.diaLimite !== undefined
            ? "ajustar_fecha"
            : "ajustar_cantidad",
        campoAnterior: {
          diaLimite: fase.diaLimite,
          cantidadObjetivo: fase.cantidadObjetivo,
        },
        campoNuevo: cambios,
      });
      // Cambiar la fecha límite cambia qué Actividades caen en la Fase.
      await recomputarEntregable(fase.entregableId);
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al ajustar la fase."
        )
      );
    }
  }

  /**
   * Cierra una Fase — nunca automático, siempre con una decisión explícita
   * sobre el faltante (ver DECISIONES_CIERRE_FASE). Si hay bandas
   * configuradas y el nivel de logro quedó "mejorable"/"bajo", las 4
   * decisiones clásicas quedan bloqueadas: hace falta "reestructurar_restantes"
   * (o "descartar", que siempre es válido — abandonar la fase es una
   * decisión legítima incluso yendo mal).
   */
  public async cerrarFase(input: CerrarFaseInput): Promise<Resultado<void>> {
    const parsed = cerrarFaseSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const fase = await db.fase_personal.get(parsed.data.id);
    if (!fase) {
      return Resultado.falla(new ErrorNoEncontrado("No se encontró la fase."));
    }
    if (fase.estado !== "abierta") {
      return Resultado.falla(new ErrorDominio("Esta fase ya está cerrada."));
    }

    const nivelLogro = calcularNivelLogro(
      fase.cantidadObjetivo,
      fase.progresoActual,
      fase.bandaAceptable,
      fase.bandaMejorable
    );
    const bajoElMinimo = nivelLogro === "mejorable" || nivelLogro === "bajo";
    if (
      bajoElMinimo &&
      parsed.data.decision !== "reestructurar_restantes" &&
      parsed.data.decision !== "descartar"
    ) {
      return Resultado.falla(
        new ErrorDominio(
          `No llegaste al mínimo aceptable de esta fase (nivel "${nivelLogro}") — elegí "Reestructurar restantes" o "Descartar", las otras decisiones son solo para un faltante chico.`
        )
      );
    }

    const meta = fase.cantidadObjetivo;
    const logrado = fase.progresoActual;
    const faltante = Math.max(0, meta - logrado);
    let cantidadTrasladada = 0;

    const siguientes = async () =>
      db.fase_personal
        .where("entregableId")
        .equals(fase.entregableId)
        .and((f) => f.estado === "abierta" && f.orden > fase.orden)
        .sortBy("orden");

    try {
      if (parsed.data.decision === "trasladar_siguiente") {
        const [siguiente] = await siguientes();
        if (!siguiente) {
          return Resultado.falla(
            new ErrorDominio(
              'No hay una fase siguiente a la cual trasladar — cerrala como "Descartar" o creá la próxima fase primero.'
            )
          );
        }
        const res = await this.ajustarFase({
          id: siguiente.id,
          cantidadObjetivo: siguiente.cantidadObjetivo + faltante,
        });
        if (!res.ok) return res;
        cantidadTrasladada = faltante;
      } else if (parsed.data.decision === "repartir_restantes") {
        const restantes = await siguientes();
        if (restantes.length === 0) {
          return Resultado.falla(
            new ErrorDominio(
              'No quedan fases abiertas para repartir el faltante — cerrala como "Descartar" o creá más fases primero.'
            )
          );
        }
        const porcion = faltante / restantes.length;
        for (const f of restantes) {
          const res = await this.ajustarFase({
            id: f.id,
            cantidadObjetivo: f.cantidadObjetivo + porcion,
          });
          if (!res.ok) return res;
        }
        cantidadTrasladada = faltante;
      } else if (parsed.data.decision === "descartar") {
        cantidadTrasladada = 0;
      } else if (parsed.data.decision === "parcial") {
        const distribucion = parsed.data.distribucionManual ?? [];
        const suma = distribucion.reduce((s, d) => s + d.cantidad, 0);
        if (distribucion.length === 0 || suma > faltante) {
          return Resultado.falla(
            new ErrorDominio(
              "La distribución manual tiene que sumar como máximo el faltante."
            )
          );
        }
        for (const d of distribucion) {
          const destino = await db.fase_personal.get(d.faseId);
          if (!destino || destino.entregableId !== fase.entregableId) {
            return Resultado.falla(
              new ErrorDominio("Una de las fases elegidas no es válida.")
            );
          }
          const res = await this.ajustarFase({
            id: d.faseId,
            cantidadObjetivo: destino.cantidadObjetivo + d.cantidad,
          });
          if (!res.ok) return res;
        }
        cantidadTrasladada = suma;
      } else {
        // "reestructurar_restantes"
        const nuevas = parsed.data.nuevasCantidadesRestantes ?? [];
        if (nuevas.length === 0) {
          return Resultado.falla(
            new ErrorDominio(
              "Faltan las nuevas cantidades por fase — generalas primero con la vista previa."
            )
          );
        }
        for (const n of nuevas) {
          const destino = await db.fase_personal.get(n.faseId);
          if (!destino || destino.entregableId !== fase.entregableId) {
            return Resultado.falla(
              new ErrorDominio("Una de las fases elegidas no es válida.")
            );
          }
          const res = await this.ajustarFase({
            id: n.faseId,
            cantidadObjetivo: n.cantidadObjetivo,
          });
          if (!res.ok) return res;
        }
        cantidadTrasladada = 0;
      }

      const cierre: CierreFase = {
        fecha: Date.now(),
        logrado,
        meta,
        faltante,
        decision: parsed.data.decision,
        cantidadTrasladada,
      };
      const actualizadoEn = Date.now();
      await db.fase_personal.update(fase.id, {
        estado: "cerrada",
        cierre,
        actualizadoEn,
      });
      await QueueService.encolar("fase_personal", "editar", fase.id, {
        id: fase.id,
        estado: "cerrada",
        cierre,
        actualizadoEn,
      });
      await registrarHistorialPersonal({
        entidadTipo: "fase",
        entidadId: fase.id,
        accion: "cerrar_fase",
        descripcion: `Fase "${fase.titulo}" cerrada: ${logrado}/${meta} — decisión: ${parsed.data.decision}.`,
        campoNuevo: cierre as unknown as Record<string, unknown>,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al cerrar la fase."
        )
      );
    }
  }

  /**
   * Borra las Fases huérfanas: las que quedaron colgando de un Entregable que
   * ya no existe (borrados hechos antes de que el borrado en cascada las
   * incluyera). Ya nadie las ve en la interfaz, pero seguían apareciendo como
   * activas en los prompts de IA. Devuelve cuántas se limpiaron.
   */
  public async limpiarFasesHuerfanas(): Promise<number> {
    const entregables = new Set(
      (await db.entregable.toCollection().primaryKeys()) as string[]
    );
    const huerfanas = (await db.fase_personal.toArray()).filter(
      (f) => !entregables.has(f.entregableId)
    );
    for (const f of huerfanas) {
      await db.fase_personal.delete(f.id);
      await QueueService.encolar("fase_personal", "eliminar", f.id, {});
    }
    return huerfanas.length;
  }

  /** Solo lectura — Fases vencidas que siguen abiertas, para el banner de aviso. Nunca cierra nada sola: cerrar exige la decisión del usuario. */
  public async detectarFasesPendientesDeCierre(
    hoy: string
  ): Promise<FasePersonal[]> {
    return db.fase_personal
      .where("estado")
      .equals("abierta")
      .and((f) => f.diaLimite < hoy)
      .toArray();
  }
}
