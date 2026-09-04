import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";

const execFileAsync = promisify(execFile);

export interface CiGateResultado {
  ciEstado: "paso" | "fallo" | "sin_ci";
  detalle?: string;
}

/** Solo tiene sentido esperar CI si el repo efectivamente tiene GitHub Actions. */
export function tieneCI(rutaRepo: string): boolean {
  return fs.existsSync(path.join(rutaRepo, ".github", "workflows"));
}

/**
 * Espera a que terminen los checks del PR de la rama actual. No bloquea si
 * el repo no tiene CI configurado ("si se puede y no consume mucho" — si no
 * hay CI, no hay nada que esperar, listo). `gh pr checks --watch` hace el
 * polling por nosotros y devuelve código != 0 si algún check falló.
 */
export async function esperarChecksCI(
  rutaRepo: string,
  timeoutMs = 6 * 60 * 1000
): Promise<CiGateResultado> {
  if (!tieneCI(rutaRepo)) return { ciEstado: "sin_ci" };
  try {
    const { stdout } = await execFileAsync(
      "gh",
      ["pr", "checks", "--watch", "--interval", "15"],
      { cwd: rutaRepo, timeout: timeoutMs }
    );
    return { ciEstado: "paso", detalle: stdout.slice(0, 2000) };
  } catch (err: unknown) {
    // gh pr checks sale con código != 0 si algún check falló, si hizo timeout,
    // o si el repo no tiene checks configurados en este PR puntual — en
    // cualquiera de esos casos tratamos como "no se pudo confirmar que pasó".
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const salida =
      `${e.stdout || ""}${e.stderr || ""}` || e.message || String(err);
    return { ciEstado: "fallo", detalle: String(salida).slice(0, 2000) };
  }
}
