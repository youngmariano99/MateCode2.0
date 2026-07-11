import { useAuth } from "../providers/AuthProvider";

export const useSesion = () => {
  const { sesion, renovarSesion, cerrarSesion } = useAuth();
  return { sesion, renovarSesion, cerrarSesion };
};
