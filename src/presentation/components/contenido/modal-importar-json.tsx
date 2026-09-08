"use client";

import React, { useState } from "react";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { Textarea } from "../input";

interface ModalImportarJsonProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  /** JSON de ejemplo — botón "Copiar plantilla" para pasarle a una IA. */
  plantillaEjemplo: string;
  /** Recibe el array ya parseado; hace el guardado real y puede tirar error para mostrarlo. */
  onImportar: (items: unknown[]) => Promise<void>;
}

/**
 * Mismo mecanismo sirve para "crear desde cero con IA" (copiás la plantilla,
 * la IA te devuelve el JSON) y para "transformar contenido existente" (le
 * pasás el prompt de transformación, la respuesta se pega acá igual).
 */
export const ModalImportarJson: React.FC<ModalImportarJsonProps> = ({
  abierto,
  onCerrar,
  titulo,
  plantillaEjemplo,
  onImportar,
}) => {
  const [jsonTexto, setJsonTexto] = useState("");
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [importando, setImportando] = useState(false);

  const copiarPlantilla = async () => {
    await navigator.clipboard.writeText(plantillaEjemplo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const procesar = async () => {
    setError("");
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonTexto);
    } catch {
      setError("JSON inválido — revisá que esté bien copiado.");
      return;
    }
    const items = Array.isArray(parsed) ? parsed : [parsed];
    setImportando(true);
    try {
      await onImportar(items);
      setJsonTexto("");
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al importar.");
    } finally {
      setImportando(false);
    }
  };

  return (
    <Dialog abierto={abierto} onClose={onCerrar} titulo={titulo} maxWidth="lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Copiá la plantilla, pasásela a tu IA con lo que necesites, y pegá
            acá la respuesta.
          </p>
          <Button
            variant="outline"
            onClick={copiarPlantilla}
            className="shrink-0 px-3 py-1.5 text-xs"
          >
            {copiado ? "Copiado" : "Copiar plantilla"}
          </Button>
        </div>
        <Textarea
          label="Pegar JSON"
          value={jsonTexto}
          onChange={(e) => setJsonTexto(e.target.value)}
          rows={10}
          placeholder="[{ ... }]"
        />
        {error && <span className="text-xs text-red-400">{error}</span>}
        <Button
          onClick={procesar}
          cargando={importando}
          disabled={!jsonTexto.trim()}
          className="self-end"
        >
          Importar
        </Button>
      </div>
    </Dialog>
  );
};
