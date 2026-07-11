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
  const [mostrarAviso, setMostrarAviso] = useState(false);

  const supabase = crearClienteBrowser();

  const cerrarSesion = useCallback(async () => {
    const logout = new LogoutUseCase();
    await logout.ejecutar();
    setSesion(null);
    setUsuario(null);
    setAgenciaActiva(null);
    setMostrarAviso(false);
  }, []);

  const renovarSesion = useCallback(async () => {
    await supabase.auth.getSession();
    setMostrarAviso(false);
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
          .single();

        if (userError || !userDb) {
          setUsuario({
            id: user.id,
            nombre:
              user.user_metadata?.nombre ||
              user.email?.split("@")[0] ||
              "Usuario",
            correo: user.email || "",
            rol: "Invitado",
            permisos: [],
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
          .single();

        const rolesData = userDb.roles as unknown as
          { nombre: string } | { nombre: string }[] | null;
        const rolNombre = Array.isArray(rolesData)
          ? rolesData[0]?.nombre
          : rolesData?.nombre;

        setUsuario({
          id: userDb.id,
          nombre: userDb.nombre,
          correo: userDb.correo,
          rol: rolNombre || "Invitado",
          permisos,
          agenciaId: userDb.agencia_id,
        });

        if (agenciaDb) {
          setAgenciaActiva({
            id: agenciaDb.id,
            nombreComercial: agenciaDb.nombre_comercial,
          });
        }
      } catch {
        // Fallback en caso de error
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

  useEffect(() => {
    if (!sesion) {
      if (mostrarAviso) {
        Promise.resolve().then(() => setMostrarAviso(false));
      }
      return;
    }

    let warningTimeout: NodeJS.Timeout;
    let logoutTimeout: NodeJS.Timeout;

    const resetTimer = () => {
      if (mostrarAviso) {
        Promise.resolve().then(() => setMostrarAviso(false));
      }
      clearTimeout(warningTimeout);
      clearTimeout(logoutTimeout);

      warningTimeout = setTimeout(
        () => {
          setMostrarAviso(true);
        },
        55 * 60 * 1000
      );

      logoutTimeout = setTimeout(
        () => {
          void cerrarSesion();
        },
        60 * 60 * 1000
      );
    };

    const eventos = ["mousemove", "keydown", "scroll", "click"];
    eventos.forEach((evento) => {
      window.addEventListener(evento, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(warningTimeout);
      clearTimeout(logoutTimeout);
      eventos.forEach((evento) => {
        window.removeEventListener(evento, resetTimer);
      });
    };
  }, [sesion, mostrarAviso, cerrarSesion]);

  const tienePermiso = (permisoKey: string) => {
    return usuario?.permisos.includes(permisoKey) || false;
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

      {mostrarAviso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center shadow-2xl">
            <h3 className="mb-2 text-xl font-bold text-zinc-100">
              Tu sesión está por finalizar
            </h3>
            <p className="mb-6 text-sm text-zinc-400">
              Has estado inactivo por un tiempo. Para mantener tu información
              segura, la sesión se cerrará pronto.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => void cerrarSesion()}
                className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-all hover:border-zinc-700"
              >
                Cerrar sesión
              </button>
              <button
                onClick={() => void renovarSesion()}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600"
              >
                Seguir trabajando
              </button>
            </div>
          </div>
        </div>
      )}
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
