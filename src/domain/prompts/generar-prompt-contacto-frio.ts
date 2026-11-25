import type {
  Aprendizaje,
  FichaDigital,
  PotencialCliente,
} from "../entidades/contacto-frio.entity";
import {
  ACCIONES_PROXIMO_PASO,
  TIPOS_DATO,
} from "../entidades/contacto-frio.entity";
import { faltaAprender } from "../entidades/contacto-frio-cinta.entity";

// ============================================================================
// Prompts de la cinta de contacto en frío (Mom Test, NODEXA-SOP-02). No hay
// IA integrada: cada estación arma un prompt con el contexto ya cargado, se
// copia, se pega en la IA de preferencia, y (en las que devuelven datos) se
// pega la respuesta de vuelta. Todos tienen la MISMA forma para que resulte
// automático: <rol> · <reglas_mom_test> · <prospecto> · <historial> · lo
// nuevo · <que_devolver>.
// ============================================================================

const REGLAS_MOM_TEST = `<reglas_mom_test>
1. Hablá de SU vida y su negocio, nunca de tu producto ni de tu idea. No nombres "Nodexa", "sistema", "catálogo web", "demo" ni "app" hasta que corresponda proponer (ver <etapa> cuando exista).
2. Preguntá por casos PASADOS y concretos ("la última vez que te pasó, ¿cómo fue?", "¿cómo lo resolviste?"), no por opiniones ni por el futuro. Prohibido: "¿te serviría…?", "¿usarías…?", "¿pagarías…?", "¿te parece buena idea…?".
3. UNA sola pregunta por mensaje, abierta y neutral: no la formules de manera que sugiera la respuesta ni le des opciones para elegir.
4. Los elogios no son datos: no los busques ni los tomes como señal. Un halago, un "me parece buenísimo" o un "algún día" es humo.
5. Un dato duro es un hecho pasado y específico (cuándo, cuánto, con quién). Una opinión es un juicio general ("siempre es un caos"). Humo son los elogios, las promesas vagas y el "en el futuro".
6. Un compromiso es algo que ellos ponen en juego (tiempo, plata o reputación): aceptar la demo con sus productos reales, mandarte los productos, presentarte a alguien, pagar. Sin compromiso no hay avance.
7. Tono rioplatense (vos/tenés/podés), cálido, breve y natural. Sin emojis de colores, sin urgencia falsa, sin tecnicismos.
8. Sé honesto sobre por qué escribís: estás armando algo para comercios como el suyo y querés entender cómo trabajan. No finjas ser un cliente ni un curioso sin interés.
</reglas_mom_test>`;

type FichaParaPrompt = Pick<
  FichaDigital,
  | "nombreDueño"
  | "dolorTags"
  | "tieneWeb"
  | "usaCatalogoNativoWhatsapp"
  | "notasExtra"
  | "referenciaPosteo"
>;

export interface ContextoProspectoPrompt {
  prospecto: Pick<PotencialCliente, "nombre" | "rubro" | "estado">;
  ficha?: FichaParaPrompt;
}

function bloqueProspecto(ctx: ContextoProspectoPrompt): string {
  const f = ctx.ficha;
  const señales: string[] = [];
  if (f?.tieneWeb === "no") señales.push("No tiene web/catálogo online.");
  if (f?.tieneWeb === "caida_desactualizada")
    señales.push("Tiene web/catálogo, pero está caído o desactualizado.");
  if (f?.usaCatalogoNativoWhatsapp)
    señales.push("Usa el catálogo nativo de WhatsApp Business.");
  return `<prospecto>
- Comercio: ${ctx.prospecto.nombre}
- Rubro: ${ctx.prospecto.rubro || "No especificado"}
- Dueño/encargado: ${f?.nombreDueño || "No detectado"}
- Estado en el embudo: ${ctx.prospecto.estado}
- Lo que vi en su perfil (hipótesis mías, NO las des por ciertas ni las menciones como hechos): ${f?.dolorTags?.length ? f.dolorTags.join(", ") : "nada cargado"}${señales.length ? ` · ${señales.join(" ")}` : ""}
- Posteo/historia puntual que vi: ${f?.referenciaPosteo || "No especificado"}
- Notas: ${f?.notasExtra || "Ninguna"}
</prospecto>`;
}

/** ③ ABRIR — el primer mensaje: conversación de descubrimiento, nunca venta. */
export function generarPromptApertura(ctx: ContextoProspectoPrompt): string {
  return `<rol>
Ayudás a redactar el PRIMER mensaje de una conversación de descubrimiento (método "The Mom Test") con el dueño de un comercio. No es un mensaje de venta: el único objetivo es que responda contándote cómo trabaja hoy.
</rol>

${REGLAS_MOM_TEST}

${bloqueProspecto(ctx)}

<que_devolver>
Solo el mensaje, listo para copiar y pegar, sin explicaciones alrededor. Máximo 70 palabras, con esta forma:
1. Saludo con su nombre (si lo hay) y UNA observación específica y verdadera sobre su comercio, basada en el posteo/historia de arriba. Si no hay referencia, no inventes ninguna: saludá simple.
2. UNA pregunta abierta sobre cómo resuelven HOY una situación concreta de su día a día (sin mencionar ningún producto y sin ofrecer opciones).
3. Un cierre corto y amable.
</que_devolver>`;
}

export interface ContextoSeguimientoPrompt extends ContextoProspectoPrompt {
  historial: string;
  /** Línea tipo "3 mensajes tuyos · último hace 2 días". */
  resumen: string;
  /** Cuántos mensajes míos van sin que responda (incluye la apertura). */
  enviadosSinRespuesta: number;
  /** Si lo que toca es cumplir algo acordado (mandar la demo, el pack…). */
  accionAcordada?: string;
}

/** ② SEGUIR — volver a escribir sin presión. */
export function generarPromptSeguimiento(
  ctx: ContextoSeguimientoPrompt
): string {
  const tipo = ctx.accionAcordada
    ? `Lo que toca es CUMPLIR lo acordado: ${ctx.accionAcordada}. El mensaje acompaña la entrega y nada más.`
    : ctx.enviadosSinRespuesta <= 1
      ? "Es el primer seguimiento (pasaron unos 2 días desde tu mensaje). Retomá tu pregunta de otra forma, más fácil de contestar con una frase."
      : "Ya hubo más de un mensaje sin respuesta. Hacelo todavía más liviano y dejale una salida amable: si no es momento, no hay problema.";
  return `<rol>
Ayudás a redactar un mensaje de SEGUIMIENTO a alguien con quien ya hablaste (o a quien ya escribiste) en una conversación de descubrimiento (método "The Mom Test"). No es un mensaje de venta.
</rol>

${REGLAS_MOM_TEST}

${bloqueProspecto(ctx)}

<historial>
${ctx.resumen}
${ctx.historial}
</historial>

<situacion>
${tipo}
</situacion>

<que_devolver>
Solo el mensaje, listo para copiar y pegar. Máximo 50 palabras. No le reproches que no respondió, no metas urgencia y no menciones ningún producto salvo que ya esté acordado arriba. Si preguntás algo, que sea UNA sola cosa y abierta.
</que_devolver>`;
}

export interface ContextoResponderPrompt extends ContextoProspectoPrompt {
  historial: string;
  resumen: string;
  aprendizaje: Aprendizaje;
  /** Lo que acaba de escribir (o "en qué quedamos", pegado por el usuario). */
  loQueEscribio: string;
}

const ACCIONES = ACCIONES_PROXIMO_PASO.join(" | ");
const TIPOS = TIPOS_DATO.join(" | ");

/** ① RESPONDER — leer lo que dijo con ojos de Mom Test y devolver: borrador + lo aprendido + próximo paso. */
export function generarPromptResponder(ctx: ContextoResponderPrompt): string {
  const falta = faltaAprender(ctx.aprendizaje);
  const etapa =
    falta.length > 0
      ? `TODAVÍA NO PROPONGAS NADA (ni demo, ni pack, ni producto). Tu próxima pregunta tiene que ir por lo que falta saber: ${falta.join("; ")}. Empezá por lo primero de esa lista.`
      : "Ya hay base suficiente (caso concreto, cómo lo resuelve y costo). Podés proponer el paso siguiente — una demo con sus productos reales, sin costo — pidiendo un compromiso claro (por ejemplo, que te mande 5 productos). Sé transparente: recién ahora contás qué armás.";
  const sabido = Object.entries(ctx.aprendizaje)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  return `<rol>
Sos un coach de descubrimiento de clientes (método "The Mom Test"). Leés lo que respondió el dueño de un comercio con ojos críticos, y devolvés qué aprendiste, cómo contestarle y qué sigue.
</rol>

${REGLAS_MOM_TEST}

${bloqueProspecto(ctx)}

<historial>
${ctx.resumen}
${ctx.historial}
</historial>

<lo_que_ya_sabemos>
${sabido || "Todavía nada anotado."}
</lo_que_ya_sabemos>

<lo_que_escribio_ahora>
${ctx.loQueEscribio}
</lo_que_escribio_ahora>

<etapa>
${etapa}
</etapa>

<que_devolver>
Devolvé ÚNICAMENTE un objeto JSON válido (sin texto antes ni después, sin bloques de código) con esta estructura. Omití las claves de "aprendizaje" que no puedas completar con lo que dijo — no inventes nada:
{
  "lectura": "1-2 frases: qué dijo realmente, sin adornos",
  "tipoDato": "${TIPOS}",
  "borradorRespuesta": "El mensaje de respuesta listo para copiar (máx. 60 palabras, UNA sola pregunta, respetando las reglas)",
  "aprendizaje": {
    "citaDolor": "Su frase literal sobre el problema, entre comillas si es textual",
    "casoPasado": "La última vez concreta que le pasó",
    "comoLoResuelve": "Cómo lo resuelve hoy",
    "costo": "Cuánto le cuesta en tiempo o plata",
    "tipoDato": "${TIPOS}",
    "compromiso": "Qué puso en juego (si no puso nada, omitilo)"
  },
  "proximoPaso": { "accion": "${ACCIONES}", "dias": 2, "nota": "opcional" }
}
"proximoPaso.dias" es en cuántos días toca retomar (0 = hoy).
</que_devolver>`;
}

export interface ContextoCalificarPrompt {
  /** Nombres EXACTOS de las etiquetas de dolor del catálogo. */
  etiquetasDolor: string[];
  /** Lo que se copió del/de los perfil(es): bio, posteos, historias, notas. */
  infoPegada: string;
  /** 5.° Filtro Dinámico según el rubro del Sprint (opcional) */
  filtroDinamico?: {
    clave: string;
    nombreRubro: string;
    descripcion: string;
  };
}

/** ④ REPONER — de la info cruda de un perfil a una ficha calificada con filtros universales + dinámico de rubro. */
export function generarPromptCalificar(ctx: ContextoCalificarPrompt): string {
  const bloqueDinamico = ctx.filtroDinamico
    ? `\nCapa 2: El 5.° Filtro Dinámico de Rubro (${ctx.filtroDinamico.nombreRubro}):
- ${ctx.filtroDinamico.clave}: ${ctx.filtroDinamico.descripcion}`
    : "";

  const ejemploFiltros = ctx.filtroDinamico
    ? `["pulso_comercial_activo", "complejidad_de_datos", "${ctx.filtroDinamico.clave}"]`
    : `["pulso_comercial_activo", "complejidad_de_datos", "friccion_operativa_visible"]`;

  return `<rol>
Ayudás a calificar comercios para prospección (auditoría exprés de 2 minutos): a partir de lo que se copió de sus perfiles, armás la ficha y decidís si califican según indicadores objetivos de validación.
</rol>

<filtros_de_calificacion>
Capa 1: Los 4 Filtros Universales (Fijos en todos los ciclos):
1. pulso_comercial_activo (Filtro Anti-Fantasmas): Tiene actividad real reciente (posteos en los últimos 30–60 días, reseñas nuevas en Google Maps, flota de reparto o local con movimiento). Evita perder tiempo con comercios cerrados o de subsistencia mínima.
2. complejidad_de_datos (Filtro de Volumen): Maneja una cantidad significativa de artículos (SKUs), insumos, combinaciones de recetas, múltiples listas de proveedores o cuentas corrientes (fiados/acopios) que generan trabajo administrativo repetitivo.
3. friccion_operativa_visible (Filtro de Desorden Manual): Muestra señales de procesos manuales en sus canales: toma pedidos o presupuestos por WhatsApp a mano, tiene web en mantenimiento/desactualizada, publica listas en fotos/PDF o aclara demoras en entregas y cotizaciones.
4. espalda_o_escala (Filtro de Capacidad de Pago): Tiene más de un local/sucursal, depósito propio, venta mayorista/a empresas, vehículos de reparto o estructura de empleados. Garantiza que tienen flujo de caja para pagar un servicio sin regatear cada peso.${bloqueDinamico}

REGLA DE DECISIÓN OBLIGATORIA:
Un comercio CALIFICA ("califica": true) si cumple "pulso_comercial_activo" + al menos 2 filtros más entre los universales y el filtro específico del rubro.
Si no cumple "pulso_comercial_activo", o no suma al menos 3 filtros en total, debe asignarse "califica": false.
</filtros_de_calificacion>

<etiquetas_de_dolor_disponibles>
Usá SOLO estos nombres, escritos exactamente igual (o dejá la lista vacía):
${ctx.etiquetasDolor.length ? ctx.etiquetasDolor.map((e) => `- ${e}`).join("\n") : "- (no hay etiquetas cargadas)"}
</etiquetas_de_dolor_disponibles>

<info_de_los_comercios>
${ctx.infoPegada}
</info_de_los_comercios>

<que_devolver>
Devolvé ÚNICAMENTE un objeto JSON válido (sin texto antes ni después, sin bloques de código), con un elemento por cada comercio de arriba. Omití lo que no puedas saber — no inventes nombres del dueño, usuarios ni teléfonos:
{
  "prospectos": [
    {
      "nombre": "Nombre del comercio",
      "rubro": "Ferretería / Rubro del comercio",
      "instagram": "usuario_sin_arroba",
      "whatsapp": "+54...",
      "nombreDueño": "Si figura",
      "dolorTags": ["etiqueta exacta de la lista"],
      "tieneWeb": "no | caida_desactualizada | activa",
      "usaCatalogoNativoWhatsapp": false,
      "referenciaPosteo": "Qué posteo/historia sirve de gancho",
      "notasExtra": "Cualquier detalle útil",
      "filtrosQueCumple": ${ejemploFiltros},
      "califica": true
    }
  ]
}
"califica" es true solo si cumple pulso_comercial_activo + al menos 2 filtros más.
</que_devolver>`;
}
