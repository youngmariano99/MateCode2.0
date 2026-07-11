import { useAuth } from "../providers/AuthProvider";

export const usePermisos = () => {
  const { tienePermiso, usuario } = useAuth();
  return {
    tienePermiso,
    permisos: usuario?.permisos || [],
  };
};
