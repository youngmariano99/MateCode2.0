import { useState } from "react";
import { useDebounce } from "./useDebounce";

export function useBusqueda(valorInicial = "", delay = 350) {
  const [query, setQuery] = useState(valorInicial);
  const debouncedQuery = useDebounce(query, delay);

  return {
    query,
    setQuery,
    debouncedQuery,
  };
}
