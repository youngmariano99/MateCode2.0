import {
  DESCRIPCION_PILAR,
  ETIQUETA_ETAPA,
  PERSONAS_CONTENIDO,
  PILARES_CONTENIDO,
  type SeccionGuion,
} from "../entidades/contenido.entity";

// ============================================================================
// Prompts de la planificación de contenido con IA (SOP-MKT-01). Tres etapas,
// cada una con su JSON; lo decidido en una vuelve a entrar en la siguiente (lo
// arma la app desde lo guardado). Todos comparten la misma estructura:
//   <rol> · <sop> · <contexto_de_la_semana> · <lo_ya_decidido> · <etapa> · <salida>
// ============================================================================

export interface ContextoContenidoPrompt {
  /** "Semana 39 · 21 sep – 27 sep". */
  etiquetaSemana: string;
  /** Fechas de la semana: [{ dia: "Lunes", fecha: "2026-09-21" }, …]. */
  diasSemana: { dia: string; fecha: string }[];
  /** Texto de la mezcla actual (ej. "3 Video, 3 Post, 5 Historia") o vacío si todavía no se definió. */
  mezcla: string;
  /** Qué pasó esta semana en el resto del trabajo: entregables, proyectos, clientes, aprendizajes de contacto en frío. */
  contextoTrabajo: string;
  /** Resultados de la semana anterior (KPIs). */
  resultadosAnteriores: string;
  /** Ideas ya cargadas (backlog + de la semana). */
  ideas: string[];
  /** Piezas ya planificadas de esta semana, una línea por pieza. */
  piezas: string[];
  secciones: SeccionGuion[];
}

const SOP = `<sop_contenido>
Propósito: definir el proceso de ideación, redacción, grabación, edición y publicación de contenido de NODEXA para TikTok, Instagram (Reels, carruseles, posts, historias) y Facebook. Lo gestiona UNA sola persona (programador + administrador), con calidad de agencia y menos de 5 horas por semana. Trabaja en LOTES (batching): cada etapa se hace de una vez para varias piezas, en el día que el usuario elija esa semana (no hay días fijos).

Buyer personas — cada pieza le habla a UNA:
1. ${PERSONAS_CONTENIDO[0]} (Nodexa Custom): dueño de PyME/distribuidora con equipo. Dolor: falta de control en tiempo real, miedo a delegar, desorden de pedidos y stock entre depósito y administración. Tono profesional, eficiencia y datos, sin tecnicismos. Ángulo: "Automatizá para poder delegar con tranquilidad".
2. ${PERSONAS_CONTENIDO[1]} (Nodexa Core Starter): dueño de local minorista a la calle (indumentaria, librería, juguetería, almacén) que opera "a ojo". Dolor: cuaderno de fiado, WhatsApp colapsado de mensajes repetitivos (precios, fotos), mostrador lento con fila. Tono empático, directo, sincero. Ángulo: "Menos ping-pong de WhatsApp y cuadernos perdidos; más ventas rápidas".
3. ${PERSONAS_CONTENIDO[2]} (Nodexa Starter y recursos gratuitos): emprendedor que arranca, con poco capital. Dolor: sin presupuesto para sistemas, invisibilidad online, registra todo de memoria. Tono de mentor honesto y accesible. Ángulo: "Ordená tu base hoy gratis; automatizá con Nodexa mañana".

Pilares (van en la ficha técnica de cada pieza):
${PILARES_CONTENIDO.map((p) => `- ${p}: ${DESCRIPCION_PILAR[p]}`).join("\n")}
Escalera de valor: Etapa 1 (caos total) → Pack Administrativo en Excel, CTA "Comentá PACK". Etapa 2 (orden con poco tiempo) → Demo de Nodexa Core Starter, CTA "Comentá DEMO". Etapa 3 (crecimiento complejo) → consultoría Nodexa Custom, CTA por mensaje privado.

Voz y gobernanza — las 4 leyes "Cero":
1. Cero emojis de colores. Solo símbolos sobrios: ✦ (viñeta principal), ➔ (acción/conector), • (lista secundaria), │ (separador).
2. Cero humo: nada de aumentos mágicos de facturación. Se habla de estructura operativa, control real del stock y transparencia.
3. Cero urgencia falsa: nada de "últimos cupos" ni "comprá ya".
4. Cero tecnicismos con el cliente: nada de base de datos, API, Next.js, TypeScript. Se habla de caja, stock, mostrador lento y ahorro de tiempo.
Idioma: español rioplatense profesional (vos, tenés, podés, hacés). Sin lunfardo vulgar ni frialdad corporativa.

Plantilla de guion de VIDEO (estructura "Sándwich invertido": gancho fuerte → sustento práctico → llamado a la acción):
- Ficha técnica: título de referencia, pilar, persona destino, serie, módulo de Nodexa que promociona, keyword principal.
- SEO: de audio (frase clave dicha fuerte entre el segundo 0 y el 3), visual (texto de anclaje fijo arriba), de leyenda (frase clave del copy).
- Guion hablado de 100 a 130 palabras (menos de 60 s): GANCHO disruptivo (frase corta de dolor operativo real, 0-4 s) → DESARROLLO sincero (por qué pasa el problema, desde la experiencia) → SOLUCIÓN / efecto ajá (cómo la estructura lógica o Nodexa lo resuelve) → LLAMADO A LA ACCIÓN de una sola palabra en comentarios.
- Bucle narrativo: la última frase del guion queda inconclusa y encaja gramaticalmente con la primera del gancho.
- Leyenda PEC-CTA: TÍTULO EN MAYÚSCULAS + Problema ➔ Empatía ➔ Llamado a la acción con la palabra clave.
- Checklist editorial: rioplatense correcto, 100% sin emojis de colores, trato respetuoso de objeciones (aliado, no crítico de otros sistemas), zona segura de subtítulos, valor primero (aporta un aprendizaje o recurso antes de vender).
Post / carrusel: mismo espíritu, con la leyenda PEC-CTA como pieza central y el desarrollo en placas. Historia: una idea corta y un llamado a la acción simple.

Métricas semanales: retención en el segundo 3 (meta > 45%), valor compartido = (guardados + compartidos) / vistas (meta > 2%), leads por keyword (DEMO / PACK) (meta > 5 por semana).
</sop_contenido>`;

function bloqueContexto(c: ContextoContenidoPrompt): string {
  return `<contexto_de_la_semana>
Semana: ${c.etiquetaSemana}
Fechas: ${c.diasSemana.map((d) => `${d.dia} ${d.fecha}`).join(" · ")}
Mezcla de piezas definida hasta ahora: ${c.mezcla || "todavía no definida"}

Lo que pasó y viene en el resto del trabajo (de acá salen ideas: un software que estoy armando, un cliente nuevo, un aprendizaje de las conversaciones con comerciantes):
${c.contextoTrabajo || "(sin novedades cargadas)"}

Resultados de la semana anterior:
${c.resultadosAnteriores || "(sin datos)"}
</contexto_de_la_semana>`;
}

function bloqueDecidido(c: ContextoContenidoPrompt): string {
  return `<lo_ya_decidido>
Ideas cargadas:
${c.ideas.length ? c.ideas.map((i) => `- ${i}`).join("\n") : "- (ninguna todavía)"}

Piezas ya planificadas esta semana:
${c.piezas.length ? c.piezas.map((p) => `- ${p}`).join("\n") : "- (ninguna todavía)"}
</lo_ya_decidido>`;
}

const ROL = `<rol>
Sos el asistente de planificación de contenido de NODEXA. Seguís el procedimiento SOP-MKT-01 al pie de la letra. Ayudás a planificar la semana EN ETAPAS, sin saltar de una a la siguiente: cada etapa termina con un JSON que se importa a la app.
</rol>`;

const PREGUNTAR = `Antes de generar el JSON hacé las preguntas que necesites para no inventar nada, de a pocas y esperá mi respuesta. NO generes el JSON hasta que confirme que ya tenés todo.`;

/** ① Ideas — qué pasó esta semana, qué se puede contar, qué dolor atacar. */
export function generarPromptIdeas(c: ContextoContenidoPrompt): string {
  return `${ROL}

${SOP}

${bloqueContexto(c)}

${bloqueDecidido(c)}

<etapa>
ETAPA 1 de 3 — IDEAS. Todavía NO definimos cantidades, días ni guiones.
1. Repasá el contexto: ¿hay algo del trabajo de esta semana (un software que estoy armando, un cliente nuevo, un proyecto entregado, un aprendizaje de las conversaciones con comerciantes) que se pueda convertir en contenido? Decime qué encontraste y preguntame si hay algo más que no esté cargado. Si no hay nada aprovechable, decímelo y partí de los dolores de las personas del SOP.
2. Proponé ideas concretas. Cada una apunta a UNA persona y UN pilar (${PILARES_CONTENIDO.join(" / ")}), parte de un dolor operativo real (caja, stock, fiado, WhatsApp, mostrador) y sigue la regla de valor primero. No repitas las ideas ya cargadas.
3. Yo elijo cuáles entran esta semana. Las que descarte pueden quedar en el backlog.
${PREGUNTAR}
</etapa>

<salida_requerida>
Cuando confirme, devolvé ÚNICAMENTE un bloque JSON con esta forma exacta (sin texto alrededor):
\`\`\`json
{
  "ideas": [
    {
      "texto": "Idea concreta en una frase",
      "dolorSemana": "El dolor operativo que resuelve (ej. cuentas corrientes)",
      "pilar": "${PILARES_CONTENIDO.join(" | ")}",
      "persona": "${PERSONAS_CONTENIDO.join(" | ")}",
      "seleccionar": true
    }
  ]
}
\`\`\`
"seleccionar": true = entra a esta semana; false = queda en el backlog. "pilar" y "persona" son opcionales pero recomendados. No uses emojis de colores.
</salida_requerida>`;
}

/** ② Plan de la semana — cantidades, tipos, ficha de cada pieza y el día de cada etapa. */
export function generarPromptPlan(c: ContextoContenidoPrompt): string {
  return `${ROL}

${SOP}

${bloqueContexto(c)}

${bloqueDecidido(c)}

<etapa>
ETAPA 2 de 3 — PLAN DE LA SEMANA. Partí de las ideas ya cargadas (arriba, en lo ya decidido).
1. Cantidades y tipos: preguntame cuántas piezas quiero de cada tipo esta semana (Video, Post, Carrusel, Historia). NO asumas una mezcla fija: cambia de una semana a otra. Si ya hay una mezcla definida arriba, proponela como punto de partida y preguntame si la cambio.
2. Una pieza por idea (o varias por idea si conviene, ej. el mismo tema como video y como post). Para cada pieza definí: título, tipo, pilar, persona destino, serie (si forma parte de una saga), módulo de Nodexa que promociona y la keyword principal (la del CTA: PACK, DEMO…).
3. Días: preguntame cómo quiero distribuir el trabajo en la semana. Cada pieza tiene 4 etapas con SU PROPIO día — guion, grabación, edición y publicación — y puede haber varias piezas o varias etapas el mismo día. No hay días fijos: si no te digo nada, proponé un punto de partida (guionizar y grabar en lote al principio de la semana, editar después, publicar repartido) y esperá mi OK. Usá las fechas exactas de la semana (arriba). Sugerí publicar entre las 18:00 y las 21:00 hs.
${PREGUNTAR}
</etapa>

<salida_requerida>
Cuando confirme, devolvé ÚNICAMENTE un bloque JSON con esta forma exacta (sin texto alrededor):
\`\`\`json
{
  "mezcla": { "Video": 3, "Post": 3, "Carrusel": 0, "Historia": 5 },
  "piezas": [
    {
      "titulo": "Título de referencia de la pieza (único en la semana)",
      "tipoContenido": "Video | Post | Carrusel | Historia",
      "idea": "Texto EXACTO de la idea de origen (si viene de una cargada)",
      "pilar": "${PILARES_CONTENIDO.join(" | ")}",
      "persona": "${PERSONAS_CONTENIDO.join(" | ")}",
      "serie": "Nombre de la saga (opcional)",
      "modulo": "Módulo de Nodexa que promociona (opcional)",
      "keyword": "PACK",
      "canales": ["Instagram", "TikTok"],
      "dias": { "guion": "YYYY-MM-DD", "grabacion": "YYYY-MM-DD", "edicion": "YYYY-MM-DD", "publicacion": "YYYY-MM-DD" }
    }
  ]
}
\`\`\`
La suma de "mezcla" tiene que coincidir con la cantidad de piezas de cada tipo. Las historias no llevan grabación ni edición aparte si se hacen en el momento: omití esas claves. Las etapas que sean ${Object.values(ETIQUETA_ETAPA).join(", ")} se identifican con las claves guion, grabacion, edicion y publicacion.
</salida_requerida>`;
}

/** ③ Guiones — con la plantilla del SOP, por lote. */
export function generarPromptGuiones(c: ContextoContenidoPrompt): string {
  const ids = c.secciones
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((s) => `- "${s.id}": ${s.etiqueta}`)
    .join("\n");
  return `${ROL}

${SOP}

${bloqueContexto(c)}

${bloqueDecidido(c)}

<etapa>
ETAPA 3 de 3 — GUIONES. Las piezas ya están planificadas (arriba, en lo ya decidido, con su tipo, pilar, persona, serie y keyword). Escribí los guiones de las piezas que yo te indique (por defecto, las que todavía no tienen guion), en lote.
- VIDEO: usá la plantilla completa del SOP. El texto hablado (gancho + desarrollo + cierre_cta) tiene que sumar entre 100 y 130 palabras, con el bucle narrativo bien cerrado.
- POST / CARRUSEL: la leyenda PEC-CTA es la pieza central; el desarrollo va en placas numeradas.
- HISTORIA: una idea corta y un llamado a la acción simple (gancho + cierre_cta).
Verificá cada guion contra las 4 leyes Cero y el checklist editorial ANTES de entregarlo. Si una idea no alcanza para un buen guion, decímelo en vez de rellenar.
${PREGUNTAR}
</etapa>

<salida_requerida>
Cuando confirme, devolvé ÚNICAMENTE un bloque JSON con esta forma exacta (sin texto alrededor):
\`\`\`json
{
  "guiones": [
    {
      "titulo": "Título EXACTO de la pieza planificada",
      "guion": {
        "gancho": "...",
        "desarrollo": "..."
      }
    }
  ]
}
\`\`\`
Las claves de "guion" son los ids de sección de la plantilla; usá solo las que apliquen al tipo de pieza:
${ids}
No uses emojis de colores; solo ✦ ➔ • │.
</salida_requerida>`;
}
