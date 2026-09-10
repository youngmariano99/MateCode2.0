import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

/**
 * DORMIDO A PROPÓSITO — no se usa desde runner/index.ts.
 *
 * Se verificó empíricamente (corrida real con `claude -p --settings ...` y
 * también con `.claude/settings.json` de proyecto) que los hooks
 * PreToolUse no se aplican en modo headless en la versión actual de la CLI:
 * el comando de Bash le llegó a la herramienta sin modificar pese al hook
 * configurado. Es un bug conocido y abierto de Claude Code
 * (anthropics/claude-code#92675), no un error de esta implementación.
 *
 * Queda el código listo para reactivar (solo hay que volver a pasar
 * `settingsPath: obtenerSettingsFiltroVerificacion()` en las invocaciones
 * de runner/index.ts) el día que se arregle en la CLI.
 *
 * Genera (una sola vez por proceso, cacheado en memoria) el archivo de
 * settings que activaría el hook PreToolUse de filtrado de salida de
 * build/lint/test — Estrategia 2.2 de economía de tokens. Devuelve la ruta
 * absoluta para pasar como `--settings`.
 */
let rutaSettingsCacheada: string | undefined;

export function obtenerSettingsFiltroVerificacion(): string {
  if (rutaSettingsCacheada && fs.existsSync(rutaSettingsCacheada)) {
    return rutaSettingsCacheada;
  }

  const scriptPreToolUse = path.join(
    __dirname,
    "hooks",
    "pretooluse-filtrar-bash.js"
  );
  const settings = {
    hooks: {
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [{ type: "command", command: `node "${scriptPreToolUse}"` }],
        },
      ],
    },
  };

  const rutaSettings = path.join(
    os.tmpdir(),
    "matecode-runner-hooks-settings.json"
  );
  fs.writeFileSync(rutaSettings, JSON.stringify(settings, null, 2), "utf-8");
  rutaSettingsCacheada = rutaSettings;
  return rutaSettings;
}
