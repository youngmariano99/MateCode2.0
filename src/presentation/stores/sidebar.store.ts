import { create } from "zustand";

interface SidebarState {
  colapsado: boolean;
  setColapsado: (val: boolean) => void;
  toggleColapsado: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  colapsado: false,
  setColapsado: (colapsado) => set({ colapsado }),
  toggleColapsado: () => set((state) => ({ colapsado: !state.colapsado })),
}));
