import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { CodigoError } from "../src/domain/entidades/automatizacion-ia.entity";

const execAsync = promisify(exec);

export interface PasoVerificacion {
  nombre: "build" | "lint" | "testUnit" | "testIntegration" | "testE2e";
  comando?: string;
}

export interface ResultadoVerificacion {
  ok: boolean;
  pasoFallido?: PasoVerificacion["nombre"];
  codigoError?: CodigoError;
  logs?: string;
}

const CODIGO_POR_PASO: Record<PasoVerificacion["nombre"], CodigoError> = {
  build: "BUILD_FAILED",
  lint: "LINT_FAILED",
  testUnit: "TEST_FAILED",
  testIntegration: "TEST_FAILED",
  testE2e: "TEST_FAILED",
};

/**
 * Corre build/lint/tests en orden, en el repo del proyecto destino, y corta
 * en el primer paso que falle (gate objetivo, sin criterio subjetivo de la
 * IA: si no compila o no pasa, es error, no hay ambigüedad). Un paso sin
 * comando configurado se reporta como inconcluso, no como éxito silencioso
 * — no confirmar objetivamente algo que no se pudo verificar.
 */
export async function correrVerificacion(
  rutaRepo: string,
  pasos: PasoVerificacion[]
): Promise<ResultadoVerificacion> {
  for (const paso of pasos) {
    if (!paso.comando) {
      return {
        ok: false,
        pasoFallido: paso.nombre,
        codigoError: "VERIFICACION_INCONCLUSA",
        logs: `No hay comando configurado para "${paso.nombre}" en proyecto_config_automatizacion.`,
      };
    }
    try {
      await execAsync(paso.comando, { cwd: rutaRepo, timeout: 10 * 60 * 1000 });
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      return {
        ok: false,
        pasoFallido: paso.nombre,
        codigoError: CODIGO_POR_PASO[paso.nombre],
        logs: String(e.stdout || "") + String(e.stderr || e.message || ""),
      };
    }
  }
  return { ok: true };
}
