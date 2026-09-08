import type {
  FichaDigital,
  PotencialCliente,
} from "../entidades/contacto-frio.entity";

/**
 * Arma el prompt para que una IA redacte el mensaje de apertura de contacto
 * en frío de este prospecto puntual. No genera el pitch en el momento acá
 * (eso queda en manos de la IA, copiando/pegando este prompt) — la función
 * solo empaqueta lo que ya se cargó del prospecto + los estándares fijos del
 * procedimiento (NODEXA-SOP-02), para no repetir a mano en cada prospecto lo
 * que ya es común a todos.
 */
export function generarPromptPitchProspecto(
  prospecto: Pick<PotencialCliente, "nombre" | "rubro">,
  ficha: Pick<
    FichaDigital,
    | "nombreDueño"
    | "dolorTags"
    | "tieneWeb"
    | "usaCatalogoNativoWhatsapp"
    | "notasExtra"
    | "referenciaPosteo"
  >
): string {
  const señales: string[] = [];
  if (ficha.tieneWeb === "no") señales.push("No tiene web/catálogo online.");
  if (ficha.tieneWeb === "caida_desactualizada")
    señales.push("Tiene web/catálogo, pero está caído o desactualizado.");
  if (ficha.usaCatalogoNativoWhatsapp)
    señales.push(
      "Usa el catálogo nativo de WhatsApp Business (no resuelve variantes ni stock real)."
    );

  return `<rol>
Actuás como Copywriter de Ventas Outbound especializado en contacto en frío por redes sociales, siguiendo el procedimiento NODEXA-SOP-02.
</rol>

<estandares_no_negociables>
1. Metodología "The Mom Test": nunca preguntes si "comprarían" o "les parece buena idea" algo — indagá sobre su comportamiento pasado/presente real (cómo cobran hoy, cómo mandan fotos hoy, cómo controlan el stock hoy).
2. Nunca vendas de entrada. El único objetivo del primer mensaje es iniciar una conversación humana que valide un dolor operativo real.
3. Tono rioplatense profesional (vos/tenés/podés), cálido pero directo. Cero emojis de colores, cero urgencia falsa, cero tecnicismos.
4. Estructura obligatoria: saludo personalizado con conexión local sincera → gancho empático basado en lo que se detectó en su perfil (nunca hables de tu producto acá) → una sola pregunta de comportamiento, cero fricción.
5. Longitud máxima: 150 palabras, que entre cómodo en un chat de Instagram/WhatsApp.
</estandares_no_negociables>

<datos_del_prospecto>
- Nombre del comercio: ${prospecto.nombre}
- Rubro: ${prospecto.rubro || "No especificado"}
- Nombre del dueño/encargado (si se detectó): ${ficha.nombreDueño || "No detectado"}
- Dolores detectados: ${ficha.dolorTags.length ? ficha.dolorTags.join(", ") : "Ninguno cargado todavía"}
- Señales adicionales: ${señales.length ? señales.join(" ") : "Ninguna"}
- Referencia puntual (posteo/historia que se vio): ${ficha.referenciaPosteo || "No especificada"}
- Notas extra cargadas manualmente: ${ficha.notasExtra || "Ninguna"}
</datos_del_prospecto>

<salida_requerida>
Redactá el mensaje de apertura listo para copiar y pegar. Solo el texto del mensaje, sin explicaciones alrededor.
</salida_requerida>`;
}
