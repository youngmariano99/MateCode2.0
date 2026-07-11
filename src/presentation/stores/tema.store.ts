import { create } from "zustand";

type Tema = "oscuro" | "claro";

interface TemaState {
  tema: Tema;
  toggleTema: () => void;
  setTema: (tema: Tema) => void;
}

export const useTemaStore = create<TemaState>((set) => ({
  tema: "oscuro",
  toggleTema: () =>
    set((state) => {
      const nuevo = state.tema === "oscuro" ? "claro" : "oscuro";
      if (typeof window !== "undefined") {
        localStorage.setItem("matecode-theme", nuevo);
      }
      return { tema: nuevo };
    }),
  setTema: (tema) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("matecode-theme", tema);
    }
    set({ tema });
  },
}));
