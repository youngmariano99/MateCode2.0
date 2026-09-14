const MAX_CHARS_LOG_REINTENTO = 4000;
const PATRON_LINEA_RELEVANTE =
  /error|fail|✗|✖|expected|received|\bat\s+\S+\.(ts|tsx|js|jsx):\d+/i;

/**
 * Recorta un log de build/lint/test crudo a las líneas que probablemente
 * importan para que la IA corrija el error, antes de reinyectarlo en el
 * prompt de un reintento — mismo criterio que aplica un humano a mano
 * (pega el error puntual, no la consola entera). El log COMPLETO se sigue
 * guardando sin tocar en el checkpoint (ultimoErrorLogs) para revisión
 * humana si el ticket termina pausado; este recorte es solo para lo que se
 * le manda de vuelta a la IA, que era lo que inflaba el costo de cada
 * reintento con contexto fresco (no cacheado) y en gran parte irrelevante.
 */
export function recortarLogParaReintento(logCompleto: string): string {
  if (!logCompleto || logCompleto.length <= MAX_CHARS_LOG_REINTENTO) {
    return logCompleto;
  }

  const lineas = logCompleto.split("\n");
  const relevantes = lineas.filter((l) => PATRON_LINEA_RELEVANTE.test(l));
  // Si el filtro no encontró nada reconocible (formato de log inesperado),
  // nos quedamos con el final del log — build/lint/test suelen imprimir el
  // resumen del fallo al final, no al principio.
  let recortado =
    relevantes.length > 0
      ? relevantes.join("\n")
      : lineas.slice(-150).join("\n");

  if (recortado.length > MAX_CHARS_LOG_REINTENTO) {
    recortado = recortado.slice(recortado.length - MAX_CHARS_LOG_REINTENTO);
  }

  const lineasOmitidas = lineas.length - recortado.split("\n").length;
  return `(log recortado a las líneas con error/fallo — ${lineasOmitidas} líneas omitidas del original)\n${recortado}`;
}
