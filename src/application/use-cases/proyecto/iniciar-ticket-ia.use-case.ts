import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import type {
  AccionManualRequerida,
  TaskExecutionCheckpoint,
} from "../../../domain/entidades/automatizacion-ia.entity";

export interface IniciarTicketIAInput {
  proyectoId: string;
  actividad: { id: string; titulo: string };
  motorIA: "claude" | "antigravity";
}

/**
 * Encola un ticket para que el runner de automatización IA lo procese: crea
 * (si no existe) su task_execution, pasa la actividad a "in_progress" y crea
 * el checkpoint en IDLE — el runner (proceso Node aparte) lo va a levantar
 * en su próximo ciclo de polling.
 *
 * Es el mismo flujo que dispara el botón individual "Comenzar ticket con IA"
 * ([ejecucion-ia-control.tsx]), extraído acá para poder encolar de a uno o
 * en lote (ej. "Sprint Automático") sin duplicar la lógica.
 */
export async function iniciarTicketConIA({
  proyectoId,
  actividad,
  motorIA,
}: IniciarTicketIAInput): Promise<void> {
  const checkpointId = `chk_${actividad.id}`;
  const taskExecutionId = `execution_act_${actividad.id}`;
  const actualizadoEn = Date.now();

  const existingExec = await db.task_executions.get(taskExecutionId);
  if (!existingExec) {
    const nuevaExecucion = {
      id: taskExecutionId,
      proyectoId,
      actividadId: actividad.id,
      titulo: actividad.titulo,
      estado: "IN_PROGRESS",
      fechaInicio: Date.now(),
      metadata: { handoffs: {}, iterations: [], bugs: [] },
      actualizadoEn,
    };
    await db.task_executions.put(nuevaExecucion);
    await QueueService.encolar(
      "task_executions",
      "crear",
      taskExecutionId,
      nuevaExecucion
    );
  }

  await db.tareas.update(actividad.id, {
    estado: "in_progress",
    actualizadoEn,
  });
  await QueueService.encolar("tareas", "editar", actividad.id, {
    id: actividad.id,
    estado: "in_progress",
    actualizadoEn,
  });

  const nuevoCheckpoint: TaskExecutionCheckpoint = {
    id: checkpointId,
    taskExecutionId,
    actividadId: actividad.id,
    proyectoId,
    estadoCheckpoint: "IDLE",
    motorIA,
    reintentosFallidos: 0,
    accionesManualesModeradas: [] as AccionManualRequerida[],
    accionesManualesCriticas: [] as AccionManualRequerida[],
    actualizadoEn: Date.now(),
  };
  await db.task_execution_checkpoints.put(nuevoCheckpoint);
  await QueueService.encolar(
    "task_execution_checkpoints",
    "crear",
    checkpointId,
    { ...nuevoCheckpoint }
  );
}
