import { useAuth } from "../providers/AuthProvider";

export const useRol = () => {
  const { usuario } = useAuth();
  return {
    rol: usuario?.rol || null,
  };
};
