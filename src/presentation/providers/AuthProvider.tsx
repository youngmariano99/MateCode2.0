"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { crearClienteBrowser } from "../../infrastructure/auth/client";
import { LogoutUseCase } from "../../application/casos-de-uso/autenticacion/logout.use-case";

export interface UsuarioPerfil {
  id: string;
  nombre: string;
  correo: string;
  avatarUrl?: string;
  rol: string;
  permisos: string[];
  agenciaId: string;
}

export interface AgenciaContext {
  id: string;
  nombreComercial: string;
}

interface AuthContextType {
  usuario: UsuarioPerfil | null;
  sesion: Session | null;
  agenciaActiva: AgenciaContext | null;
  cargando: boolean;
  online: boolean;
  tienePermiso: (permiso: string) => boolean;
  renovarSesion: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null);
  const [sesion, setSesion] = useState<Session | null>(null);
  const [agenciaActiva, setAgenciaActiva] = useState<AgenciaContext | null>(
    null
  );
  const [cargando, setCargando] = useState(true);
  const [online, setOnline] = useState(() => {
    if (typeof window !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });

  const supabase = crearClienteBrowser();

  const cerrarSesion = useCallback(async () => {
    const logout = new LogoutUseCase();
    await logout.ejecutar();
    setSesion(null);
    setUsuario(null);
    setAgenciaActiva(null);
  }, []);

  const renovarSesion = useCallback(async () => {
    await supabase.auth.getSession();
  }, [supabase]);

  const cargarPerfilUsuario = useCallback(
    async (user: User) => {
      try {
        const { data: userDb, error: userError } = await supabase
          .from("usuarios")
          .select(
            `
          id,
          nombre,
          correo,
          rol_id,
          agencia_id,
          roles (
            nombre
          )
        `
          )
          .eq("correo", user.email || "")
          .maybeSingle();

        if (userError || !userDb) {
          setUsuario({
            id: user.id,
            nombre:
              user.user_metadata?.nombre ||
              user.email?.split("@")[0] ||
              "Mariano",
            correo: user.email || "",
            rol: "Propietario",
            permisos: ["*"],
            agenciaId: "",
          });
          return;
        }

        const { data: permisosDb } = await supabase
          .from("roles_permisos")
          .select(
            `
          permisos (
            nombre
          )
        `
          )
          .eq("rol_id", userDb.rol_id);

        const permisos = (permisosDb || [])
          .map((p) => {
            const perm = p.permisos as unknown as
              { nombre: string } | { nombre: string }[] | null;
            return Array.isArray(perm) ? perm[0]?.nombre : perm?.nombre;
          })
          .filter((n): n is string => typeof n === "string");

        const { data: agenciaDb } = await supabase
          .from("agencias")
          .select("id, nombre_comercial")
          .eq("id", userDb.agencia_id)
          .maybeSingle();

        const rolesData = userDb.roles as unknown as
          { nombre: string } | { nombre: string }[] | null;
        const rolNombre = Array.isArray(rolesData)
          ? rolesData[0]?.nombre
          : rolesData?.nombre;

        setUsuario({
          id: userDb.id,
          nombre: userDb.nombre,
          correo: userDb.correo,
          rol: rolNombre || "Propietario",
          permisos: permisos.length > 0 ? permisos : ["*"],
          agenciaId: userDb.agencia_id,
        });

        if (agenciaDb) {
          setAgenciaActiva({
            id: agenciaDb.id,
            nombreComercial: agenciaDb.nombre_comercial,
          });
        }
      } catch {
        // Fallback en caso de error: mantener perfil Propietario con acceso irrestricto
        setUsuario({
          id: user.id,
          nombre:
            user.user_metadata?.nombre ||
            user.email?.split("@")[0] ||
            "Mariano",
          correo: user.email || "",
          rol: "Propietario",
          permisos: ["*"],
          agenciaId: "",
        });
      }
    },
    [supabase]
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session);
      if (session?.user) {
        cargarPerfilUsuario(session.user).finally(() => setCargando(false));
      } else {
        setCargando(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSesion(session);
      if (session?.user) {
        await cargarPerfilUsuario(session.user);
      } else {
        setUsuario(null);
        setAgenciaActiva(null);
      }
      setCargando(false);
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      subscription.unsubscribe();
    };
  }, [supabase, cargarPerfilUsuario]);

  const tienePermiso = (permisoKey: string) => {
    if (!usuario) return false;
    if (usuario.rol === "Propietario" || usuario.permisos.includes("*")) {
      return true;
    }
    return usuario.permisos.includes(permisoKey);
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        sesion,
        agenciaActiva,
        cargando,
        online,
        tienePermiso,
        renovarSesion,
        cerrarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
};
