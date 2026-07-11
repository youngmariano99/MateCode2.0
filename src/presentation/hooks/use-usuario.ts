import { useAuth } from "../providers/AuthProvider";

export const useUsuario = () => {
  const { usuario } = useAuth();
  return { usuario };
};
