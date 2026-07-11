import {
  useMutation as useQueryMutation,
  UseMutationOptions,
  UseMutationResult,
} from "@tanstack/react-query";

export function useMutation<TData, TError = Error, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TError, TVariables>
): UseMutationResult<TData, TError, TVariables> {
  return useQueryMutation<TData, TError, TVariables>({
    mutationFn,
    ...options,
  });
}
