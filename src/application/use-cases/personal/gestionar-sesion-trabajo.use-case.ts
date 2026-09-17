import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  iniciarSesionSchema,
  type SesionTrabajo,
} from "../../../domain/entidades/sesion-trabajo.entity";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";

function idSesionTrabajo(): string {
  return `ses_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/** Segundos corridos desde `iniciadoEn` hasta ahora (siempre ≥0). */
function segundosDelTramoActual(iniciadoEn: number): number {
  return Math.max(0, Math.floor((Date.now() - iniciadoEn) / 1000));
}

/**
 * Sesión de trabajo enfocado (Oficina): una sola sesión "activa" o "pausada"
 * a la vez, app-wide — mismo criterio de foco único que
 * MAX_TAREAS_ENFOQUE_POR_DIA=1. Finalizar una sesión NUNCA completa la
 * Actividad: son acciones separadas a propósito (parar el cronómetro no
 * implica que la tarea esté terminada).
 */
export class GestionarSesionTrabajoUseCase {
  public async iniciarSesion(actividadId: string): Promise<Resultado<string>> {
    const parsed = iniciarSesionSchema.safeParse({ actividadId });
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }

    const actividad = await db.actividad.get(parsed.data.actividadId);
    if (!actividad) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la actividad.")
      );
    }
    if (actividad.estado !== "pendiente") {
      return Resultado.falla(
        new ErrorDominio("Esa actividad ya no está pendiente.")
      );
    }

    const enCurso = await db.sesion_trabajo
      .where("estado")
      .anyOf(["activa", "pausada"])
      .first();
    if (enCurso) {
      return Resultado.falla(
        new ErrorDominio(
          "Ya hay una sesión en curso — terminala antes de arrancar otra."
        )
      );
    }

    const ahora = Date.now();
    const id = idSesionTrabajo();
    const registro: SesionTrabajo = {
      id,
      actividadId: parsed.data.actividadId,
      diaTarea: obtenerDiaTareaHoy(),
      iniciadoEn: ahora,
      segundosAcumulados: 0,
      estado: "activa",
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    try {
      await db.sesion_trabajo.add(registro);
      await QueueService.encolar("sesion_trabajo", "crear", id, {
        ...registro,
      });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al iniciar la sesión."
        )
      );
    }
  }

  public async pausarParaDescanso(id: string): Promise<Resultado<void>> {
    const sesion = await db.sesion_trabajo.get(id);
    if (!sesion) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la sesión.")
      );
    }
    if (sesion.estado !== "activa") {
      return Resultado.falla(new ErrorDominio("La sesión no está activa."));
    }
    const ahora = Date.now();
    const segundosAcumulados =
      sesion.segundosAcumulados + segundosDelTramoActual(sesion.iniciadoEn);
    try {
      await db.sesion_trabajo.update(id, {
        segundosAcumulados,
        pausadoEn: ahora,
        estado: "pausada",
        actualizadoEn: ahora,
      });
      await QueueService.encolar("sesion_trabajo", "editar", id, {
        id,
        segundosAcumulados,
        pausadoEn: ahora,
        estado: "pausada",
        actualizadoEn: ahora,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al pausar la sesión."
        )
      );
    }
  }

  public async reanudarSesion(id: string): Promise<Resultado<void>> {
    const sesion = await db.sesion_trabajo.get(id);
    if (!sesion) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la sesión.")
      );
    }
    if (sesion.estado !== "pausada") {
      return Resultado.falla(new ErrorDominio("La sesión no está pausada."));
    }
    const ahora = Date.now();
    try {
      await db.sesion_trabajo.update(id, {
        iniciadoEn: ahora,
        pausadoEn: undefined,
        estado: "activa",
        actualizadoEn: ahora,
      });
      await QueueService.encolar("sesion_trabajo", "editar", id, {
        id,
        iniciadoEn: ahora,
        pausadoEn: undefined,
        estado: "activa",
        actualizadoEn: ahora,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al reanudar la sesión."
        )
      );
    }
  }

  public async finalizarSesion(id: string): Promise<Resultado<void>> {
    const sesion = await db.sesion_trabajo.get(id);
    if (!sesion) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la sesión.")
      );
    }
    if (sesion.estado === "finalizada") {
      return Resultado.falla(new ErrorDominio("La sesión ya está cerrada."));
    }
    const ahora = Date.now();
    const segundosAcumulados =
      sesion.estado === "activa"
        ? sesion.segundosAcumulados + segundosDelTramoActual(sesion.iniciadoEn)
        : sesion.segundosAcumulados;
    try {
      await db.sesion_trabajo.update(id, {
        segundosAcumulados,
        estado: "finalizada",
        actualizadoEn: ahora,
      });
      await QueueService.encolar("sesion_trabajo", "editar", id, {
        id,
        segundosAcumulados,
        estado: "finalizada",
        actualizadoEn: ahora,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al finalizar la sesión."
        )
      );
    }
  }
}
