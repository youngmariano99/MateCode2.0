import { z } from "zod";

// ============================================================================
// Configuración de Oficina — una sola fila (id fijo), sincronizada entre
// dispositivos. El contador `segundosDesdePausa` acumula el tiempo trabajado
// ENTRE sesiones desde la última pausa activa (hecha o salteada): tres
// sesiones de 25 min tienen que disparar una pausa configurada a 60, no
// ninguna. Se reinicia en cuanto se hace o se saltea una pausa.
// ============================================================================

export const ID_CONFIGURACION_OFICINA = "oficina";

export interface ConfiguracionOficina {
  id: string;
  /** Cada cuántos minutos de trabajo toca una pausa activa. 0 = desactivado. */
  intervaloPausaMin: number;
  /** Si está activo, al tocar la pausa se propone una rutina al azar (igual se puede elegir otra o saltear). */
  pausaAlAzar: boolean;
  segundosDesdePausa: number;
  actualizadoEn: number;
}

export const CONFIGURACION_OFICINA_DEFAULT: Omit<
  ConfiguracionOficina,
  "actualizadoEn"
> = {
  id: ID_CONFIGURACION_OFICINA,
  intervaloPausaMin: 0,
  pausaAlAzar: false,
  segundosDesdePausa: 0,
};

export const guardarConfiguracionOficinaSchema = z.object({
  intervaloPausaMin: z
    .number()
    .int("Ingresá minutos enteros.")
    .min(0, "No puede ser negativo.")
    .max(480, "Máximo 480 minutos."),
  pausaAlAzar: z.boolean(),
});
export type GuardarConfiguracionOficinaInput = z.input<
  typeof guardarConfiguracionOficinaSchema
>;

/** ¿Ya toca una pausa activa, dado el tiempo acumulado + el tramo que está corriendo ahora? */
export function tocaPausaActiva(
  config: Pick<
    ConfiguracionOficina,
    "intervaloPausaMin" | "segundosDesdePausa"
  >,
  segundosTramoCorriendo: number
): boolean {
  if (config.intervaloPausaMin <= 0) return false;
  return (
    config.segundosDesdePausa + segundosTramoCorriendo >=
    config.intervaloPausaMin * 60
  );
}
