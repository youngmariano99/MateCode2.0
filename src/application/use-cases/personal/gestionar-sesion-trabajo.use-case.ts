import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  iniciarSesionSchema,
  type IniciarSesionInput,
  type SesionTrabajo,
  type TipoPausaSesion,
} from "../../../domain/entidades/sesion-trabajo.entity";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";
import { GestionarConfiguracionOficinaUseCase } from "./gestionar-configuracion-oficina.use-case";

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
 * implica que la tarea esté terminada). Cada vez que se cierra un tramo de
 * trabajo (pausar o finalizar) se suma al contador de "desde la última
 * pausa activa" de la configuración, para que el intervalo de pausa cuente
 * el tiempo ENTRE sesiones.
 */
export class GestionarSesionTrabajoUseCase {
  private readonly configuracion = new GestionarConfiguracionOficinaUseCase();

  /** Acepta el id de una actividad (sesión libre, como antes) o la configuración completa. */
  public async iniciarSesion(
    entrada: string | IniciarSesionInput
  ): Promise<Resultado<string>> {
    const input: IniciarSesionInput =
      typeof entrada === "string" ? { actividadId: entrada } : entrada;
    const parsed = iniciarSesionSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }

    if (parsed.data.actividadId) {
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
      descripcion: parsed.data.descripcion,
      proyectoTrabajoId: parsed.data.proyectoTrabajoId,
      diaTarea: obtenerDiaTareaHoy(),
      modo: parsed.data.modo,
      duracionPlanificadaSeg:
        parsed.data.modo === "temporizador" && parsed.data.duracionMin
          ? Math.round(parsed.data.duracionMin * 60)
          : undefined,
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

  /** Liga (o desliga, con null) la sesión a un proyecto de trabajo — también se puede hacer con la sesión en curso o ya terminada. */
  public async asignarProyecto(
    id: string,
    proyectoTrabajoId: string | null
  ): Promise<Resultado<void>> {
    const sesion = await db.sesion_trabajo.get(id);
    if (!sesion) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la sesión.")
      );
    }
    const actualizadoEn = Date.now();
    await db.sesion_trabajo.update(id, {
      proyectoTrabajoId: proyectoTrabajoId ?? undefined,
      actualizadoEn,
    });
    await QueueService.encolar("sesion_trabajo", "editar", id, {
      id,
      proyectoTrabajoId,
      actualizadoEn,
    });
    return Resultado.exito(undefined);
  }

  /**
   * Pausa la sesión. "pausa_activa" (por defecto) es la interrupción para
   * hacer una rutina — la UI ofrece elegir una; "manual" es para dejarla y
   * seguir más tarde.
   */
  public async pausarParaDescanso(
    id: string,
    tipo: TipoPausaSesion = "pausa_activa"
  ): Promise<Resultado<void>> {
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
    const tramo = segundosDelTramoActual(sesion.iniciadoEn);
    const segundosAcumulados = sesion.segundosAcumulados + tramo;
    try {
      await db.sesion_trabajo.update(id, {
        segundosAcumulados,
        pausadoEn: ahora,
        tipoPausa: tipo,
        estado: "pausada",
        actualizadoEn: ahora,
      });
      await QueueService.encolar("sesion_trabajo", "editar", id, {
        id,
        segundosAcumulados,
        pausadoEn: ahora,
        tipoPausa: tipo,
        estado: "pausada",
        actualizadoEn: ahora,
      });
      await this.configuracion.sumarSegundos(tramo);
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
        tipoPausa: undefined,
        estado: "activa",
        actualizadoEn: ahora,
      });
      await QueueService.encolar("sesion_trabajo", "editar", id, {
        id,
        iniciadoEn: ahora,
        pausadoEn: undefined,
        tipoPausa: undefined,
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

  /**
   * Cierra la sesión guardando lo realmente trabajado (no lo planificado:
   * si el temporizador era de 60 min y se cierra a los 25, se guardan 25).
   * `nota` es opcional: qué se hizo.
   */
  public async finalizarSesion(
    id: string,
    nota?: string
  ): Promise<Resultado<void>> {
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
    const tramo =
      sesion.estado === "activa"
        ? segundosDelTramoActual(sesion.iniciadoEn)
        : 0;
    const segundosAcumulados = sesion.segundosAcumulados + tramo;
    const notaLimpia = nota?.trim() ? nota.trim() : undefined;
    try {
      await db.sesion_trabajo.update(id, {
        segundosAcumulados,
        estado: "finalizada",
        tipoPausa: undefined,
        nota: notaLimpia,
        actualizadoEn: ahora,
      });
      await QueueService.encolar("sesion_trabajo", "editar", id, {
        id,
        segundosAcumulados,
        estado: "finalizada",
        tipoPausa: undefined,
        nota: notaLimpia,
        actualizadoEn: ahora,
      });
      await this.configuracion.sumarSegundos(tramo);
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al finalizar la sesión."
        )
      );
    }
  }

  /** Suma tiempo al temporizador (para "+10 min" cuando suena y todavía no terminaste). */
  public async extenderTiempo(
    id: string,
    minutosExtra: number
  ): Promise<Resultado<void>> {
    const sesion = await db.sesion_trabajo.get(id);
    if (!sesion) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la sesión.")
      );
    }
    if (sesion.estado === "finalizada") {
      return Resultado.falla(new ErrorDominio("La sesión ya está cerrada."));
    }
    if (!Number.isFinite(minutosExtra) || minutosExtra <= 0) {
      return Resultado.falla(new ErrorDominio("Indicá minutos mayores a 0."));
    }
    const actualizadoEn = Date.now();
    const duracionPlanificadaSeg =
      (sesion.duracionPlanificadaSeg ?? 0) + Math.round(minutosExtra * 60);
    await db.sesion_trabajo.update(id, {
      modo: "temporizador",
      duracionPlanificadaSeg,
      actualizadoEn,
    });
    await QueueService.encolar("sesion_trabajo", "editar", id, {
      id,
      modo: "temporizador",
      duracionPlanificadaSeg,
      actualizadoEn,
    });
    return Resultado.exito(undefined);
  }

  /** Quita el límite: el temporizador pasa a libre y sigue corriendo. */
  public async pasarALibre(id: string): Promise<Resultado<void>> {
    const sesion = await db.sesion_trabajo.get(id);
    if (!sesion) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la sesión.")
      );
    }
    const actualizadoEn = Date.now();
    await db.sesion_trabajo.update(id, {
      modo: "libre",
      duracionPlanificadaSeg: undefined,
      actualizadoEn,
    });
    await QueueService.encolar("sesion_trabajo", "editar", id, {
      id,
      modo: "libre",
      duracionPlanificadaSeg: null,
      actualizadoEn,
    });
    return Resultado.exito(undefined);
  }
}
