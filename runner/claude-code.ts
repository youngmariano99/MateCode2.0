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
  const args = ["-p", prompt, "--output-format", "json"];
  if (resumeSessionId) {
    args.push("--resume", resumeSessionId);
  }

  return new Promise((resolve) => {
    const child = spawn(claudeExecutable, args, {
      cwd: rutaRepo,
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve({
          ok: false,
          textoResultado: stdout,
          errorMensaje: stderr || `Claude Code terminó con código ${code}.`,
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
