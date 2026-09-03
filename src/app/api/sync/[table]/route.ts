import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../infrastructure/persistencia/drizzle-db";
import * as schema from "../../../../infrastructure/persistencia/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 30;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tableMapper: Record<string, any> = {
  proyectos: schema.proyectos,
  epicas: schema.epicas,
  sprints: schema.sprints,
  historias: schema.historias,
  tareas: schema.tareas,
  task_executions: schema.taskExecutions,
  proyecto_contexto: schema.proyectoContexto,
  proyecto_design_system: schema.proyectoDesignSystem,
  proyecto_estado_tecnico: schema.proyectoEstadoTecnico,
  proyecto_config_automatizacion: schema.proyectoConfigAutomatizacion,
  task_execution_checkpoints: schema.taskExecutionCheckpoints,
  clientes: schema.clientes,
  contactos: schema.contactos,
  contratos: schema.contratos,
  pagos: schema.pagos,
  cuotas: schema.cuotas,
  facturas: schema.facturas,
  direcciones: schema.direcciones,
  etiquetas: schema.etiquetas,
  cliente_etiquetas: schema.clienteEtiquetas,
  estados_cliente: schema.estadosCliente,
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    const { accion, registroId, payload } = await req.json();

    const tableSchema = tableMapper[table];
    if (!tableSchema) {
      return NextResponse.json(
        { error: `Tabla '${table}' no soportada o inexistente.` },
        { status: 400 }
      );
    }

    const isProjectConfigTable = [
      "proyecto_contexto",
      "proyecto_design_system",
      "proyecto_estado_tecnico",
      "proyecto_config_automatizacion",
    ].includes(table);

    const conflictTarget = isProjectConfigTable
      ? tableSchema.proyectoId
      : tableSchema.id;

    if (accion === "eliminar") {
      await db.delete(tableSchema).where(eq(conflictTarget, registroId));
      return NextResponse.json({
        success: true,
        message: "Registro eliminado.",
      });
    }

    // Normalizar payload (Date objects)
    const dbPayload = { ...payload };
    const dateFields = [
      "creadoEn",
      "actualizadoEn",
      "eliminadoEn",
      "fechaInicio",
      "fechaFin",
      "finalizadoEn",
      "fechaEntrega",
      "fechaVencimiento",
      "fechaPago",
      "fechaFirma",
      "fechaSeguimiento",
      "fechaVisita",
      "expiracion",
      "tiempoInicio",
      "tiempoFin",
    ];
    for (const field of dateFields) {
      const val = dbPayload[field];
      if (val !== undefined && val !== null && val !== "") {
        if (typeof val === "number" || typeof val === "string") {
          const parsedDate = new Date(val);
          if (!isNaN(parsedDate.getTime())) {
            dbPayload[field] = parsedDate;
          } else {
            dbPayload[field] = null;
          }
        }
      }
    }
    // Convertir cadenas vacías a null para campos de tipo UUID o referencias
    const emptyToNullFields = [
      "clienteId",
      "agenciaId",
      "responsableId",
      "sprintId",
      "epicaId",
      "historiaId",
    ];
    for (const field of emptyToNullFields) {
      if (dbPayload[field] === "") {
        dbPayload[field] = null;
      }
    }

    // Normalizar payloads complejos (Arrays o JSON a string)
    const jsonFields = [
      "miembros",
      "dependencias",
      "etiquetas",
      "esquemaDb",
      "metadata",
      "allowedTools",
      "deniedPaths",
      "accionesManualesModeradas",
      "accionesManualesCriticas",
      "guiaPruebasManual",
    ];
    for (const field of jsonFields) {
      if (
        dbPayload[field] !== undefined &&
        typeof dbPayload[field] !== "string"
      ) {
        dbPayload[field] = JSON.stringify(dbPayload[field]);
      }
    }

    // Realizar upsert
    await db.insert(tableSchema).values(dbPayload).onConflictDoUpdate({
      target: conflictTarget,
      set: dbPayload,
    });

    return NextResponse.json({
      success: true,
      message: "Upsert completado con éxito.",
    });
  } catch (error: unknown) {
    console.error("Error en sincronización individual:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message || "Error interno del servidor." },
      { status: 500 }
    );
  }
}
