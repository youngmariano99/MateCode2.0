import { useAuth } from "../providers/AuthProvider";

export const useAgencia = () => {
  const { agenciaActiva } = useAuth();
  return { agenciaActiva };
};
