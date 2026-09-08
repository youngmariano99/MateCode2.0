import { format } from "date-fns";
import { es } from "date-fns/locale";

export const formatearDinero = (monto: number, moneda = "ARS"): string => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(monto);
};

export const formatearFecha = (
  fecha: Date | string | number,
  patron = "dd/MM/yyyy"
): string => {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return "";
  return format(d, patron, { locale: es });
};

export const truncarTexto = (texto: string, maxLongitud = 60): string => {
  if (texto.length <= maxLongitud) return texto;
  return texto.substring(0, maxLongitud) + "...";
};

const ZONA_HORARIA_ARG = "America/Argentina/Buenos_Aires";

/** Fecha formateada en horario de Buenos Aires, ej. "07/03 14:20". */
export const formatearFechaBA = (fecha: Date | string | number): string => {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_HORARIA_ARG,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

/**
 * Cantidad de días transcurridos desde `fecha` hasta ahora (0 = hoy). Se usa
 * para el semáforo de seguimiento pendiente — el cálculo es en días
 * calendario, no horas exactas, así que compara contra medianoche de hoy.
 */
export const diasDesde = (fecha: Date | string | number): number => {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return 0;
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicioFecha = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round(
    (inicioHoy.getTime() - inicioFecha.getTime()) / (1000 * 60 * 60 * 24)
  );
};

/** Texto tipo "hace 3 días" / "hoy" / "ayer", para mostrar junto a la fecha. */
export const haceDiasTexto = (fecha: Date | string | number): string => {
  const dias = diasDesde(fecha);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
};
