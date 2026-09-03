import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import type {
  AccionManualRequerida,
  CodigoError,
  EstadoCheckpoint,
  GuiaPruebasManual,
} from "../src/domain/entidades/automatizacion-ia.entity";

export interface CheckpointRow {
  id: string;
  taskExecutionId: string;
  actividadId: string;
  proyectoId: string;
  estadoCheckpoint: string;
  reintentosFallidos: number;
  claudeSessionId: string | null;
}

/** Busca checkpoints en estado IDLE: tickets marcados por la UI para correr con IA. */
export async function buscarCheckpointsListos(): Promise<CheckpointRow[]> {
  const rows = await db
    .select()
    .from(schema.taskExecutionCheckpoints)
    .where(eq(schema.taskExecutionCheckpoints.estadoCheckpoint, "IDLE"));
  return rows as unknown as CheckpointRow[];
}

/** También retoma checkpoints que quedaron a mitad de camino (corte de créditos/proceso). */
export async function buscarCheckpointsParaRetomar(): Promise<CheckpointRow[]> {
  const rows = await db
    .select()
    .from(schema.taskExecutionCheckpoints)
    .where(eq(schema.taskExecutionCheckpoints.estadoCheckpoint, "QA_RETRYING"));
  return rows as unknown as CheckpointRow[];
}

export async function actualizarCheckpoint(
  id: string,
  cambios: Partial<{
    estadoCheckpoint: EstadoCheckpoint;
    ultimoErrorLogs: string;
    ultimoPromptRefinamiento: string;
    reintentosFallidos: number;
    commitShaBase: string;
    commitShaError: string;
    tokensInput: number;
    tokensOutput: number;
    costoUsd: number;
    tiempoInicio: Date;
    tiempoFin: Date;
    claudeSessionId: string;
    codigoError: CodigoError;
    accionesManualesModeradas: AccionManualRequerida[];
    accionesManualesCriticas: AccionManualRequerida[];
    resumenNegocio: string;
    guiaPruebasManual: GuiaPruebasManual;
  }>
): Promise<void> {
  const payload: Record<string, unknown> = {
    ...cambios,
    actualizadoEn: new Date(),
  };
  if (cambios.accionesManualesModeradas) {
    payload.accionesManualesModeradas = JSON.stringify(
      cambios.accionesManualesModeradas
    );
  }
  if (cambios.accionesManualesCriticas) {
    payload.accionesManualesCriticas = JSON.stringify(
      cambios.accionesManualesCriticas
    );
  }
  if (cambios.guiaPruebasManual) {
    payload.guiaPruebasManual = JSON.stringify(cambios.guiaPruebasManual);
  }
  await db
    .update(schema.taskExecutionCheckpoints)
    .set(payload)
    .where(eq(schema.taskExecutionCheckpoints.id, id));
}

/** Marca el ticket como listo para revisión humana (nunca lo cierra solo). */
export async function marcarTicketEnRevision(
  actividadId: string,
  taskExecutionId: string
): Promise<void> {
  await db
    .update(schema.tareas)
    .set({ estado: "in_revision", actualizadoEn: new Date() })
    .where(eq(schema.tareas.id, actividadId));
  await db
    .update(schema.taskExecutions)
    .set({ estado: "IN_REVISION", actualizadoEn: new Date() })
    .where(eq(schema.taskExecutions.id, taskExecutionId));
}

export async function obtenerConfigProyecto(proyectoId: string) {
  const rows = await db
    .select()
    .from(schema.proyectoConfigAutomatizacion)
    .where(eq(schema.proyectoConfigAutomatizacion.proyectoId, proyectoId));
  return rows[0];
}

export async function obtenerActividad(actividadId: string) {
  const rows = await db
    .select()
    .from(schema.tareas)
    .where(eq(schema.tareas.id, actividadId));
  return rows[0];
}

export async function obtenerHistoria(historiaId: string) {
  const rows = await db
    .select()
    .from(schema.historias)
    .where(eq(schema.historias.id, historiaId));
  return rows[0];
}

/**
 * Lee las iteraciones ("Iterar con IA") y el bug activo que el humano dejó
 * cargados en task_executions.metadata, para que el runner los incluya en el
 * próximo prompt — es el mecanismo por el cual un pedido de "REITERAR con IA"
 * (con feedback en texto libre) realmente llega al agente.
 */
export async function obtenerIteracionesYBug(taskExecutionId: string) {
  const rows = await db
    .select()
    .from(schema.taskExecutions)
    .where(eq(schema.taskExecutions.id, taskExecutionId));
  const metaRaw = rows[0]?.metadata;
  if (!metaRaw) return { iteraciones: [], bugActivo: undefined };
  try {
    const meta = JSON.parse(metaRaw);
    const iteraciones = (meta.iterations?.default || []) as {
      fecha: string;
      feedback: string;
    }[];
    const bugs = (meta.bugs?.default || []) as {
      logs: string;
      comportamientoEsperado: string;
      comportamientoReal: string;
      resuelto?: boolean;
    }[];
    const bugActivo = bugs.find((b) => !b.resuelto);
    return { iteraciones, bugActivo };
  } catch {
    return { iteraciones: [], bugActivo: undefined };
  }
}

export async function obtenerProyecto(proyectoId: string) {
  const rows = await db
    .select()
    .from(schema.proyectos)
    .where(eq(schema.proyectos.id, proyectoId));
  return rows[0];
}

/**
 * Handoffs de tickets ya completados en el mismo sprint que la actividad dada,
 * para inyectar contexto acumulado sin gastar tokens en prosa completa.
 */
export async function obtenerContextoSprint(
  proyectoId: string,
  sprintId: string,
  excluirActividadId: string
) {
  const historiasSprint = await db
    .select()
    .from(schema.historias)
    .where(
      and(
        eq(schema.historias.proyectoId, proyectoId),
        eq(schema.historias.sprintId, sprintId)
      )
    );
  const historiaIds = historiasSprint.map((h) => h.id);
  if (historiaIds.length === 0) return [];

  const tareasSprint = await db
    .select()
    .from(schema.tareas)
    .where(eq(schema.tareas.proyectoId, proyectoId));
  const relevantes = tareasSprint.filter(
    (t) =>
      t.historiaId &&
      historiaIds.includes(t.historiaId) &&
      t.id !== excluirActividadId
  );

  const contexto: { ticket: string; archivos: string[]; firmas: string[] }[] =
    [];
  for (const t of relevantes) {
    const exec = await db
      .select()
      .from(schema.taskExecutions)
      .where(eq(schema.taskExecutions.id, `execution_act_${t.id}`));
    const metaRaw = exec[0]?.metadata;
    if (!metaRaw) continue;
    try {
      const meta = JSON.parse(metaRaw) as {
        handoffs?: Record<
          string,
          {
            archivos_creados_o_modificados?: string[];
            firmas_o_contratos_exportados?: string[];
          }
        >;
      };
      const handoffs = meta.handoffs || {};
      for (const h of Object.values(handoffs)) {
        if (h?.archivos_creados_o_modificados?.length) {
          contexto.push({
            ticket: t.titulo,
            archivos: h.archivos_creados_o_modificados,
            firmas: h.firmas_o_contratos_exportados || [],
          });
        }
      }
    } catch {
      // metadata no parseable: se ignora ese ticket para el contexto acumulado.
    }
  }
  return contexto;
}
