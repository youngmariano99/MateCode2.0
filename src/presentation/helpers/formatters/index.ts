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
