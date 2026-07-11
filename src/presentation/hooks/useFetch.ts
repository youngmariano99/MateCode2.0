import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";

export function useFetch<TData, TError = Error>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  options?: Omit<
    UseQueryOptions<TData, TError, TData, readonly unknown[]>,
    "queryKey" | "queryFn"
  >
): UseQueryResult<TData, TError> {
  return useQuery<TData, TError>({
    queryKey,
    queryFn,
    ...options,
  });
}
