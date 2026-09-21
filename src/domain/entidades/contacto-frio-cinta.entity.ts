import type {
  Aprendizaje,
  IntentoContacto,
  PotencialCliente,
} from "./contacto-frio.entity";

// ============================================================================
// La cinta de producción de contacto en frío — lógica pura (sin acceso a DB):
// dado un prospecto y sus intentos, dice de quién es la pelota, cuántas veces
// se le escribió, hace cuánto y cuándo toca volver a hablarle. De ahí salen
// las 4 estaciones: ① Responder, ② Seguir, ③ Abrir, ④ Reponer.
// ============================================================================

const DIA_MS = 86_400_000;

/** Días hasta volver a escribir: después de la apertura, 2 (48 h); después de cada seguimiento, 7. */
export const DIAS_HASTA_PRIMER_SEGUIMIENTO = 2;
export const DIAS_ENTRE_SEGUIMIENTOS = 7;

export function inicioDelDia(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function sumarDiasMs(ms: number, dias: number): number {
  return inicioDelDia(ms) + dias * DIA_MS;
}

/** Mensaje mío. */
export function esEnvio(i: Pick<IntentoContacto, "mensajeEnviado">): boolean {
  return !!i.mensajeEnviado && i.mensajeEnviado.trim() !== "";
}

/** Algo que llegó de ellos (respuesta, pedido de info o rechazo). */
export function esRecepcion(i: Pick<IntentoContacto, "resultado">): boolean {
  return (
    i.resultado === "Respondió" ||
    i.resultado === "Pidió más info" ||
    i.resultado === "Rechazó"
  );
}

export type Pelota = "nuevo" | "mia" | "suya" | "cerrado";

export interface ResumenProspecto {
  prospecto: PotencialCliente;
  intentos: IntentoContacto[];
  /** Mensajes míos en total (aperturas + seguimientos + respuestas + demo…). */
  totalEnviados: number;
  /** Mensajes míos desde la última vez que ellos escribieron (o desde siempre, si nunca respondieron). */
  enviadosSinRespuesta: number;
  ultimoEnvioEn?: number;
  ultimaRecepcionEn?: number;
  pelota: Pelota;
  /** Cuándo toca volver a hablarle (ms, inicio de ese día). Vacío si no hay nada programado. */
  siguienteToque?: number;
  /** ¿Toca hoy o ya se pasó? */
  tocaHoy: boolean;
  /** Días de atraso (0 = hoy, >0 = pasado). Vacío si aún no toca. */
  diasDeAtraso?: number;
}

export function resumirProspecto(
  prospecto: PotencialCliente,
  intentos: IntentoContacto[],
  ahoraMs: number
): ResumenProspecto {
  const ordenados = [...intentos].sort((a, b) => a.fecha - b.fecha);
  const enviados = ordenados.filter(esEnvio);
  const recibidos = ordenados.filter(esRecepcion);
  const ultimoEnvio = enviados[enviados.length - 1];
  const ultimaRecepcion = recibidos[recibidos.length - 1];
  const corteRespuesta = ultimaRecepcion?.fecha ?? 0;
  const enviadosSinRespuesta = enviados.filter(
    (e) => e.fecha > corteRespuesta
  ).length;

  let pelota: Pelota;
  if (
    prospecto.estado === "Rechazado" ||
    prospecto.estado === "Cliente Cerrado"
  ) {
    pelota = "cerrado";
  } else if (
    ultimaRecepcion &&
    (!ultimoEnvio || ultimaRecepcion.fecha > ultimoEnvio.fecha)
  ) {
    pelota = "mia";
  } else if (!ultimoEnvio && !ultimaRecepcion) {
    pelota = "nuevo";
  } else {
    pelota = "suya";
  }

  let siguienteToque: number | undefined;
  if (prospecto.proximoPasoFecha !== undefined) {
    siguienteToque = inicioDelDia(prospecto.proximoPasoFecha);
  } else if (pelota === "suya" && ultimoEnvio) {
    siguienteToque = sumarDiasMs(
      ultimoEnvio.fecha,
      enviadosSinRespuesta <= 1
        ? DIAS_HASTA_PRIMER_SEGUIMIENTO
        : DIAS_ENTRE_SEGUIMIENTOS
    );
  }

  const hoy = inicioDelDia(ahoraMs);
  const tocaHoy = siguienteToque !== undefined && siguienteToque <= hoy;
  return {
    prospecto,
    intentos: ordenados,
    totalEnviados: enviados.length,
    enviadosSinRespuesta,
    ultimoEnvioEn: ultimoEnvio?.fecha,
    ultimaRecepcionEn: ultimaRecepcion?.fecha,
    pelota,
    siguienteToque,
    tocaHoy,
    diasDeAtraso:
      tocaHoy && siguienteToque !== undefined
        ? Math.round((hoy - siguienteToque) / DIA_MS)
        : undefined,
  };
}

export interface Cinta {
  /** ① Te escribieron y todavía no les contestaste. */
  responder: ResumenProspecto[];
  /** ② Les escribiste y ya toca volver a hablarles (o hay algo acordado para hoy). */
  seguir: ResumenProspecto[];
  /** ② (en espera) Les escribiste y todavía no toca — siempre a la vista, con cuántas veces y hace cuánto. */
  esperando: ResumenProspecto[];
  /** ③ Prospectos nuevos, todavía sin abrir. */
  abrir: PotencialCliente[];
}

export function armarCinta(
  prospectos: PotencialCliente[],
  intentos: IntentoContacto[],
  ahoraMs: number
): Cinta {
  const porProspecto = new Map<string, IntentoContacto[]>();
  for (const i of intentos) {
    const lista = porProspecto.get(i.potencialClienteId) ?? [];
    lista.push(i);
    porProspecto.set(i.potencialClienteId, lista);
  }

  const vivos = prospectos.filter((p) => !p.esHistoricoLegacy);
  const resumenes = vivos
    .filter((p) => p.estado !== "Nuevo")
    .map((p) => resumirProspecto(p, porProspecto.get(p.id) ?? [], ahoraMs))
    .filter((r) => r.pelota !== "cerrado" && r.pelota !== "nuevo");

  const responder = resumenes
    .filter(
      (r) => r.pelota === "mia" && r.prospecto.proximoPasoFecha === undefined
    )
    .sort((a, b) => (a.ultimaRecepcionEn ?? 0) - (b.ultimaRecepcionEn ?? 0));
  const idsResponder = new Set(responder.map((r) => r.prospecto.id));
  const resto = resumenes.filter((r) => !idsResponder.has(r.prospecto.id));

  const porToque = (a: ResumenProspecto, b: ResumenProspecto) =>
    (a.siguienteToque ?? Number.MAX_SAFE_INTEGER) -
    (b.siguienteToque ?? Number.MAX_SAFE_INTEGER);

  return {
    responder,
    seguir: resto.filter((r) => r.tocaHoy).sort(porToque),
    esperando: resto.filter((r) => !r.tocaHoy).sort(porToque),
    abrir: vivos
      .filter((p) => p.estado === "Nuevo")
      .sort((a, b) => a.creadoEn - b.creadoEn),
  };
}

/** "hoy" / "hace 3 días" / "en 2 días" para mostrar cuándo pasó o cuándo toca. */
export function textoRelativoDias(ms: number, ahoraMs: number): string {
  const dif = Math.round((inicioDelDia(ms) - inicioDelDia(ahoraMs)) / DIA_MS);
  if (dif === 0) return "hoy";
  if (dif === -1) return "ayer";
  if (dif === 1) return "mañana";
  return dif < 0 ? `hace ${-dif} días` : `en ${dif} días`;
}

/** Resumen de una línea para la lista: "3 mensajes tuyos · último hace 2 días · toca hoy". */
export function lineaDeSeguimiento(
  r: ResumenProspecto,
  ahoraMs: number
): string {
  const partes: string[] = [];
  partes.push(
    r.totalEnviados === 1
      ? "1 mensaje tuyo"
      : `${r.totalEnviados} mensajes tuyos`
  );
  if (r.ultimoEnvioEn !== undefined) {
    partes.push(`último ${textoRelativoDias(r.ultimoEnvioEn, ahoraMs)}`);
  }
  if (r.siguienteToque !== undefined) {
    partes.push(
      r.tocaHoy
        ? r.diasDeAtraso && r.diasDeAtraso > 0
          ? `toca desde ${textoRelativoDias(r.siguienteToque, ahoraMs)}`
          : "toca hoy"
        : `toca ${textoRelativoDias(r.siguienteToque, ahoraMs)}`
    );
  }
  return partes.join(" · ");
}

function fechaCorta(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Historial en texto para pegarle a una IA: cada mensaje con fecha, quién lo
 * dijo y de qué tipo, del más viejo al más nuevo. Se recortan los mensajes
 * largos y solo van los últimos `max` para que el prompt siga siendo corto.
 */
export function historialParaPrompt(
  intentos: IntentoContacto[],
  max = 12
): string {
  const ordenados = [...intentos].sort((a, b) => a.fecha - b.fecha);
  const lineas: string[] = [];
  for (const i of ordenados) {
    const recortar = (t: string) =>
      t.length > 500 ? `${t.slice(0, 500)}…` : t;
    if (esEnvio(i)) {
      lineas.push(
        `[${fechaCorta(i.fecha)} · yo${i.tipoEnvio ? ` · ${i.tipoEnvio}` : ""} · ${i.canal}] ${recortar(i.mensajeEnviado!)}`
      );
    }
    if (esRecepcion(i) && i.respuestaTexto?.trim()) {
      lineas.push(
        `[${fechaCorta(i.fecha)} · ellos · ${i.canal}] ${recortar(i.respuestaTexto)}`
      );
    } else if (i.resultado === "Visto sin responder") {
      lineas.push(`[${fechaCorta(i.fecha)} · visto sin responder]`);
    }
  }
  return lineas.length > 0
    ? lineas.slice(-max).join("\n")
    : "Todavía no hubo ningún mensaje.";
}

/** Junta lo aprendido en todos los intercambios: para cada campo, lo más reciente que se haya anotado. */
export function aprendizajeAcumulado(intentos: IntentoContacto[]): Aprendizaje {
  const acumulado: Aprendizaje = {};
  const ordenados = [...intentos].sort((a, b) => a.fecha - b.fecha);
  for (const i of ordenados) {
    const a = i.aprendizaje;
    if (!a) continue;
    for (const clave of Object.keys(a) as (keyof Aprendizaje)[]) {
      const valor = a[clave];
      if (valor !== undefined && valor !== "") {
        (acumulado as Record<string, unknown>)[clave] = valor;
      }
    }
  }
  return acumulado;
}

/** Lo que todavía falta saber antes de proponer nada: caso pasado, cómo lo resuelve hoy y cuánto le cuesta. */
export function faltaAprender(a: Aprendizaje): string[] {
  const faltantes: string[] = [];
  if (!a.casoPasado)
    faltantes.push("un caso concreto de la última vez que le pasó");
  if (!a.comoLoResuelve) faltantes.push("cómo lo resuelve hoy");
  if (!a.costo) faltantes.push("cuánto le cuesta (tiempo o plata)");
  return faltantes;
}
