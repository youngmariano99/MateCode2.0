import fs from "node:fs";
import path from "node:path";

export interface RunnerProjectConfig {
  /** Ruta absoluta local al repositorio del proyecto donde corre Claude Code. */
  rutaLocalRepo: string;
  /** Comando/binario de Claude Code. Por defecto "claude". */
  claudeExecutable?: string;
}

export interface RunnerConfig {
  proyectos: Record<string, RunnerProjectConfig>;
  /** Cada cuánto se consulta la base por tickets nuevos, en ms. */
  pollIntervalMs?: number;
}

const CONFIG_PATH = path.resolve(process.cwd(), "runner.config.json");

export function loadRunnerConfig(): RunnerConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(
      `No se encontró runner.config.json en la raíz del proyecto (${CONFIG_PATH}).\n` +
        `Copiá runner.config.example.json a runner.config.json y completá la ruta local de cada proyecto que quieras automatizar.`
    );
  }
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  let parsed: RunnerConfig;
  try {
    parsed = JSON.parse(raw) as RunnerConfig;
  } catch (err) {
    throw new Error(
      `runner.config.json no es un JSON válido: ${err instanceof Error ? err.message : err}`
    );
  }
  if (!parsed.proyectos || Object.keys(parsed.proyectos).length === 0) {
    throw new Error(
      "runner.config.json no tiene ningún proyecto configurado en 'proyectos'."
    );
  }
  for (const [proyectoId, cfg] of Object.entries(parsed.proyectos)) {
    if (!cfg.rutaLocalRepo || !fs.existsSync(cfg.rutaLocalRepo)) {
      throw new Error(
        `El proyecto "${proyectoId}" en runner.config.json apunta a una ruta local inexistente: "${cfg.rutaLocalRepo}".`
      );
    }
  }
  return parsed;
}

export function getProjectConfig(
  config: RunnerConfig,
  proyectoId: string
): RunnerProjectConfig | undefined {
  return config.proyectos[proyectoId];
}
