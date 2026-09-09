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
        pasosLog: parseJsonSafe((cp as Record<string, unknown>).pasosLog) || [],
      } as never);
    }

    for (const t of data.tareas as {
      id: string;
      proyectoId?: string;
      titulo?: string;
      estado: string;
      actualizadoEn: string;
    }[]) {
      const existing = await db.tareas.get(t.id);
      const remoteTs = toEpoch(t.actualizadoEn) ?? 0;
      const localTs = (existing?.actualizadoEn as number) || 0;
      if (existing && remoteTs < localTs) continue;

      if (existing) {
        await db.tareas.update(t.id, {
          estado: t.estado,
          actualizadoEn: remoteTs,
        });
      } else {
        // Sin fila local: sin esto, una tarea que el runner tocó pero que
        // este navegador nunca vio (caché limpiada, otro dispositivo/perfil)
        // se ignoraba en silencio — ver el mismo caso más abajo en
        // taskExecutions, que es el que de verdad se notaba (handoffs
        // "perdidos" que en realidad sí estaban bien guardados en Supabase).
        await db.tareas.put({
          id: t.id,
          proyectoId: t.proyectoId || "",
          titulo: t.titulo || "",
          estado: t.estado,
          actualizadoEn: remoteTs || Date.now(),
        } as never);
      }
    }

    for (const te of data.taskExecutions as {
      id: string;
      proyectoId?: string;
      titulo?: string;
      estado: string;
      metadata: string | null;
      fechaInicio?: string;
      actualizadoEn: string;
    }[]) {
      const existing = await db.task_executions.get(te.id);
      const remoteTs = toEpoch(te.actualizadoEn) ?? 0;
      const localTs = (existing?.actualizadoEn as number) || 0;
      if (existing && remoteTs < localTs) continue;

      const metadataRemoto = parseJsonSafe(te.metadata);
      if (existing) {
        await db.task_executions.update(te.id, {
          estado: te.estado,
          ...(metadataRemoto ? { metadata: metadataRemoto } : {}),
          actualizadoEn: remoteTs,
        });
      } else {
        // Mismo caso que arriba, pero acá es el que de verdad importa: el
        // handoff (resumen técnico, guía de pruebas) vive en metadata. Antes,
        // si esta fila no existía ya en el navegador, el pull no hacía nada
        // — el handoff quedaba perfectamente guardado en Supabase pero
        // nunca bajaba, y "Descargar Handoffs" del sprint salía vacío sin
        // ningún error visible.
        await db.task_executions.put({
          id: te.id,
          proyectoId: te.proyectoId || "",
          titulo: te.titulo || "",
          estado: te.estado,
          fechaInicio: toEpoch(te.fechaInicio) || Date.now(),
          metadata: metadataRemoto || {
            handoffs: {},
            iterations: [],
            bugs: [],
          },
          actualizadoEn: remoteTs || Date.now(),
        } as never);
      }
    }
  },
};
