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
  /**
   * Si se pasa, después de parsear el JSON se muestra este resumen (en vez
   * de importar directo) con un botón "Confirmar e importar" — para poder
   * revisar que la IA armó bien la estructura antes de crear nada. Puede
   * tirar un Error (ej. si el resumen detecta que la forma no es la
   * esperada) para mostrarlo como el resto de los errores de este modal.
   * Si no se pasa, el comportamiento queda igual que antes (importa directo).
   */
  renderResumen?: (items: unknown[]) => React.ReactNode;
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
  renderResumen,
}) => {
  const [jsonTexto, setJsonTexto] = useState("");
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [importando, setImportando] = useState(false);
  const [itemsParaConfirmar, setItemsParaConfirmar] = useState<
    unknown[] | null
  >(null);

  const cerrarTodo = () => {
    setJsonTexto("");
    setItemsParaConfirmar(null);
    setError("");
    onCerrar();
  };

  const copiarPlantilla = async () => {
    await navigator.clipboard.writeText(plantillaEjemplo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const importar = async (items: unknown[]) => {
    setImportando(true);
    try {
      await onImportar(items);
      cerrarTodo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al importar.");
    } finally {
      setImportando(false);
    }
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
    if (renderResumen) {
      try {
        renderResumen(items);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "El JSON no tiene la forma esperada."
        );
        return;
      }
      setItemsParaConfirmar(items);
      return;
    }
    await importar(items);
  };

  return (
    <Dialog
      abierto={abierto}
      onClose={cerrarTodo}
      titulo={titulo}
      maxWidth="lg"
    >
      {itemsParaConfirmar ? (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-zinc-500">
            Revisá que quedó bien armado antes de crear nada — todavía no se
            guardó ningún cambio.
          </p>
          <div className="max-h-96 overflow-y-auto rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-3">
            {renderResumen!(itemsParaConfirmar)}
          </div>
          {error && <span className="text-xs text-red-400">{error}</span>}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setItemsParaConfirmar(null)}
              className="text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
            >
              Volver a editar
            </button>
            <Button
              onClick={() => importar(itemsParaConfirmar)}
              cargando={importando}
            >
              Confirmar e importar
            </Button>
          </div>
        </div>
      ) : (
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
            {renderResumen ? "Revisar" : "Importar"}
          </Button>
        </div>
      )}
    </Dialog>
  );
};
