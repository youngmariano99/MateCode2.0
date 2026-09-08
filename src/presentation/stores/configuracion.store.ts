import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ConfiguracionState {
  idioma: string;
  formatoFecha: string;
  formatoMoneda: string;
  zonaHoraria: string;
  /** Objetivo diario de contactos en frío a enviar (estación "Hoy"). */
  objetivoDiarioContactos: number;
  setIdioma: (idioma: string) => void;
  setFormatoFecha: (formatoFecha: string) => void;
  setFormatoMoneda: (formatoMoneda: string) => void;
  setZonaHoraria: (zonaHoraria: string) => void;
  setObjetivoDiarioContactos: (objetivo: number) => void;
}

export const useConfiguracionStore = create<ConfiguracionState>()(
  persist(
    (set) => ({
      idioma: "es",
      formatoFecha: "DD/MM/YYYY",
      formatoMoneda: "ARS",
      zonaHoraria: "America/Argentina/Buenos_Aires",
      objetivoDiarioContactos: 3,
      setIdioma: (idioma) => set({ idioma }),
      setFormatoFecha: (formatoFecha) => set({ formatoFecha }),
      setFormatoMoneda: (formatoMoneda) => set({ formatoMoneda }),
      setZonaHoraria: (zonaHoraria) => set({ zonaHoraria }),
      setObjetivoDiarioContactos: (objetivoDiarioContactos) =>
        set({ objetivoDiarioContactos }),
    }),
    { name: "matecode-configuracion" }
  )
);
