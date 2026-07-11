import { create } from "zustand";

interface ConfiguracionState {
  idioma: string;
  formatoFecha: string;
  formatoMoneda: string;
  zonaHoraria: string;
  setIdioma: (idioma: string) => void;
  setFormatoFecha: (formatoFecha: string) => void;
  setFormatoMoneda: (formatoMoneda: string) => void;
  setZonaHoraria: (zonaHoraria: string) => void;
}

export const useConfiguracionStore = create<ConfiguracionState>((set) => ({
  idioma: "es",
  formatoFecha: "DD/MM/YYYY",
  formatoMoneda: "ARS",
  zonaHoraria: "America/Argentina/Buenos_Aires",
  setIdioma: (idioma) => set({ idioma }),
  setFormatoFecha: (formatoFecha) => set({ formatoFecha }),
  setFormatoMoneda: (formatoMoneda) => set({ formatoMoneda }),
  setZonaHoraria: (zonaHoraria) => set({ zonaHoraria }),
}));
