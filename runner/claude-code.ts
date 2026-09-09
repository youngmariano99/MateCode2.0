import { spawn } from "node:child_process";

export interface InvocacionClaudeCodeResult {
  ok: boolean;
  /** Texto final devuelto por el agente (incluye el bloque JSON de handoff). */
  textoResultado: string;
  sessionId?: string;
  tokensInput?: number;
  tokensOutput?: number;
  costoUsd?: number;
  errorMensaje?: string;
}

export interface InvocarClaudeCodeOptions {
  prompt: string;
  rutaRepo: string;
  claudeExecutable?: string;
  /** Para retomar una sesión previa sin reconstruir contexto (ver Fase 0, punto 7). */
  resumeSessionId?: string;
  timeoutMs?: number;
  /**
   * Modelo a usar (id o alias que acepte la CLI, ej. "sonnet", "haiku",
   * "claude-haiku-4-5-20251001"). Sin especificar, la CLI usa su propio
   * default (Fase 4.2: estandarización de modelos por rol de ticket) — debe
   * mantenerse igual en todos los --resume de una misma sesión.
   */
  modelo?: string;
  /**
   * Se llama con una descripción corta cada vez que el agente arranca una
   * herramienta (leer/editar un archivo, correr un comando...) — para dar
   * visibilidad en vivo de en qué parte del proceso va. No debe asumirse
   * que se llama con moderación: quien lo use debe acotar cuánto guarda y
   * con qué frecuencia escribe (ver agregarPasoLog en el dominio).
   */
  onPaso?: (texto: string) => void;
}

/**
 * Invoca Claude Code en modo headless sobre el repo del proyecto destino.
 *
 * Asume el contrato de salida `--output-format json` de la CLI de Claude
 * Code (un único objeto JSON con, entre otros, `result`, `session_id`,
 * `total_cost_usd` y `usage.{input_tokens,output_tokens}`). Si una versión
 * distinta de la CLI cambia esas claves, ajustar el parseo de abajo — se
 * dejaron accesos defensivos para no romper todo el runner por un campo
 * renombrado.
 */
/** Arma una línea corta y legible a partir de un bloque tool_use del stream. */
function resumirToolUse(bloque: {
  name?: string;
  input?: Record<string, unknown>;
}): string {
  const nombre = bloque.name || "herramienta";
  const input = bloque.input || {};
  switch (nombre) {
    case "Read":
      return `Leyendo ${input.file_path || ""}`;
    case "Write":
      return `Escribiendo ${input.file_path || ""}`;
    case "Edit":
      return `Editando ${input.file_path || ""}`;
    case "Bash":
      return `Ejecutando: ${String(input.command || "").slice(0, 100)}`;
    case "Glob":
    case "Grep":
      return `Buscando: ${input.pattern || ""}`;
    case "TodoWrite":
      return "Actualizando el plan de tareas";
    default:
      return `Usando herramienta ${nombre}`;
  }
}

export function invocarClaudeCode({
  prompt,
  rutaRepo,
  claudeExecutable = "claude",
  resumeSessionId,
  timeoutMs = 30 * 60 * 1000, // 30 min: dejar tiempo real para un ticket completo
  modelo,
  onPaso,
}: InvocarClaudeCodeOptions): Promise<InvocacionClaudeCodeResult> {
  // El prompt va por stdin, no como argumento de línea de comandos: en
  // Windows, CreateProcess tiene un límite de ~32K caracteres para el
  // comando completo, y un prompt real (checklist + criterios) puede
  // acercarse o superarlo — cuando eso pasa, el spawn falla y Node lo
  // reporta como un confuso "ENOENT" en vez de un error de longitud. Por
  // stdin no hay ese límite.
  // Sin modo de permisos explícito, Claude Code headless deniega Write/Edit
  // por defecto (no hay TTY para aprobar interactivamente) — el agente
  // termina "simulando" el trabajo sin aplicarlo. acceptEdits habilita las
  // ediciones de archivo automáticamente; Bash sigue regido por las reglas
  // allow/deny del corralito (escribirCorralito), no queda todo abierto.
  // stream-json (en vez de json a secas): la CLI emite un objeto NDJSON por
  // cada paso (mensajes del agente, uso de herramientas) a medida que ocurre,
  // en lugar de un único bloque al terminar los 30 min. No cambia qué hace el
  // agente ni gasta tokens de más — es la misma corrida, solo que ahora se
  // puede ver en vivo. --verbose es requerido por la CLI junto con
  // --output-format stream-json en modo -p.
  const args = [
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "--permission-mode",
    "acceptEdits",
  ];
  if (resumeSessionId) {
    args.push("--resume", resumeSessionId);
  }
  if (modelo) {
    args.push("--model", modelo);
  }

  return new Promise((resolve) => {
    const child = spawn(claudeExecutable, args, {
      cwd: rutaRepo,
      // En Windows, "claude" instalado vía npm es un shim .cmd/.ps1 — spawn
      // con shell:false no lo resuelve y tira ENOENT aunque el comando exista
      // (gotcha conocido de Node en Windows). Como el prompt va por stdin y
      // no por argv, habilitar el shell acá no reintroduce el riesgo de
      // escape que sí tendría pasar el prompt como argumento.
      shell: process.platform === "win32",
    });

    let stdoutCrudo = "";
    let stderr = "";
    let lineaPendiente = "";
    let resultadoFinal: Record<string, unknown> | undefined;
    let textoResultadoAcumulado = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdin.on("error", () => {
      // Si el proceso ya murió (ej. binario no encontrado), escribir a su
      // stdin tira EPIPE — lo ignoramos, el error real ya lo capta "error".
    });
    child.stdin.write(prompt, "utf-8");
    child.stdin.end();

    child.stdout.on("data", (chunk) => {
      const texto = chunk.toString();
      stdoutCrudo += texto;
      lineaPendiente += texto;
      const lineas = lineaPendiente.split("\n");
      lineaPendiente = lineas.pop() || "";
      for (const linea of lineas) {
        if (!linea.trim()) continue;
        let evento: Record<string, unknown>;
        try {
          evento = JSON.parse(linea);
        } catch {
          continue; // línea no-JSON (ruido/parcial), se ignora
        }
        if (evento.type === "result") {
          resultadoFinal = evento;
        } else if (evento.type === "assistant" && onPaso) {
          const contenido = (
            evento.message as { content?: unknown } | undefined
          )?.content;
          if (Array.isArray(contenido)) {
            for (const bloque of contenido) {
              if (
                bloque &&
                typeof bloque === "object" &&
                (bloque as { type?: string }).type === "tool_use"
              ) {
                onPaso(
                  resumirToolUse(
                    bloque as { name?: string; input?: Record<string, unknown> }
                  )
                );
              }
            }
          }
        }
        if (typeof evento.result === "string") {
          textoResultadoAcumulado = evento.result;
        }
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        // El error real suele venir en el evento "result" (ej. "Not logged in"),
        // no en stderr — probamos ahí primero antes de caer al mensaje genérico.
        const mensajeDesdeStdout =
          (resultadoFinal?.result as string | undefined) ||
          (resultadoFinal?.error as string | undefined);
        resolve({
          ok: false,
          textoResultado: stdoutCrudo,
          errorMensaje:
            mensajeDesdeStdout ||
            stderr ||
            `Claude Code terminó con código ${code}.`,
        });
        return;
      }
      if (resultadoFinal) {
        const usage = resultadoFinal.usage as
          | {
              input_tokens?: number;
              output_tokens?: number;
              cache_creation_input_tokens?: number;
              cache_read_input_tokens?: number;
            }
          | undefined;
        // El "tokens_input" que veíamos en el dashboard quedaba en 2-3 dígitos
        // por turno — absurdo para una sesión que relee todo el proyecto —
        // porque solo tomábamos `input_tokens`, que con --resume y prompt
        // caching es casi todo el input REAL de ese turno (viene servido por
        // caché). Sumamos también los tokens de creación/lectura de caché
        // para que el número mostrado refleje el consumo real, no solo la
        // porción "fresca" de cada turno.
        const tokensInputTotal =
          (usage?.input_tokens ?? 0) +
          (usage?.cache_creation_input_tokens ?? 0) +
          (usage?.cache_read_input_tokens ?? 0);
        resolve({
          ok: true,
          textoResultado:
            (resultadoFinal.result as string | undefined) ??
            textoResultadoAcumulado ??
            stdoutCrudo,
          sessionId: resultadoFinal.session_id as string | undefined,
          tokensInput: usage ? tokensInputTotal : undefined,
          tokensOutput: usage?.output_tokens,
          costoUsd:
            (resultadoFinal.total_cost_usd as number | undefined) ??
            (resultadoFinal.cost_usd as number | undefined),
        });
      } else {
        // No llegó un evento "result" parseable: igual entregamos el texto
        // crudo para no perder el trabajo, marcando que falló la metadata.
        resolve({
          ok: true,
          textoResultado: textoResultadoAcumulado || stdoutCrudo,
          errorMensaje:
            "No se pudo parsear la salida JSON de Claude Code (metadata de tokens/costo no disponible).",
        });
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        textoResultado: "",
        errorMensaje: `No se pudo ejecutar "${claudeExecutable}": ${err.message}. ¿Está Claude Code instalado y en el PATH?`,
      });
    });
  });
}
