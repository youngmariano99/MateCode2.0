import { loadRunnerConfig, getProjectConfig } from "./config";
import { invocarClaudeCode } from "./claude-code";
import { correrVerificacion, type PasoVerificacion } from "./verificacion";
import { escribirCorralito } from "./corralito";
import { extraerBloqueJson } from "./extraer-json";
import {
  buscarCheckpointsListos,
  buscarCheckpointsParaRetomar,
  actualizarCheckpoint,
  marcarTicketEnRevision,
  obtenerConfigProyecto,
  obtenerActividad,
  obtenerHistoria,
  obtenerProyecto,
  obtenerContextoSprint,
  obtenerIteracionesYBug,
  type CheckpointRow,
} from "./checkpoint";
import { parseHandoffIA } from "../src/domain/entidades/automatizacion-ia.entity";
import { generarPromptActividadTicket } from "../src/domain/prompts/generar-prompt-actividad";
import { db, schema } from "./db";
import { eq } from "drizzle-orm";

let detenido = false;
process.on("SIGINT", () => {
  console.log(
    "\n[runner] Señal de corte recibida. Terminando el ciclo actual y saliendo..."
  );
  detenido = true;
});

async function procesarCheckpoint(
  checkpoint: CheckpointRow,
  config: ReturnType<typeof loadRunnerConfig>
) {
  const proyectoCfg = getProjectConfig(config, checkpoint.proyectoId);
  if (!proyectoCfg) {
    console.error(
      `[runner] Proyecto "${checkpoint.proyectoId}" no está en runner.config.json — se omite este checkpoint.`
    );
    return;
  }

  const esRetoma = checkpoint.estadoCheckpoint === "QA_RETRYING";
  console.log(
    `[runner] ${esRetoma ? "Retomando" : "Iniciando"} checkpoint ${checkpoint.id} (actividad ${checkpoint.actividadId})...`
  );

  if (!esRetoma) {
    await actualizarCheckpoint(checkpoint.id, {
      estadoCheckpoint: "IN_PROGRESS_AI",
      tiempoInicio: new Date(),
      reintentosFallidos: 0,
    });
  }

  const actividad = await obtenerActividad(checkpoint.actividadId);
  if (!actividad) {
    await actualizarCheckpoint(checkpoint.id, {
      estadoCheckpoint: "PAUSED_CHECKPOINT",
      codigoError: "HANDOFF_INVALID_JSON",
      ultimoErrorLogs: `No se encontró la actividad ${checkpoint.actividadId} en la base.`,
    });
    return;
  }

  const [
    historia,
    proyecto,
    configAuto,
    contextoSprint,
    { iteraciones, bugActivo },
  ] = await Promise.all([
    actividad.historiaId
      ? obtenerHistoria(actividad.historiaId)
      : Promise.resolve(undefined),
    obtenerProyecto(checkpoint.proyectoId),
    obtenerConfigProyecto(checkpoint.proyectoId),
    historiaSprintId(actividad, checkpoint.proyectoId),
    obtenerIteracionesYBug(checkpoint.taskExecutionId),
  ]);

  escribirCorralito(
    proyectoCfg.rutaLocalRepo,
    parseJsonArraySeguro(configAuto?.allowedTools),
    parseJsonArraySeguro(configAuto?.deniedPaths)
  );

  const promptBase = generarPromptActividadTicket({
    actividad: {
      id: actividad.id,
      titulo: actividad.titulo,
      rol: actividad.rol ?? undefined,
      componente: actividad.componente ?? undefined,
      ruta: actividad.ruta ?? undefined,
      historiaId: actividad.historiaId ?? undefined,
    },
    proyectoNombre: proyecto?.nombre,
    historiaPadre: historia
      ? { titulo: historia.titulo, prioridad: historia.prioridad }
      : undefined,
    contextoSprintActual: contextoSprint,
    iteraciones,
    bugActivo,
  });

  // Si es un reintento, el prompt base se complementa con el log del error
  // anterior: el agente recibe exactamente lo que falló, sin repetir contexto.
  const prompt =
    checkpoint.reintentosFallidos > 0 &&
    checkpoint.estadoCheckpoint === "QA_RETRYING"
      ? `${promptBase}\n\n<correccion_requerida>\nEl intento anterior falló la verificación automática con este log, corregilo:\n${await ultimoErrorLogsDe(checkpoint.id)}\n</correccion_requerida>`
      : promptBase;

  const resultado = await invocarClaudeCode({
    prompt,
    rutaRepo: proyectoCfg.rutaLocalRepo,
    claudeExecutable: proyectoCfg.claudeExecutable,
    resumeSessionId: checkpoint.claudeSessionId ?? undefined,
  });

  await actualizarCheckpoint(checkpoint.id, {
    claudeSessionId:
      resultado.sessionId ?? checkpoint.claudeSessionId ?? undefined,
    tokensInput: resultado.tokensInput,
    tokensOutput: resultado.tokensOutput,
    costoUsd: resultado.costoUsd,
  });

  if (!resultado.ok) {
    await fallarOReintentar(
      checkpoint,
      "TOKEN_LIMIT_EXCEEDED",
      resultado.errorMensaje || "Fallo desconocido invocando Claude Code.",
      configAuto
    );
    return;
  }

  await actualizarCheckpoint(checkpoint.id, {
    estadoCheckpoint: "QA_VALIDATING",
  });

  const pasos: PasoVerificacion[] = [
    { nombre: "build", comando: configAuto?.buildCmd },
    { nombre: "lint", comando: configAuto?.lintCmd },
    {
      nombre: "testUnit",
      comando: configAuto?.testUnitCmd ?? configAuto?.testCmd,
    },
  ];
  const verificacion = await correrVerificacion(
    proyectoCfg.rutaLocalRepo,
    pasos
  );

  if (!verificacion.ok) {
    await fallarOReintentar(
      checkpoint,
      verificacion.codigoError || "VERIFICACION_INCONCLUSA",
      `Falló "${verificacion.pasoFallido}":\n${verificacion.logs}`,
      configAuto
    );
    return;
  }

  const bloqueJson = extraerBloqueJson(resultado.textoResultado);
  if (!bloqueJson) {
    await fallarOReintentar(
      checkpoint,
      "HANDOFF_INVALID_JSON",
      "El agente no devolvió el bloque JSON de handoff esperado.",
      configAuto
    );
    return;
  }

  let candidato: unknown;
  try {
    const parsedRaw = JSON.parse(bloqueJson) as { handoff?: unknown };
    candidato = parsedRaw.handoff || parsedRaw;
  } catch (err) {
    await fallarOReintentar(
      checkpoint,
      "HANDOFF_INVALID_JSON",
      `JSON malformado: ${err}`,
      configAuto
    );
    return;
  }

  const validacion = parseHandoffIA(JSON.stringify(candidato));
  if (!validacion.ok) {
    await fallarOReintentar(
      checkpoint,
      "HANDOFF_INVALID_JSON",
      validacion.detalle,
      configAuto
    );
    return;
  }

  const handoff = validacion.data;
  const criticas = handoff.acciones_manuales_requeridas.filter(
    (a) => a.nivel === "critica"
  );
  const moderadas = handoff.acciones_manuales_requeridas.filter(
    (a) => a.nivel === "moderada"
  );

  await actualizarCheckpoint(checkpoint.id, {
    estadoCheckpoint:
      criticas.length > 0 ? "BLOQUEADO_ACCION_CRITICA" : "COMPLETED_HANDOFF",
    tiempoFin: new Date(),
    resumenNegocio: handoff.resumen_negocio,
    guiaPruebasManual: handoff.guia_pruebas_manual,
    accionesManualesCriticas: criticas,
    accionesManualesModeradas: moderadas,
  });

  await guardarHandoffEnTaskExecution(checkpoint.taskExecutionId, handoff);

  if (criticas.length === 0) {
    await marcarTicketEnRevision(
      checkpoint.actividadId,
      checkpoint.taskExecutionId
    );
    console.log(
      `[runner] Ticket ${checkpoint.actividadId} listo para revisión humana.`
    );
  } else {
    console.log(
      `[runner] Ticket ${checkpoint.actividadId} bloqueado: requiere acción manual crítica antes de seguir.\n` +
        criticas.map((c) => `  - ${c.descripcion}`).join("\n")
    );
  }
}

async function fallarOReintentar(
  checkpoint: CheckpointRow,
  codigoError: Parameters<typeof actualizarCheckpoint>[1]["codigoError"],
  logs: string,
  configAuto: Awaited<ReturnType<typeof obtenerConfigProyecto>>
) {
  const maxIntentos = configAuto?.maxRetriesLinter ?? 3;
  const siguienteIntento = checkpoint.reintentosFallidos + 1;
  if (siguienteIntento < maxIntentos) {
    await actualizarCheckpoint(checkpoint.id, {
      estadoCheckpoint: "QA_RETRYING",
      reintentosFallidos: siguienteIntento,
      ultimoErrorLogs: logs,
      codigoError,
    });
    console.log(
      `[runner] Checkpoint ${checkpoint.id}: fallo "${codigoError}", reintento ${siguienteIntento}/${maxIntentos}.`
    );
  } else {
    await actualizarCheckpoint(checkpoint.id, {
      estadoCheckpoint: "PAUSED_CHECKPOINT",
      reintentosFallidos: siguienteIntento,
      ultimoErrorLogs: logs,
      codigoError,
    });
    console.log(
      `[runner] Checkpoint ${checkpoint.id}: agotó reintentos (${maxIntentos}). Pausado para revisión manual.`
    );
  }
}

async function ultimoErrorLogsDe(checkpointId: string): Promise<string> {
  const rows = await db
    .select()
    .from(schema.taskExecutionCheckpoints)
    .where(eq(schema.taskExecutionCheckpoints.id, checkpointId));
  return rows[0]?.ultimoErrorLogs || "";
}

async function guardarHandoffEnTaskExecution(
  taskExecutionId: string,
  handoff: unknown
) {
  const rows = await db
    .select()
    .from(schema.taskExecutions)
    .where(eq(schema.taskExecutions.id, taskExecutionId));
  const row = rows[0];
  if (!row) return;
  let meta: Record<string, unknown> = {};
  try {
    meta = row.metadata ? JSON.parse(row.metadata) : {};
  } catch {
    meta = {};
  }
  meta.handoffs = {
    ...((meta.handoffs as Record<string, unknown>) || {}),
    default: { ...(handoff as object), fecha: new Date().toLocaleTimeString() },
  };
  await db
    .update(schema.taskExecutions)
    .set({ metadata: JSON.stringify(meta), actualizadoEn: new Date() })
    .where(eq(schema.taskExecutions.id, taskExecutionId));
}

function parseJsonArraySeguro(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function historiaSprintId(
  actividad: { historiaId: string | null; proyectoId: string },
  proyectoId: string
) {
  if (!actividad.historiaId) return [];
  const rows = await db
    .select()
    .from(schema.historias)
    .where(eq(schema.historias.id, actividad.historiaId));
  const sprintId = rows[0]?.sprintId;
  if (!sprintId) return [];
  return obtenerContextoSprint(proyectoId, sprintId, actividad.historiaId);
}

async function cicloDeTrabajo() {
  const config = loadRunnerConfig();
  const pendientes = [
    ...(await buscarCheckpointsListos()),
    ...(await buscarCheckpointsParaRetomar()),
  ];
  if (pendientes.length === 0) return;

  for (const checkpoint of pendientes) {
    if (detenido) break;
    try {
      await procesarCheckpoint(checkpoint, config);
    } catch (err) {
      console.error(
        `[runner] Error inesperado procesando checkpoint ${checkpoint.id}:`,
        err
      );
      await actualizarCheckpoint(checkpoint.id, {
        estadoCheckpoint: "PAUSED_CHECKPOINT",
        ultimoErrorLogs:
          err instanceof Error ? err.stack || err.message : String(err),
      });
    }
  }
}

async function main() {
  const config = loadRunnerConfig();
  const intervalo = config.pollIntervalMs ?? 15000;
  console.log(
    `[runner] MateCode AI Runner iniciado. Polling cada ${intervalo}ms. Ctrl+C para salir.`
  );

  while (!detenido) {
    await cicloDeTrabajo();
    await new Promise((r) => setTimeout(r, intervalo));
  }
  console.log("[runner] Detenido.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[runner] Error fatal:", err);
  process.exit(1);
});
