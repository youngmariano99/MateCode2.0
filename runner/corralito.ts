import fs from "node:fs";
import path from "node:path";

/**
 * Escribe el corralito de seguridad (permisos de Claude Code) en el repo
 * destino antes de invocar al agente, sobreescribiendo el archivo local
 * previo del runner en cada corrida (no toca settings.json del usuario).
 *
 * allowedTools/deniedPaths vienen de proyecto_config_automatizacion. Se
 * asume el formato de reglas de Claude Code (`.claude/settings.local.json`,
 * bloque "permissions": { "allow": [...], "deny": [...] }): allowedTools son
 * reglas ya armadas (ej. "Bash(npm run test:*)"); deniedPaths son rutas
 * simples que se traducen a reglas de lectura/edición denegadas.
 */
export function escribirCorralito(
  rutaRepo: string,
  allowedTools: string[] = [],
  deniedPaths: string[] = []
): void {
  const denyRules = deniedPaths.flatMap((p) => [`Read(${p})`, `Edit(${p})`]);

  const settings = {
    permissions: {
      allow: allowedTools,
      deny: [
        // Denegados por defecto, independientes de la config del proyecto:
        // credenciales y control de versiones destructivo. Ojo: NO se
        // deniega ".env.*" en general — esa regla bloqueaba también
        // ".env.example"/".env.sample" (plantillas sin secretos, que el
        // agente sí necesita poder editar cuando el ticket agrega una
        // variable nueva). Solo se listan los archivos que realmente
        // pueden tener valores reales.
        "Read(./.env)",
        "Read(./.env.local)",
        "Read(./.env.*.local)",
        "Read(./.env.development)",
        "Read(./.env.development.local)",
        "Read(./.env.production)",
        "Read(./.env.production.local)",
        "Read(./.env.test)",
        "Read(./.env.test.local)",
        "Bash(git push --force*)",
        "Bash(rm -rf*)",
        ...denyRules,
      ],
    },
  };

  const dir = path.join(rutaRepo, ".claude");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "settings.local.json"),
    JSON.stringify(settings, null, 2),
    "utf-8"
  );
}
