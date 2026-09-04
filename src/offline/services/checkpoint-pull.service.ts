import { db } from "../dexie/db";
import { HttpClient } from "../../presentation/services/http-client";

interface PullResponse {
  checkpoints: Record<string, unknown>[];
  tareas: Record<string, unknown>[];
  taskExecutions: Record<string, unknown>[];
}

function toEpoch(val: unknown): number | undefined {
  if (val === null || val === undefined) return undefined;
  const d = new Date(val as string | number);
  return isNaN(d.getTime()) ? undefined : d.getTime();
}

function parseJsonSafe(val: unknown): unknown {
  if (val === null || val === undefined) return undefined;
  if (typeof val !== "string") return val;
  try {
    return JSON.parse(val);
  } catch {
    return undefined;
  }
}

/**
 * "Pull" del estado que el runner de automatización IA escribe directo en
 * Supabase (task_execution_checkpoints, y los reflejos que deja en tareas y
 * task_executions). El resto del sistema es offline-first solo-push; esto es
 * la excepción necesaria porque el runner no es el navegador — corre aparte.
 */
export const CheckpointPullService = {
  sincronizarDesdeRemoto: async (proyectoId: string): Promise<void> => {
    const data = await HttpClient.get<PullResponse>(
      `/checkpoints/${proyectoId}`
    );

    for (const cp of data.checkpoints as {
      id: string;
      actualizadoEn: string;
    }[]) {
      // Sin este guard, un poll que cae justo después de una acción local
      // (ej. click en "Verificado") pisaba el estado recién puesto con el
      // que todavía estaba en Supabase un instante antes de que el push
      // terminara de aplicarse — la UI "volvía atrás" un momento después.
      const existing = await db.task_execution_checkpoints.get(cp.id);
      const remoteTs = toEpoch(cp.actualizadoEn) ?? 0;
      const localTs = (existing?.actualizadoEn as number) || 0;
      if (existing && remoteTs < localTs) continue;

      await db.task_execution_checkpoints.put({
        ...cp,
        tiempoInicio: toEpoch((cp as Record<string, unknown>).tiempoInicio),
        tiempoFin: toEpoch((cp as Record<string, unknown>).tiempoFin),
        actualizadoEn: remoteTs || Date.now(),
        accionesManualesModeradas:
          parseJsonSafe(
            (cp as Record<string, unknown>).accionesManualesModeradas
          ) || [],
        accionesManualesCriticas:
          parseJsonSafe(
            (cp as Record<string, unknown>).accionesManualesCriticas
          ) || [],
        guiaPruebasManual: parseJsonSafe(
          (cp as Record<string, unknown>).guiaPruebasManual
        ),
        desviosDelPlan:
          parseJsonSafe((cp as Record<string, unknown>).desviosDelPlan) || [],
      } as never);
    }

    for (const t of data.tareas as {
      id: string;
      estado: string;
      actualizadoEn: string;
    }[]) {
      const existing = await db.tareas.get(t.id);
      const remoteTs = toEpoch(t.actualizadoEn) ?? 0;
      const localTs = (existing?.actualizadoEn as number) || 0;
      if (existing && remoteTs >= localTs) {
        await db.tareas.update(t.id, {
          estado: t.estado,
          actualizadoEn: remoteTs,
        });
      }
    }

    for (const te of data.taskExecutions as {
      id: string;
      estado: string;
      metadata: string | null;
      actualizadoEn: string;
    }[]) {
      const existing = await db.task_executions.get(te.id);
      const remoteTs = toEpoch(te.actualizadoEn) ?? 0;
      const localTs = (existing?.actualizadoEn as number) || 0;
      if (existing && remoteTs >= localTs) {
        const metadataRemoto = parseJsonSafe(te.metadata);
        await db.task_executions.update(te.id, {
          estado: te.estado,
          ...(metadataRemoto ? { metadata: metadataRemoto } : {}),
          actualizadoEn: remoteTs,
        });
      }
    }
  },
};
