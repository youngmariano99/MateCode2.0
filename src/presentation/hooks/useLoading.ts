import { useLoadingContext } from "../providers/LoadingProvider";

export function useLoading() {
  const { mostrarLoading } = useLoadingContext();
  return {
    mostrarLoading,
  };
}
