import { useState, useCallback } from "react";

export function usePaginacion(paginaInicial = 1, registrosPorPagina = 8) {
  const [pagina, setPagina] = useState(paginaInicial);

  const irAPagina = useCallback((n: number) => {
    setPagina(n);
  }, []);

  const siguiente = useCallback(() => {
    setPagina((p) => p + 1);
  }, []);

  const anterior = useCallback(() => {
    setPagina((p) => Math.max(p - 1, 1));
  }, []);

  return {
    pagina,
    registrosPorPagina,
    irAPagina,
    siguiente,
    anterior,
  };
}
