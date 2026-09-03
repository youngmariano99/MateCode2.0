import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../infrastructure/persistencia/drizzle-db";
import * as schema from "../../../../infrastructure/persistencia/schema";
import { eq } from "drizzle-orm";

/**
 * Lectura ("pull") del estado que el runner de automatización IA escribe
 * directo en Supabase. El resto de la sincronización del sistema es solo
 * "push" (local -> remoto vía cola_eventos); este endpoint es la única vía
 * para que el navegador entere de cambios que se originaron fuera de él
 * (el runner corre como proceso Node aparte, no dentro del navegador).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ proyectoId: string }> }
) {
  try {
    const { proyectoId } = await params;

    const [checkpoints, tareas, taskExecutions] = await Promise.all([
      db
        .select()
        .from(schema.taskExecutionCheckpoints)
        .where(eq(schema.taskExecutionCheckpoints.proyectoId, proyectoId)),
      db
        .select()
        .from(schema.tareas)
        .where(eq(schema.tareas.proyectoId, proyectoId)),
      db
        .select()
        .from(schema.taskExecutions)
        .where(eq(schema.taskExecutions.proyectoId, proyectoId)),
    ]);

    return NextResponse.json({ checkpoints, tareas, taskExecutions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message || "Error interno del servidor." },
      { status: 500 }
    );
  }
}
