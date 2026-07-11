import { useState, useCallback } from "react";

export function useFiltros<T extends Record<string, unknown>>(
  valoresIniciales: T
) {
  const [filtros, setFiltros] = useState<T>(valoresIniciales);

  const setFiltro = useCallback((key: keyof T, value: unknown) => {
    setFiltros((prev) => ({ ...prev, [key]: value }));
  }, []);

  const limpiarFiltros = useCallback(() => {
    setFiltros(valoresIniciales);
  }, [valoresIniciales]);

  return {
    filtros,
    setFiltro,
    limpiarFiltros,
  };
}
