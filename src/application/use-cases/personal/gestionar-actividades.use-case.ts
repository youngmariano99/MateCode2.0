import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  crearActividadSchema,
  migrarActividadSchema,
  MAX_TAREAS_ENFOQUE_POR_DIA,
  MAX_TAREAS_MANTENIMIENTO_POR_DIA,
  type CrearActividadInput,
  type MigrarActividadInput,
  type Actividad,
} from "../../../domain/entidades/actividad.entity";
import { registrarHistorialPersonal } from "../../servicios/registrar-historial-personal.service";
import { recomputarEntregable } from "../../servicios/recomputar-progreso-personal.service";
import {
  lunesDeLaSemana,
  obtenerDiaTareaHoy,
} from "../../../domain/entidades/personal.entity";

function idActividad(): string {
  return `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Actividad — día a día, hoja de la jerarquía. `entregableId` es opcional:
 * una actividad suelta (sin Entregable arriba) sigue siendo válida. Mismo
 * tope duro que tenía el Búnker (1 enfoque + 3 mantenimiento por día) — acá
 * es donde se sigue enforzando, contando filas Actividad en vez de
 * TareaDiaria (ver migración Sprint 5).
 */
export class GestionarActividadesUseCase {
  public async crearActividad(
    input: CrearActividadInput
  ): Promise<Resultado<string>> {
    const parsed = crearActividadSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }

    let entregable:
      | {
          id: string;
          proyectoId: string;
          objetivoId: string;
          titulo: string;
          tieneHijos: boolean;
        }
      | undefined;
    if (parsed.data.entregableId) {
      const fila = await db.entregable.get(parsed.data.entregableId);
      if (!fila) {
        return Resultado.falla(
          new ErrorNoEncontrado("No se encontró el entregable padre.")
        );
      }
      entregable = fila;
    }

    if (
      parsed.data.tipo === "enfoque" ||
      parsed.data.tipo === "mantenimiento"
    ) {
      const activasDelDia = await db.actividad
        .where({ diaTarea: parsed.data.diaTarea, tipo: parsed.data.tipo })
        .and((a) => a.estado === "pendiente")
        .toArray();
      const limite =
        parsed.data.tipo === "enfoque"
          ? MAX_TAREAS_ENFOQUE_POR_DIA
          : MAX_TAREAS_MANTENIMIENTO_POR_DIA;
      if (activasDelDia.length >= limite) {
        return Resultado.falla(
          new ErrorDominio(
            "Para ingresar esta actividad, debés cancelar o migrar una de las existentes. Menos pero mejor."
          )
        );
      }
    }

    const ahora = Date.now();
    const id = idActividad();
    const registro: Actividad = {
      id,
      entregableId: entregable?.id,
      proyectoId: entregable?.proyectoId,
      objetivoId: entregable?.objetivoId,
      tipo: parsed.data.tipo,
      descripcion: parsed.data.descripcion.trim(),
      diaTarea: parsed.data.diaTarea,
      prioridad: parsed.data.prioridad,
      area: parsed.data.area,
      estado: "pendiente",
      cantidadObjetivo: parsed.data.cantidadObjetivo,
      unidad: parsed.data.unidad,
      semanaId: parsed.data.semanaId,
      recurrenciaId: parsed.data.recurrenciaId,
      origenInboxId: parsed.data.origenInboxId,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    try {
      await db.transaction(
        "rw",
        [db.actividad, db.entregable, db.cola_eventos],
        async () => {
          await db.actividad.add(registro);
          await QueueService.encolar("actividad", "crear", id, { ...registro });
          if (entregable && !entregable.tieneHijos) {
            await db.entregable.update(entregable.id, {
              tieneHijos: true,
              actualizadoEn: ahora,
            });
            await QueueService.encolar("entregable", "editar", entregable.id, {
              id: entregable.id,
              tieneHijos: true,
              actualizadoEn: ahora,
            });
          }
        }
      );
      await registrarHistorialPersonal({
        entidadTipo: "actividad",
        entidadId: id,
        accion: "crear",
        descripcion: entregable
          ? `Actividad "${registro.descripcion}" creada bajo "${entregable.titulo}".`
          : `Actividad suelta "${registro.descripcion}" creada.`,
      });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear la actividad."
        )
      );
    }
  }

  public async completarActividad(id: string): Promise<Resultado<void>> {
    return this.cambiarEstado(id, "completada");
  }

  public async cancelarActividad(id: string): Promise<Resultado<void>> {
    return this.cambiarEstado(id, "cancelada");
  }

  public async descartarActividad(id: string): Promise<Resultado<void>> {
    return this.cambiarEstado(id, "descartada");
  }

  private async cambiarEstado(
    id: string,
    estado: "completada" | "cancelada" | "descartada"
  ): Promise<Resultado<void>> {
    const actividad = await db.actividad.get(id);
    if (!actividad) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la actividad.")
      );
    }
    const actualizadoEn = Date.now();
    try {
      await db.actividad.update(id, { estado, actualizadoEn });
      await QueueService.encolar("actividad", "editar", id, {
        id,
        estado,
        actualizadoEn,
      });
      await registrarHistorialPersonal({
        entidadTipo: "actividad",
        entidadId: id,
        accion: "editar",
        descripcion: `Actividad "${actividad.descripcion}" → ${estado}.`,
      });
      if (actividad.entregableId) {
        await recomputarEntregable(actividad.entregableId);
      }
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error
            ? err.message
            : "Error al actualizar la actividad."
        )
      );
    }
  }

  /** Suma `cantidad` al progreso de una actividad cuantificada (ej. "escribí 300 de 500 palabras"). */
  public async registrarAvance(
    id: string,
    cantidad: number
  ): Promise<Resultado<void>> {
    if (!Number.isFinite(cantidad) || cantidad === 0) {
      return Resultado.falla(
        new ErrorDominio("Ingresá una cantidad distinta de cero.")
      );
    }
    const actividad = await db.actividad.get(id);
    if (!actividad) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la actividad.")
      );
    }
    // A diferencia de Entregable/Proyecto/Objetivo (donde cantidadObjetivo es
    // una meta declarada de antemano), una Actividad puede ser una instancia
    // materializada de un Entregable recurrente (ver materializar-actividades-
    // del-dia.use-case.ts) cuya cantidad del día no se sabe hasta hacerla —
    // "cuántos contactos hice hoy" no tiene un objetivo diario fijo. Por eso
    // acá SÍ se permite registrar avance sin cantidadObjetivo predeclarada.
    const progresoActual = Math.max(
      0,
      (actividad.progresoActual ?? 0) + cantidad
    );
    const estado =
      actividad.cantidadObjetivo !== undefined &&
      progresoActual >= actividad.cantidadObjetivo &&
      actividad.estado === "pendiente"
        ? ("completada" as const)
        : actividad.estado;
    const actualizadoEn = Date.now();
    try {
      await db.actividad.update(id, { progresoActual, estado, actualizadoEn });
      await QueueService.encolar("actividad", "editar", id, {
        id,
        progresoActual,
        estado,
        actualizadoEn,
      });
      await registrarHistorialPersonal({
        entidadTipo: "actividad",
        entidadId: id,
        accion: "registrar_avance",
        descripcion: `+${cantidad} ${actividad.unidad ?? ""}`.trim(),
      });
      if (actividad.entregableId) {
        await recomputarEntregable(actividad.entregableId);
      }
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al registrar el avance."
        )
      );
    }
  }

  /** Migración intencional (Bullet Journal) — mismo patrón que migrarTarea en gestionar-bunker.use-case.ts. */
  public async migrarActividad(
    input: MigrarActividadInput
  ): Promise<Resultado<string>> {
    const parsed = migrarActividadSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const original = await db.actividad.get(parsed.data.id);
    if (!original) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la actividad.")
      );
    }
    const ahora = Date.now();
    const nuevoId = idActividad();
    const copia: Actividad = {
      ...original,
      id: nuevoId,
      diaTarea: parsed.data.nuevoDiaTarea,
      estado: "pendiente",
      fechaMigradaDesde: original.diaTarea,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    try {
      await db.transaction("rw", [db.actividad, db.cola_eventos], async () => {
        await db.actividad.update(original.id, {
          estado: "migrada",
          actualizadoEn: ahora,
        });
        await db.actividad.add(copia);
        await QueueService.encolar("actividad", "editar", original.id, {
          id: original.id,
          estado: "migrada",
          actualizadoEn: ahora,
        });
        await QueueService.encolar("actividad", "crear", nuevoId, { ...copia });
      });
      await registrarHistorialPersonal({
        entidadTipo: "actividad",
        entidadId: nuevoId,
        accion: "crear",
        descripcion: `Migrada desde ${original.diaTarea} a ${parsed.data.nuevoDiaTarea}.`,
      });
      return Resultado.exito(nuevoId);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al migrar la actividad."
        )
      );
    }
  }

  /**
   * Promueve una Actividad de backlog a la agenda de hoy — crea una fila
   * nueva (enfoque/mantenimiento, sujeta al mismo tope diario) y marca la
   * de backlog como "completada" (cumplió su función), mismo criterio que
   * la migración Sprint 5 mapeó "promovida" de TareaPendiente.
   */
  public async promoverAAgenda(
    id: string,
    diaTarea: string,
    tipo: "enfoque" | "mantenimiento"
  ): Promise<Resultado<string>> {
    const pendiente = await db.actividad.get(id);
    if (!pendiente) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la actividad.")
      );
    }
    const creada = await this.crearActividad({
      tipo,
      diaTarea,
      descripcion: pendiente.descripcion,
      area: pendiente.area,
    });
    if (!creada.ok) return creada;

    const actualizadoEn = Date.now();
    await db.actividad.update(id, { estado: "completada", actualizadoEn });
    await QueueService.encolar("actividad", "editar", id, {
      id,
      estado: "completada",
      actualizadoEn,
    });
    return creada;
  }

  /**
   * "Armar la semana": asigna en lote las actividades de backlog elegidas a
   * la semana actual (lunes de hoy) — mismo patrón que tenía TareaPendiente.
   */
  public async asignarASemanaActual(ids: string[]): Promise<Resultado<void>> {
    if (ids.length === 0) {
      return Resultado.falla(new ErrorDominio("Elegí al menos una actividad."));
    }
    const semanaId = lunesDeLaSemana(obtenerDiaTareaHoy());
    const actualizadoEn = Date.now();
    try {
      for (const id of ids) {
        await db.actividad.update(id, { semanaId, actualizadoEn });
        await QueueService.encolar("actividad", "editar", id, {
          id,
          semanaId,
          actualizadoEn,
        });
      }
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al asignar a la semana."
        )
      );
    }
  }
}
