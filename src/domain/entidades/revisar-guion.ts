import type { TipoContenido } from "./contenido.entity";

// ============================================================================
// Revisión automática de un guion contra las 4 leyes "Cero" y la plantilla del
// SOP (NODEXA-SOP-MKT-01, secciones 2 y 3). Solo avisa — nunca bloquea.
// ============================================================================

export interface AvisoGuion {
  regla: "emojis" | "humo" | "urgencia" | "tecnicismos" | "largo";
  mensaje: string;
}

// Símbolos sobrios permitidos por el SOP: ✦ ➔ → • │ (y flechas/viñetas tipográficas).
const PERMITIDOS = new Set(["✦", "➔", "→", "•", "│", "─", "┌", "├", "└"]);

const PALABRAS_URGENCIA = [
  "últimos cupos",
  "ultimos cupos",
  "comprá ya",
  "compra ya",
  "ahora o nunca",
  "oferta limitada",
  "solo por hoy",
  "no te lo pierdas",
  "aprovechá ya",
];

const PALABRAS_HUMO = [
  "duplicá tus ventas",
  "duplica tus ventas",
  "multiplicá tu facturación",
  "facturá el doble",
  "de la noche a la mañana",
  "resultados garantizados",
  "ganá plata fácil",
];

const TECNICISMOS = [
  "base de datos",
  "api",
  "next.js",
  "nextjs",
  "typescript",
  "backend",
  "frontend",
  "framework",
  "relacional",
  "endpoint",
];

const RANGO_PALABRAS_VIDEO = { min: 100, max: 130 };

/** Emojis "de colores": cualquier pictograma que no esté en la lista de símbolos sobrios del SOP. */
function tieneEmojiDeColor(texto: string): boolean {
  for (const ch of texto) {
    if (PERMITIDOS.has(ch)) continue;
    if (/\p{Extended_Pictographic}/u.test(ch)) return true;
  }
  return false;
}

function contiene(texto: string, lista: string[]): string | undefined {
  const t = texto.toLowerCase();
  return lista.find((p) =>
    new RegExp(
      `(^|[^a-záéíóúñ])${p.replace(/[.]/g, "\\.")}([^a-záéíóúñ]|$)`,
      "i"
    ).test(t)
  );
}

function contarPalabras(texto: string): number {
  return texto.trim() === "" ? 0 : texto.trim().split(/\s+/).length;
}

/** `guion` = valores por id de sección. El largo solo se controla en Videos, sobre lo que se dice en voz alta (gancho + desarrollo + cierre). */
export function revisarGuion(
  guion: Record<string, string>,
  tipo: TipoContenido
): AvisoGuion[] {
  const avisos: AvisoGuion[] = [];
  const todo = Object.values(guion).join("\n");

  if (tieneEmojiDeColor(todo)) {
    avisos.push({
      regla: "emojis",
      mensaje: "Hay emojis de colores. Usá solo ✦ ➔ • │.",
    });
  }
  const urgencia = contiene(todo, PALABRAS_URGENCIA);
  if (urgencia) {
    avisos.push({
      regla: "urgencia",
      mensaje: `Urgencia falsa: "${urgencia}".`,
    });
  }
  const humo = contiene(todo, PALABRAS_HUMO);
  if (humo) {
    avisos.push({ regla: "humo", mensaje: `Promesa de humo: "${humo}".` });
  }
  const tecnico = contiene(todo, TECNICISMOS);
  if (tecnico) {
    avisos.push({
      regla: "tecnicismos",
      mensaje: `Tecnicismo para el comerciante: "${tecnico}". Hablale de caja, stock y mostrador.`,
    });
  }
  if (tipo === "Video") {
    const hablado = [guion.gancho, guion.desarrollo, guion.cierre_cta]
      .filter(Boolean)
      .join(" ");
    const n = contarPalabras(hablado);
    if (
      n > 0 &&
      (n < RANGO_PALABRAS_VIDEO.min || n > RANGO_PALABRAS_VIDEO.max)
    ) {
      avisos.push({
        regla: "largo",
        mensaje: `El texto hablado tiene ${n} palabras; el SOP pide entre ${RANGO_PALABRAS_VIDEO.min} y ${RANGO_PALABRAS_VIDEO.max}.`,
      });
    }
  }
  return avisos;
}
