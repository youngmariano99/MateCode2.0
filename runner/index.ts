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

// Pedido explícito de handoff en un segundo turno, cuando el turno de
// desarrollo no lo incluyó al final de su propia respuesta (ver punto 3 del
// roadmap: economía de tokens — este prompt es corto a propósito, solo pide
// lo que falta, no repite contexto que la sesión ya tiene).
const PROMPT_SOLO_HANDOFF = `Ya terminaste el desarrollo de este ticket en tu respuesta anterior. Ahora respondé ÚNICAMENTE con el bloque JSON de handoff, sin código, sin explicaciones adicionales, empezando con \`\`\`json y terminando con \`\`\`:

\`\`\`json
{
  "handoff": {
    "archivos_creados_o_modificados": ["lista de archivos que realmente creaste o modificaste"],
    "firmas_o_contratos_exportados": ["lista de firmas, endpoints o esquemas que realmente exportaste"],
    "resumen_tecnico": "breve descripción técnica de las decisiones tomadas, para otro desarrollador",
    "resumen_negocio": "explicación en 3-5 oraciones, SIN jerga técnica, de qué problema resolvió este ticket y qué puede hacer ahora el usuario final que antes no podía",
    "guia_pruebas_manual": {
      "pasos": ["paso 1 para probar esto manualmente", "paso 2", "..."],
      "datosPrueba": "credenciales o datos de prueba a usar, si aplica",
      "resultadoEsperado": "qué debería observar quien prueba si todo funciona bien"
    },
    "acciones_manuales_requeridas": [
      { "nivel": "moderada", "descripcion": "..." }
    ]
  }
}
\`\`\`

Si alguna sección no aplica, igual incluí la clave con un valor vacío ([] o ""), no la omitas.`;

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

  const esHuerfano =
    checkpoint.estadoCheckpoint === "IN_PROGRESS_AI" ||
    checkpoint.estadoCheckpoint === "QA_VALIDATING";
  const esRetoma = checkpoint.estadoCheckpoint === "QA_RETRYING" || esHuerfano;
  console.log(
    `[runner] ${esRetoma ? "Retomando" : "Iniciando"} checkpoint ${checkpoint.id} (actividad ${checkpoint.actividadId})${esHuerfano ? " — estaba huérfano, un runner anterior lo dejó a mitad de camino" : ""}...`
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

  // Acumuladores de métricas: si hace falta un segundo turno para pedir el
  // handoff, sus tokens/costo se suman acá antes de persistir al final.
  let tokensInputTotal = resultado.tokensInput ?? 0;
  let tokensOutputTotal = resultado.tokensOutput ?? 0;
  let costoUsdTotal = resultado.costoUsd ?? 0;

  await actualizarCheckpoint(checkpoint.id, {
    claudeSessionId:
      resultado.sessionId ?? checkpoint.claudeSessionId ?? undefined,
    tokensInput: tokensInputTotal,
    tokensOutput: tokensOutputTotal,
    costoUsd: costoUsdTotal,
  });

  if (!resultado.ok) {
    await fallarOReintentar(
      checkpoint,
      "CLAUDE_CODE_INVOCATION_FAILED",
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

  let bloqueJson = extraerBloqueJson(resultado.textoResultado);
  if (!bloqueJson) {
    // El agente terminó su turno de desarrollo con un resumen en prosa, sin
    // el bloque JSON pedido al final (compite con toda la tarea de código en
    // el mismo turno — poco confiable). Se lo volvemos a pedir en un segundo
    // turno corto, dedicado únicamente al handoff, sobre la misma sesión.
    console.log(
      `[runner] Checkpoint ${checkpoint.id}: el turno de desarrollo no trajo el JSON de handoff, pidiéndolo en un segundo turno...`
    );
    const resultadoHandoff = await invocarClaudeCode({
      prompt: PROMPT_SOLO_HANDOFF,
      rutaRepo: proyectoCfg.rutaLocalRepo,
      claudeExecutable: proyectoCfg.claudeExecutable,
      resumeSessionId:
        resultado.sessionId ?? checkpoint.claudeSessionId ?? undefined,
      timeoutMs: 5 * 60 * 1000,
    });
    tokensInputTotal += resultadoHandoff.tokensInput ?? 0;
    tokensOutputTotal += resultadoHandoff.tokensOutput ?? 0;
    costoUsdTotal += resultadoHandoff.costoUsd ?? 0;
    await actualizarCheckpoint(checkpoint.id, {
      claudeSessionId:
        resultadoHandoff.sessionId ?? resultado.sessionId ?? undefined,
      tokensInput: tokensInputTotal,
      tokensOutput: tokensOutputTotal,
      costoUsd: costoUsdTotal,
    });
    if (!resultadoHandoff.ok) {
      await fallarOReintentar(
        checkpoint,
        "HANDOFF_INVALID_JSON",
        `El agente no devolvió el JSON de handoff ni en el turno de desarrollo ni en el pedido explícito: ${resultadoHandoff.errorMensaje}`,
        configAuto
      );
      return;
    }
    bloqueJson = extraerBloqueJson(resultadoHandoff.textoResultado);
    if (!bloqueJson) {
      await fallarOReintentar(
        checkpoint,
        "HANDOFF_INVALID_JSON",
        `El agente tampoco devolvió JSON en el pedido explícito de handoff. Respuesta: ${resultadoHandoff.textoResultado.slice(0, 500)}`,
        configAuto
      );
      return;
    }
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
    const bloqueRecortado =
      bloqueJson.length > 800 ? bloqueJson.slice(0, 800) + "…" : bloqueJson;
    await fallarOReintentar(
      checkpoint,
      "HANDOFF_INVALID_JSON",
      `${validacion.detalle}\n\nJSON recibido:\n${bloqueRecortado}`,
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
