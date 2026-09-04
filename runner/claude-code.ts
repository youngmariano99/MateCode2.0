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
export function invocarClaudeCode({
  prompt,
  rutaRepo,
  claudeExecutable = "claude",
  resumeSessionId,
  timeoutMs = 30 * 60 * 1000, // 30 min: dejar tiempo real para un ticket completo
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
  const args = [
    "-p",
    "--output-format",
    "json",
    "--permission-mode",
    "acceptEdits",
  ];
  if (resumeSessionId) {
    args.push("--resume", resumeSessionId);
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

    let stdout = "";
    let stderr = "";
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
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        // El error real suele venir en el JSON de stdout (ej. "Not logged in"),
        // no en stderr — probamos ahí primero antes de caer al mensaje genérico.
        let mensajeDesdeStdout: string | undefined;
        try {
          const parsed = JSON.parse(stdout);
          mensajeDesdeStdout = parsed.result || parsed.error;
        } catch {
          // stdout no era JSON, seguimos con stderr/mensaje genérico.
        }
        resolve({
          ok: false,
          textoResultado: stdout,
          errorMensaje:
            mensajeDesdeStdout ||
            stderr ||
            `Claude Code terminó con código ${code}.`,
        });
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve({
          ok: true,
          textoResultado: parsed.result ?? stdout,
          sessionId: parsed.session_id,
          tokensInput: parsed.usage?.input_tokens,
          tokensOutput: parsed.usage?.output_tokens,
          costoUsd: parsed.total_cost_usd ?? parsed.cost_usd,
        });
      } catch {
        // La CLI no devolvió JSON parseable: igual entregamos el texto crudo
        // para no perder el trabajo, marcando que el parseo de metadata falló.
        resolve({
          ok: true,
          textoResultado: stdout,
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
