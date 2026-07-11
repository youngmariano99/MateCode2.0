import { create } from "zustand";

interface ConexionState {
  online: boolean;
  setOnline: (val: boolean) => void;
}

export const useConexionStore = create<ConexionState>((set) => ({
  online: typeof window !== "undefined" ? window.navigator.onLine : true,
  setOnline: (online) => set({ online }),
}));
