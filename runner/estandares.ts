import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import type { CodigoError } from "../src/domain/entidades/automatizacion-ia.entity";

const execFileAsync = promisify(execFile);

export interface ResultadoEstandares {
  ok: boolean;
  codigoError?: CodigoError;
  logs?: string;
}

/**
 * Extensiones sobre las que tiene sentido aplicar el límite de líneas y el
 * escaneo de credenciales — código fuente, no assets/lockfiles/docs (SCHEMA.md
 * y afines pueden ser legítimamente largos y no son código que la IA escriba
 * línea a línea).
 */
const EXTENSIONES_CODIGO = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const RUTAS_EXCLUIDAS = [
  "node_modules/",
  "package-lock.json",
  ".next/",
  "dist/",
  "build/",
];

/**
 * Patrones de credenciales/secretos hardcodeados en código fuente. A
 * propósito conservador (solo alta confianza) para no bloquear en falsos
 * positivos como claves públicas legítimas (ej. Supabase anon key, que está
 * diseñada para vivir en el cliente) — el objetivo es atajar secretos que
 * NUNCA deberían estar en el repo, no cualquier string que parezca un token.
 */
const PATRONES_CREDENCIAL: { nombre: string; patron: RegExp }[] = [
  { nombre: "clave privada PEM", patron: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    nombre: "API key de OpenAI/Anthropic",
    patron: /\b(sk-[a-zA-Z0-9]{20,}|sk-ant-[a-zA-Z0-9-]{20,})\b/,
  },
  { nombre: "access key de AWS", patron: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    nombre: "token de GitHub",
    patron: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/,
  },
  {
    nombre: "Supabase service role key hardcodeada",
    patron: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+["']/,
  },
  {
    nombre: "connection string con contraseña embebida",
    patron: /(postgres|postgresql|mysql|mongodb(\+srv)?):\/\/[^:\s]+:[^@\s]+@/,
  },
  {
    nombre: "password/secret asignado como literal",
    patron: /\b(password|contraseña|secret)\s*[:=]\s*["'][^"'\s]{6,}["']/i,
  },
];

/** Líneas que indican que el propio valor viene de una variable de entorno, no hardcodeado. */
function pareceReferenciaAEnv(linea: string): boolean {
  return /process\.env|import\.meta\.env|env\(/i.test(linea);
}

function archivoAplica(rutaRelativa: string): boolean {
  if (RUTAS_EXCLUIDAS.some((r) => rutaRelativa.includes(r))) return false;
  if (rutaRelativa.startsWith(".env")) return false;
  return EXTENSIONES_CODIGO.has(path.extname(rutaRelativa));
}

/**
 * Corre el gate de estándares "duros" sobre los archivos que el agente
 * tocó en esta corrida (working tree, todavía sin commitear): límite de
 * líneas por archivo y escaneo de credenciales hardcodeadas.
 *
 * Se ejecuta como paso objetivo del pipeline (no como pedido en el prompt)
 * porque en sesiones largas la IA deja de seguir al pie de la letra
 * instrucciones dadas al principio del contexto — este chequeo no depende
 * de que se acuerde.
 */
export async function verificarEstandares(
  rutaRepo: string,
  maxLineasPorArchivo: number | undefined
): Promise<ResultadoEstandares> {
  let archivosTocados: string[];
  try {
    const { stdout } = await execFileAsync("git", ["status", "--porcelain"], {
      cwd: rutaRepo,
    });
    archivosTocados = stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      // "M path", "A path", "?? path", "AM path" — nos quedamos con lo que
      // no sea una eliminación (" D path" no tiene archivo para inspeccionar).
      .filter((l) => !l.startsWith("D ") && !l.startsWith(" D"))
      .map((l) => l.replace(/^[ MADRCU?!]+\s+/, "").trim())
      .filter(archivoAplica);
  } catch (err) {
    return {
      ok: false,
      codigoError: "CLAUDE_CODE_INVOCATION_FAILED",
      logs: `No se pudo leer "git status" para el gate de estándares: ${err instanceof Error ? err.message : err}`,
    };
  }

  const violacionesLineas: string[] = [];
  const violacionesCredenciales: string[] = [];

  for (const rel of archivosTocados) {
    const abs = path.join(rutaRepo, rel);
    if (!fs.existsSync(abs)) continue;
    let contenido: string;
    try {
      contenido = fs.readFileSync(abs, "utf-8");
    } catch {
      continue;
    }
    const lineas = contenido.split("\n");

    if (maxLineasPorArchivo && lineas.length > maxLineasPorArchivo) {
      violacionesLineas.push(
        `${rel}: ${lineas.length} líneas (máximo configurado: ${maxLineasPorArchivo})`
      );
    }

    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i];
      if (pareceReferenciaAEnv(linea)) continue;
      for (const { nombre, patron } of PATRONES_CREDENCIAL) {
        if (patron.test(linea)) {
          violacionesCredenciales.push(`${rel}:${i + 1} — posible ${nombre}`);
        }
      }
    }
  }

  if (violacionesCredenciales.length > 0) {
    return {
      ok: false,
      codigoError: "CREDENCIAL_EXPUESTA",
      logs:
        `Se detectaron posibles credenciales hardcodeadas en el código (nunca deben ir en el repo, ni siquiera de prueba: usar variables de entorno + .env.example):\n` +
        violacionesCredenciales.join("\n"),
    };
  }

  if (violacionesLineas.length > 0) {
    return {
      ok: false,
      codigoError: "ESTANDAR_LINEAS_EXCEDIDO",
      logs:
        `Los siguientes archivos superan el máximo de líneas configurado para este proyecto — modularizá antes de continuar:\n` +
        violacionesLineas.join("\n"),
    };
  }

  return { ok: true };
}
