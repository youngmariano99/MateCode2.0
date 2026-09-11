import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../infrastructure/persistencia/drizzle-db";
import * as schema from "../../../../infrastructure/persistencia/schema";
import { inArray } from "drizzle-orm";
import { servidorTieneVersionMasNueva } from "../../../../shared/utilidades/resolucion-conflictos";

// El respaldo completo hace muchas inserciones secuenciales dentro de una
// transacción; el timeout por defecto de una función serverless (10s en
// Hobby) puede no alcanzar con datasets grandes. Vercel limita esto según el
// plan, pero declarar un máximo mayor evita cortar la función antes de tiempo
// en planes que sí lo soportan.
export const maxDuration = 60;

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
  documentos: schema.documentos,
  pagos: schema.pagos,
  cuotas: schema.cuotas,
  facturas: schema.facturas,
  direcciones: schema.direcciones,
  etiquetas: schema.etiquetas,
  cliente_etiquetas: schema.clienteEtiquetas,
  estados_cliente: schema.estadosCliente,
  potencial_cliente: schema.potencialCliente,
  ficha_digital: schema.fichaDigital,
  ficha_fisica: schema.fichaFisica,
  intento_contacto: schema.intentoContacto,
  catalogo_etiquetas: schema.catalogoEtiquetas,
  ciclo_semanal: schema.cicloSemanal,
  idea_contenido: schema.ideaContenido,
  plantilla_guion: schema.plantillaGuion,
  contenido: schema.contenido,
  catalogo_kpi_contenido: schema.catalogoKpiContenido,
  inbox_item: schema.inboxItem,
  tarea_diaria: schema.tareaDiaria,
  tarea_pendiente: schema.tareaPendiente,
  objetivo_cuantificable: schema.objetivoCuantificable,
  habito_definicion: schema.habitoDefinicion,
  habito_registro: schema.habitoRegistro,
  catalogo_ejercicio: schema.catalogoEjercicio,
  plantilla_rutina: schema.plantillaRutina,
  bloque_entrenamiento: schema.bloqueEntrenamiento,
  registro_actividad: schema.registroActividad,
};

const DATE_FIELDS = [
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
  "fechaUltimoContacto",
  "fecha",
  "volverFecha",
  "proximoSeguimientoFecha",
  "fechaPublicacion",
];

const EMPTY_TO_NULL_FIELDS = [
  "clienteId",
  "agenciaId",
  "responsableId",
  "sprintId",
  "epicaId",
  "historiaId",
];

// Solo columnas que siguen siendo `text` en Postgres. Las que ya son `jsonb`
// (miembros, dependencias, etiquetas, esquemaDb, dolorTags, tagsResultado,
// canales) reciben el objeto/array tal cual, sin stringificar.
const JSON_FIELDS = [
  "metadata",
  "allowedTools",
  "deniedPaths",
  "accionesManualesModeradas",
  "accionesManualesCriticas",
  "guiaPruebasManual",
];

function normalizarPayload(
  record: Record<string, unknown>
): Record<string, unknown> {
  const dbPayload = { ...record };

  for (const field of DATE_FIELDS) {
    const val = dbPayload[field];
    if (val !== undefined && val !== null && val !== "") {
      if (typeof val === "number" || typeof val === "string") {
        const parsedDate = new Date(val);
        dbPayload[field] = isNaN(parsedDate.getTime()) ? null : parsedDate;
      }
    }
  }

  for (const field of EMPTY_TO_NULL_FIELDS) {
    if (dbPayload[field] === "") {
      dbPayload[field] = null;
    }
  }

  for (const field of JSON_FIELDS) {
    if (
      dbPayload[field] !== undefined &&
      typeof dbPayload[field] !== "string"
    ) {
      dbPayload[field] = JSON.stringify(dbPayload[field]);
    }
  }

  return dbPayload;
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const tablasOk: string[] = [];
    // Tabla por tabla y transacción por tabla: si una fila de "contenido"
    // falla, no se pierde el respaldo ya hecho de "tareas" en el mismo
    // request — antes todo el bulk vivía en una única transacción y una fila
    // mala tiraba abajo todo lo demás sin decir qué se había guardado.
    const tablasConError: { tabla: string; error: string }[] = [];

    for (const [table, records] of Object.entries(data)) {
      if (!Array.isArray(records) || records.length === 0) continue;

      const tableSchema = tableMapper[table];
      if (!tableSchema) continue;

      const isProjectConfigTable = [
        "proyecto_contexto",
        "proyecto_design_system",
        "proyecto_estado_tecnico",
        "proyecto_config_automatizacion",
      ].includes(table);
      const isFichaTable = ["ficha_digital", "ficha_fisica"].includes(table);

      const conflictTarget = isProjectConfigTable
        ? tableSchema.proyectoId
        : isFichaTable
          ? tableSchema.potencialClienteId
          : tableSchema.id;

      try {
        await db.transaction(async (tx) => {
          const normalizados = (records as Record<string, unknown>[]).map(
            (record) => normalizarPayload(record)
          );

          // Resolución de conflictos (last-write-wins por actualizadoEn): una
          // sola consulta trayendo todos los `actualizadoEn` existentes del
          // lote, en vez de una consulta por registro (N+1) — con lotes
          // grandes esa cantidad de viajes a la base podía tardar más que el
          // límite de la función serverless y el cliente terminaba viendo
          // "no pudimos conectar" (timeout de red, no un error real de la API).
          let existentesMap: Map<unknown, unknown> | null = null;
          if (tableSchema.actualizadoEn) {
            const identificadores = normalizados
              .map((dbPayload) =>
                isProjectConfigTable
                  ? dbPayload.proyectoId
                  : isFichaTable
                    ? dbPayload.potencialClienteId
                    : dbPayload.id
              )
              .filter((v): v is string => typeof v === "string");

            const existentes =
              identificadores.length > 0
                ? await tx
                    .select({
                      id: conflictTarget,
                      actualizadoEn: tableSchema.actualizadoEn,
                    })
                    .from(tableSchema)
                    .where(inArray(conflictTarget, identificadores))
                : [];
            existentesMap = new Map(
              existentes.map((e) => [e.id, e.actualizadoEn])
            );
          }

          for (const dbPayload of normalizados) {
            if (
              tableSchema.actualizadoEn &&
              dbPayload.actualizadoEn &&
              existentesMap
            ) {
              const identificador = isProjectConfigTable
                ? dbPayload.proyectoId
                : isFichaTable
                  ? dbPayload.potencialClienteId
                  : dbPayload.id;
              if (
                servidorTieneVersionMasNueva(
                  existentesMap.get(identificador),
                  dbPayload.actualizadoEn
                )
              ) {
                continue;
              }
            }

            await tx.insert(tableSchema).values(dbPayload).onConflictDoUpdate({
              target: conflictTarget,
              set: dbPayload,
            });
          }
        });
        tablasOk.push(table);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error en respaldo en lote de la tabla ${table}:`, err);
        tablasConError.push({ tabla: table, error: message });
      }
    }

    return NextResponse.json({
      success: tablasConError.length === 0,
      message:
        tablasConError.length === 0
          ? "Respaldo en lote completado."
          : `Respaldo parcial: ${tablasOk.length} tabla(s) ok, ${tablasConError.length} con error.`,
      tablasOk,
      tablasConError,
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
