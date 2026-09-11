import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../infrastructure/persistencia/drizzle-db";
import * as schema from "../../../../infrastructure/persistencia/schema";
import { eq } from "drizzle-orm";
import { servidorTieneVersionMasNueva } from "../../../../shared/utilidades/resolucion-conflictos";

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
    const isFichaTable = ["ficha_digital", "ficha_fisica"].includes(table);

    const conflictTarget = isProjectConfigTable
      ? tableSchema.proyectoId
      : isFichaTable
        ? tableSchema.potencialClienteId
        : tableSchema.id;

    if (accion === "eliminar") {
      // Borrado lógico universal: si la tabla tiene columnas de auditoría
      // (eliminadoEn / eliminado), nunca se hace DELETE físico sobre el
      // histórico — se marca. Las tablas sin esas columnas (uniones puras
      // como cliente_etiquetas) sí se borran físicamente, no representan
      // historial de negocio.
      if (tableSchema.eliminadoEn) {
        const setValues: Record<string, unknown> = { eliminadoEn: new Date() };
        if (tableSchema.eliminado) setValues.eliminado = true;
        await db
          .update(tableSchema)
          .set(setValues)
          .where(eq(conflictTarget, registroId));
      } else {
        await db.delete(tableSchema).where(eq(conflictTarget, registroId));
      }
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
      "fechaUltimoContacto",
      "fecha",
      "volverFecha",
      "proximoSeguimientoFecha",
      "fechaPublicacion",
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

    // Normalizar payloads complejos (Arrays o JSON a string) — solo para
    // columnas que siguen siendo `text` en Postgres. Las que ya son `jsonb`
    // (miembros, dependencias, etiquetas, esquemaDb, dolorTags,
    // tagsResultado, canales) reciben el objeto/array tal cual, sin
    // stringificar.
    const jsonFields = [
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

    // Resolución de conflictos (last-write-wins por actualizadoEn): si el
    // servidor ya tiene una versión más nueva que la que llega, no la
    // pisamos — evita que un dispositivo que sincroniza tarde sobreescriba
    // una edición más reciente hecha desde otro lado.
    if (tableSchema.actualizadoEn && dbPayload.actualizadoEn) {
      const existente = await db
        .select({ actualizadoEn: tableSchema.actualizadoEn })
        .from(tableSchema)
        .where(eq(conflictTarget, registroId))
        .limit(1);
      if (
        servidorTieneVersionMasNueva(
          existente[0]?.actualizadoEn,
          dbPayload.actualizadoEn
        )
      ) {
        return NextResponse.json({
          success: true,
          conflicto: true,
          message:
            "El servidor ya tenía una versión más reciente de este registro; no se sobreescribió.",
        });
      }
    }

    if (accion === "editar") {
      // Un "editar" manda solo los campos que cambiaron (ej. { id, estado,
      // actualizadoEn }), nunca el registro completo. Con INSERT ... ON
      // CONFLICT DO UPDATE, si la fila todavía no existía del lado del
      // servidor, Postgres igual arma la fila completa para el intento de
      // insert y revienta con NOT NULL en las columnas que no viajaron
      // (ej. titulo, proyectoId) — antes de llegar siquiera a chequear el
      // conflicto. Un editar real nunca debe crear filas: si no hay fila
      // para actualizar (0 filas afectadas), no es un error — puede ser
      // simplemente un registro que después se borró localmente.
      await db
        .update(tableSchema)
        .set(dbPayload)
        .where(eq(conflictTarget, registroId));

      return NextResponse.json({
        success: true,
        message: "Actualización completada con éxito.",
      });
    }

    // "crear" (u otra acción no contemplada): upsert normal, es seguro que
    // reintente sin duplicar si el registro ya existe.
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
