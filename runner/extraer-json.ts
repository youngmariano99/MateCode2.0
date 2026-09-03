/**
 * La respuesta de Claude Code trae prosa + código + un bloque ```json final.
 * Extrae ese bloque para poder validarlo con el contrato de handoff, en vez
 * de intentar JSON.parse sobre el texto completo (que fallaría siempre).
 */
export function extraerBloqueJson(texto: string): string | null {
  const fenced = texto.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();

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
