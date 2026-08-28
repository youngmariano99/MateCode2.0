import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../infrastructure/persistencia/drizzle-db";
import * as schema from "../../../../infrastructure/persistencia/schema";

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

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    await db.transaction(async (tx) => {
      for (const [table, records] of Object.entries(data)) {
        if (!Array.isArray(records) || records.length === 0) continue;

        const tableSchema = tableMapper[table];
        if (!tableSchema) continue;

        const isProjectConfigTable = [
          "proyecto_contexto",
          "proyecto_design_system",
          "proyecto_estado_tecnico",
        ].includes(table);

        const conflictTarget = isProjectConfigTable
          ? tableSchema.proyectoId
          : tableSchema.id;

        for (const record of records) {
          const dbPayload = { ...record };

          // Normalizar Dates
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

          // Normalizar JSON fields
          const jsonFields = [
            "miembros",
            "dependencias",
            "etiquetas",
            "esquemaDb",
            "metadata",
          ];
          for (const field of jsonFields) {
            if (
              dbPayload[field] !== undefined &&
              typeof dbPayload[field] !== "string"
            ) {
              dbPayload[field] = JSON.stringify(dbPayload[field]);
            }
          }

          // Upsert individual para resiliencia
          await tx.insert(tableSchema).values(dbPayload).onConflictDoUpdate({
            target: conflictTarget,
            set: dbPayload,
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Respaldo en lote completado.",
    });
  } catch (error: unknown) {
    console.error("Error en sincronización en lote (bulk):", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message || "Error interno del servidor." },
      { status: 500 }
    );
  }
}
