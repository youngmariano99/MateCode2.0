/**
 * La respuesta de Claude Code trae prosa + código + un bloque ```json final.
 * Extrae ese bloque para poder validarlo con el contrato de handoff, en vez
 * de intentar JSON.parse sobre el texto completo (que fallaría siempre).
 */
export function extraerBloqueJson(texto: string): string | null {
  // Usamos el ÚLTIMO bloque ```json de la respuesta, no el primero: el
  // prompt le pide el handoff "al final", pero si el agente muestra JSON de
  // ejemplo antes (ej. fixtures, un seed, una migración) el primer match
  // agarraría eso en vez del handoff real — es lo que pasó en la primera
  // corrida real (arrays vacíos porque tomó un bloque que no era el handoff).
  const matches = [...texto.matchAll(/```json\s*([\s\S]*?)```/gi)];
  if (matches.length > 0) return matches[matches.length - 1][1].trim();

  // Fallback: último objeto { ... } balanceado en el texto.
  const lastBrace = texto.lastIndexOf("}");
  if (lastBrace === -1) return null;
  let depth = 0;
  for (let i = lastBrace; i >= 0; i--) {
    if (texto[i] === "}") depth++;
    if (texto[i] === "{") {
      depth--;
      if (depth === 0) {
        return texto.slice(i, lastBrace + 1);
      }
    }
  }
  return null;
}
