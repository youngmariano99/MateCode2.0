import type {
  Contenido,
  SeccionGuion,
  TipoContenido,
} from "../entidades/contenido.entity";

/**
 * Arma el prompt para transformar un contenido ya escrito (ej. guion de
 * video) en otro tipo (ej. carrusel). Mismo mecanismo que se usa para
 * "crear desde cero con IA": la respuesta se pega en el import JSON de la
 * estación Guion — un solo camino sirve para las dos cosas.
 */
export function generarPromptTransformarContenido(
  origen: Pick<Contenido, "titulo" | "tipoContenido" | "guion">,
  secciones: SeccionGuion[],
  tipoDestino: TipoContenido,
  canalesDestino: string[]
): string {
  const contenidoOriginal = secciones
    .sort((a, b) => a.orden - b.orden)
    .map((s) => `- ${s.etiqueta}: ${origen.guion[s.id] || "(vacío)"}`)
    .join("\n");

  return `<rol>
Actuás como Copywriter de Contenido de NODEXA, siguiendo el procedimiento NODEXA-SOP-MKT-01.
</rol>

<estandares_no_negociables>
1. Dialecto rioplatense profesional (vos/tenés/podés/hacés). Cero emojis de colores — solo símbolos sobrios: ✦ ➔ • │.
2. Cero humo: nada de promesas mágicas de facturación. Enfoque en estructura operativa real.
3. Cero urgencia falsa, cero tecnicismos con el cliente (nada de "base de datos", "API", hablale de caja/stock/mostrador).
4. Valor primero: aportar un aprendizaje o recurso antes de vender.
</estandares_no_negociables>

<contenido_original>
Título: ${origen.titulo}
Tipo original: ${origen.tipoContenido}
${contenidoOriginal}
</contenido_original>

<transformacion_solicitada>
Convertí este contenido en un/a **${tipoDestino}** para: ${canalesDestino.join(", ") || "los canales que corresponda"}.
Adaptá el formato (no es lo mismo un guion hablado de 30s que el copy de un carrusel de varias placas), pero mantené el mismo gancho, el mismo dolor operativo y el mismo CTA de fondo.
</transformacion_solicitada>

<salida_requerida>
Devolvé ÚNICAMENTE un bloque JSON con esta forma exacta (sin texto alrededor):
\`\`\`json
{
  "titulo": "...",
  "tipoContenido": "${tipoDestino}",
  "canales": ${JSON.stringify(canalesDestino)},
  "guion": {
    "gancho": "...",
    "desarrollo": "...",
    "cierre_cta": "..."
  }
}
\`\`\`
Usá como claves de "guion" los ids de sección que apliquen (gancho, desarrollo, cierre_cta, descripcion, texto_pantalla, hashtags, gancho_visual) — omití las que no correspondan al tipo destino.
</salida_requerida>`;
}
