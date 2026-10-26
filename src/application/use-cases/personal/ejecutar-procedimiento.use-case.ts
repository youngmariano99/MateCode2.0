import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  iniciarEjecucionProcedimientoSchema,
  tildarPasoSchema,
  clonarPasosParaEjecucion,
  calcularProgresoProcedimiento,
  aplicarTildadoPaso,
  type IniciarEjecucionProcedimientoInput,
  type TildarPasoInput,
  type EjecucionProcedimiento,
  type EstadoEjecucionProcedimiento,
} from "../../../domain/entidades/procedimiento.entity";
import { registrarHistorialPersonal } from "../../servicios/registrar-historial-personal.service";

function idEjecucion(): string {
  return `ejec_proc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

export interface FiltroEjecuciones {
  procedimientoId?: string;
  clienteId?: string;
  actividadId?: string;
  diaTarea?: string;
  estado?: EstadoEjecucionProcedimiento;
}

/**
 * EjecutarProcedimientoUseCase — orquesta el ciclo de vida de una instancia
 * concreta de un procedimiento (SOP) en ejecución.
 * Permite empezar por la mañana, tildar pasos, pausar al mediodía, retomar por
 * la tarde y finalizar. Si está vinculada a una actividad, al completarse todos
 * los pasos requeridos puede autocompletar la actividad asociada.
 */
export class EjecutarProcedimientoUseCase {
  public async iniciarEjecucion(
    input: IniciarEjecucionProcedimientoInput
  ): Promise<Resultado<string>> {
    const parsed = iniciarEjecucionProcedimientoSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }

    const procedimiento = await db.procedimiento.get(
      parsed.data.procedimientoId
    );
    if (!procedimiento || procedimiento.eliminadoEn) {
      return Resultado.falla(
        new ErrorNoEncontrado(
          "No se encontró el procedimiento base para ejecutar."
        )
      );
    }

    const ahora = Date.now();
    const id = idEjecucion();
    const pasos = clonarPasosParaEjecucion(procedimiento.pasos);
    const metricas = calcularProgresoProcedimiento(pasos);

    const ejecucion: EjecucionProcedimiento = {
      id,
      procedimientoId: procedimiento.id,
      tituloProcedimiento: procedimiento.titulo,
      actividadId: parsed.data.actividadId,
      clienteId: parsed.data.clienteId ?? procedimiento.clienteId,
      proyectoTrabajoId:
        parsed.data.proyectoTrabajoId ?? procedimiento.proyectoTrabajoId,
      diaTarea: parsed.data.diaTarea,
      estado: "en_progreso",
      pasos,
      totalPasos: metricas.totalPasos,
      pasosCompletados: metricas.pasosCompletados,
      porcentajeAvance: metricas.porcentajeAvance,
      todoObligatorioListo: metricas.todoObligatorioListo,
      iniciadoEn: ahora,
      actualizadoEn: ahora,
    };

    try {
      await db.transaction(
        "rw",
        [
          db.ejecucion_procedimiento,
          db.procedimiento,
          db.actividad,
          db.cola_eventos,
        ],
        async () => {
          await db.ejecucion_procedimiento.add(ejecucion);
          await QueueService.encolar("ejecucion_procedimiento", "crear", id, {
            ...ejecucion,
          });

          // Actualizar estadísticas del procedimiento base
          const nuevoVeces = (procedimiento.vecesEjecutado || 0) + 1;
          await db.procedimiento.update(procedimiento.id, {
            vecesEjecutado: nuevoVeces,
            ultimoEjecutadoEn: ahora,
            actualizadoEn: ahora,
          });
          await QueueService.encolar(
            "procedimiento",
            "editar",
            procedimiento.id,
            {
              id: procedimiento.id,
              vecesEjecutado: nuevoVeces,
              ultimoEjecutadoEn: ahora,
              actualizadoEn: ahora,
            }
          );

          // Si hay actividad vinculada, enlazar el ID de ejecución y de procedimiento
          if (parsed.data.actividadId) {
            const actividad = await db.actividad.get(parsed.data.actividadId);
            if (actividad) {
              await db.actividad.update(parsed.data.actividadId, {
                procedimientoId: procedimiento.id,
                procedimientoEjecucionId: id,
                actualizadoEn: ahora,
              });
              await QueueService.encolar(
                "actividad",
                "editar",
                parsed.data.actividadId,
                {
                  id: parsed.data.actividadId,
                  procedimientoId: procedimiento.id,
                  procedimientoEjecucionId: id,
                  actualizadoEn: ahora,
                }
              );
            }
          }
        }
      );

      await registrarHistorialPersonal({
        entidadTipo: "ejecucion_procedimiento",
        entidadId: id,
        accion: "crear",
        descripcion: `Ejecución de "${procedimiento.titulo}" iniciada (${pasos.length} pasos).`,
      });

      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error
            ? err.message
            : "Error al iniciar la ejecución del procedimiento."
        )
      );
    }
  }

  public async tildarPaso(
    input: TildarPasoInput & { autoCompletarActividad?: boolean }
  ): Promise<Resultado<EjecucionProcedimiento>> {
    const parsed = tildarPasoSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }

    const ejecucion = await db.ejecucion_procedimiento.get(
      parsed.data.ejecucionId
    );
    if (!ejecucion) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la ejecución del procedimiento.")
      );
    }

    let actualizada: EjecucionProcedimiento;
    try {
      actualizada = aplicarTildadoPaso(
        ejecucion,
        parsed.data.pasoId,
        parsed.data.completado,
        parsed.data.nota
      );
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al tildar el paso."
        )
      );
    }

    const ahora = Date.now();
    const autoCompletar = input.autoCompletarActividad !== false;
    const finalizoProcedimiento = actualizada.estado === "completado";
    const debeCompletarActividad =
      autoCompletar &&
      finalizoProcedimiento &&
      Boolean(actualizada.actividadId);

    try {
      await db.transaction(
        "rw",
        [db.ejecucion_procedimiento, db.actividad, db.cola_eventos],
        async () => {
          await db.ejecucion_procedimiento.put(actualizada);
          await QueueService.encolar(
            "ejecucion_procedimiento",
            "editar",
            actualizada.id,
            { ...actualizada }
          );

          if (debeCompletarActividad && actualizada.actividadId) {
            const actividad = await db.actividad.get(actualizada.actividadId);
            if (actividad && actividad.estado === "pendiente") {
              await db.actividad.update(actualizada.actividadId, {
                estado: "completada",
                actualizadoEn: ahora,
              });
              await QueueService.encolar(
                "actividad",
                "editar",
                actualizada.actividadId,
                {
                  id: actualizada.actividadId,
                  estado: "completada",
                  actualizadoEn: ahora,
                }
              );
            }
          }
        }
      );

      const pasoModificado = actualizada.pasos.find(
        (p) => p.pasoId === parsed.data.pasoId
      );
      await registrarHistorialPersonal({
        entidadTipo: "ejecucion_procedimiento",
        entidadId: actualizada.id,
        accion: "editar",
        descripcion: `Paso "${pasoModificado?.titulo ?? parsed.data.pasoId}" ${
          parsed.data.completado ? "completado" : "desmarcado"
        } (${actualizada.porcentajeAvance}% total).`,
        campoNuevo: {
          pasosCompletados: actualizada.pasosCompletados,
          porcentajeAvance: actualizada.porcentajeAvance,
          todoObligatorioListo: actualizada.todoObligatorioListo,
          estado: actualizada.estado,
        },
      });

      return Resultado.exito(actualizada);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error
            ? err.message
            : "Error al guardar el paso tildado."
        )
      );
    }
  }

  public async pausarEjecucion(id: string): Promise<Resultado<void>> {
    const ejecucion = await db.ejecucion_procedimiento.get(id);
    if (!ejecucion) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la ejecución del procedimiento.")
      );
    }
    const ahora = Date.now();
    try {
      await db.ejecucion_procedimiento.update(id, {
        estado: "pausado",
        actualizadoEn: ahora,
      });
      await QueueService.encolar("ejecucion_procedimiento", "editar", id, {
        id,
        estado: "pausado",
        actualizadoEn: ahora,
      });
      await registrarHistorialPersonal({
        entidadTipo: "ejecucion_procedimiento",
        entidadId: id,
        accion: "editar",
        descripcion: "Ejecución pausada.",
        campoNuevo: { estado: "pausado" },
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al pausar la ejecución."
        )
      );
    }
  }

  public async reanudarEjecucion(id: string): Promise<Resultado<void>> {
    const ejecucion = await db.ejecucion_procedimiento.get(id);
    if (!ejecucion) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la ejecución del procedimiento.")
      );
    }
    const ahora = Date.now();
    try {
      await db.ejecucion_procedimiento.update(id, {
        estado: "en_progreso",
        actualizadoEn: ahora,
      });
      await QueueService.encolar("ejecucion_procedimiento", "editar", id, {
        id,
        estado: "en_progreso",
        actualizadoEn: ahora,
      });
      await registrarHistorialPersonal({
        entidadTipo: "ejecucion_procedimiento",
        entidadId: id,
        accion: "editar",
        descripcion: "Ejecución reanudada.",
        campoNuevo: { estado: "en_progreso" },
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al reanudar la ejecución."
        )
      );
    }
  }

  public async cancelarEjecucion(
    id: string,
    motivo?: string
  ): Promise<Resultado<void>> {
    const ejecucion = await db.ejecucion_procedimiento.get(id);
    if (!ejecucion) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la ejecución del procedimiento.")
      );
    }
    const ahora = Date.now();
    try {
      await db.ejecucion_procedimiento.update(id, {
        estado: "cancelado",
        actualizadoEn: ahora,
      });
      await QueueService.encolar("ejecucion_procedimiento", "editar", id, {
        id,
        estado: "cancelado",
        actualizadoEn: ahora,
      });
      await registrarHistorialPersonal({
        entidadTipo: "ejecucion_procedimiento",
        entidadId: id,
        accion: "editar",
        descripcion: motivo
          ? `Ejecución cancelada: ${motivo}`
          : "Ejecución cancelada.",
        campoNuevo: { estado: "cancelado" },
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al cancelar la ejecución."
        )
      );
    }
  }

  public async obtenerEjecucion(
    id: string
  ): Promise<Resultado<EjecucionProcedimiento>> {
    const ejecucion = await db.ejecucion_procedimiento.get(id);
    if (!ejecucion) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la ejecución del procedimiento.")
      );
    }
    return Resultado.exito(ejecucion);
  }

  public async obtenerPorActividad(
    actividadId: string
  ): Promise<Resultado<EjecucionProcedimiento | null>> {
    const ejecucion = await db.ejecucion_procedimiento
      .where("actividadId")
      .equals(actividadId)
      .first();

    if (!ejecucion) {
      return Resultado.exito(null);
    }
    return Resultado.exito(ejecucion);
  }

  public async listarEjecuciones(
    filtros?: FiltroEjecuciones
  ): Promise<EjecucionProcedimiento[]> {
    let items = await db.ejecucion_procedimiento.toArray();

    if (filtros?.procedimientoId) {
      items = items.filter(
        (e) => e.procedimientoId === filtros.procedimientoId
      );
    }
    if (filtros?.clienteId) {
      items = items.filter((e) => e.clienteId === filtros.clienteId);
    }
    if (filtros?.actividadId) {
      items = items.filter((e) => e.actividadId === filtros.actividadId);
    }
    if (filtros?.diaTarea) {
      items = items.filter((e) => e.diaTarea === filtros.diaTarea);
    }
    if (filtros?.estado) {
      items = items.filter((e) => e.estado === filtros.estado);
    }

    return items.sort((a, b) => b.iniciadoEn - a.iniciadoEn);
  }
}
