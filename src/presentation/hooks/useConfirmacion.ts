import { useState, useCallback } from "react";

interface ConfirmacionConfig {
  titulo: string;
  descripcion: string;
  onConfirm: () => void | Promise<void>;
  textoConfirmar?: string;
  textoCancelar?: string;
}

export function useConfirmacion() {
  const [mostrar, setMostrar] = useState(false);
  const [config, setConfig] = useState<ConfirmacionConfig | null>(null);

  const solicitarConfirmacion = useCallback(
    (nuevaConfig: ConfirmacionConfig) => {
      setConfig(nuevaConfig);
      setMostrar(true);
    },
    []
  );

  const confirmar = useCallback(async () => {
    if (config?.onConfirm) {
      await config.onConfirm();
    }
    setMostrar(false);
  }, [config]);

  const cancelar = useCallback(() => {
    setMostrar(false);
  }, []);

  return {
    mostrar,
    solicitarConfirmacion,
    confirmar,
    cancelar,
    config,
  };
}
