/**
 * Comparación pura de last-write-wins por timestamp `actualizadoEn`. Sin
 * dependencias de Dexie ni de Drizzle para poder usarse tanto en el cliente
 * (ConflictService) como en las rutas de sync, que corren en el servidor.
 */
export function servidorTieneVersionMasNueva(
  actualizadoEnServidor: unknown,
  actualizadoEnEntrante: unknown
): boolean {
  if (actualizadoEnServidor === null || actualizadoEnServidor === undefined) {
    return false;
  }
  if (actualizadoEnEntrante === null || actualizadoEnEntrante === undefined) {
    return false;
  }
  const servidor = new Date(
    actualizadoEnServidor as string | number | Date
  ).getTime();
  const entrante = new Date(
    actualizadoEnEntrante as string | number | Date
  ).getTime();
  if (isNaN(servidor) || isNaN(entrante)) return false;
  return servidor > entrante;
}
