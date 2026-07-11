import { create } from "zustand";

interface UsuarioSesion {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  avatarUrl?: string;
  permisos: string[];
}

interface AgenciaSesion {
  id: string;
  nombreComercial: string;
}

interface SesionState {
  usuario: UsuarioSesion | null;
  agenciaActiva: AgenciaSesion | null;
  setUsuario: (usuario: UsuarioSesion | null) => void;
  setAgenciaActiva: (agencia: AgenciaSesion | null) => void;
  limpiarSesion: () => void;
}

export const useSesionStore = create<SesionState>((set) => ({
  usuario: null,
  agenciaActiva: null,
  setUsuario: (usuario) => set({ usuario }),
  setAgenciaActiva: (agenciaActiva) => set({ agenciaActiva }),
  limpiarSesion: () => set({ usuario: null, agenciaActiva: null }),
}));
