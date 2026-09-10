#!/usr/bin/env node
// Hook PreToolUse (matcher "Bash") para Claude Code: cuando el comando es
// parte del pack de verificación reconocido del proyecto (build/lint/test),
// le agrega un pipe hacia filtro-salida.js para no inflar el contexto con
// logs completos cuando casi siempre lo único útil son las líneas de error
// — Estrategia 2.2 de economía de tokens. Deliberadamente conservador: solo
// actúa sobre comandos de verificación reconocidos, nunca sobre bash en
// general (no toca `git`, `ls`, migraciones, etc.).
//
// Node en vez de bash/jq: la máquina que corre el runner no tiene jq
// instalado, y Node ya es una dependencia dura del runner — cero
// dependencias nuevas.
// Script CommonJS standalone (sin "type": "module" en package.json),
// invocado directo por Claude Code como comando de hook, no por el build de TS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path");

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.stdout.write("{}");
    return;
  }

  const cmd = input && input.tool_input && input.tool_input.command;
  if (typeof cmd !== "string" || !cmd.trim()) {
    process.stdout.write("{}");
    return;
  }

  const esVerificacion =
    /\b(npm\s+(run\s+)?(test|build|lint)|npx\s+(playwright|jest|vitest)|pytest|go\s+test)\b/i.test(
      cmd
    );
  if (!esVerificacion) {
    process.stdout.write("{}");
    return;
  }

  const filtro = path.join(__dirname, "filtro-salida.js");
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        updatedInput: {
          ...input.tool_input,
          command: `${cmd} 2>&1 | node "${filtro}"`,
        },
      },
    })
  );
});
