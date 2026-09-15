"use client";

import React, { useState } from "react";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import {
  PreviewarAjusteFechaUseCase,
  AplicarAjusteFechaUseCase,
  type NivelConHijosFecha,
  type ItemPreviewAjusteFecha,
} from "../../../application/use-cases/personal/ajustar-fecha-personal.use-case";

const previewUseCase = new PreviewarAjusteFechaUseCase();
const aplicarUseCase = new AplicarAjusteFechaUseCase();

interface AjustarFechaModalProps {
  abierto: boolean;
  onCerrar: () => void;
  nivel: NivelConHijosFecha;
  id: string;
  titulo: string;
  fechaActual: string;
  onAjustado: () => void;
}

/**
 * Ajuste de fecha con preview obligatorio — nunca silencioso. Al elegir la
 * nueva fecha, se muestra qué hijos directos se ven afectados (con
 * conflicto marcado si su fecha actual ya supera la nueva fecha propuesta
 * del padre) ANTES de escribir nada; el usuario elige cuáles ajustar
 * también, con la fecha editable por fila.
 */
export const AjustarFechaModal: React.FC<AjustarFechaModalProps> = ({
  abierto,
  onCerrar,
  nivel,
  id,
  titulo,
  fechaActual,
  onAjustado,
}) => {
  const { mostrarToast } = useToast();
  const [nuevaFecha, setNuevaFecha] = useState(fechaActual);
  const [preview, setPreview] = useState<ItemPreviewAjusteFecha[] | null>(null);
  const [seleccionados, setSeleccionados] = useState<Record<string, string>>(
    {}
  );
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const verPreview = async () => {
    setCargando(true);
    const res = await previewUseCase.ejecutar(nivel, id, nuevaFecha);
    setCargando(false);
    if (!res.ok) {
      mostrarToast(res.error!.mensaje, "error");
      return;
    }
    setPreview(res.valor);
    // Los que tienen conflicto arrancan preseleccionados (son los que
    // realmente necesitan resolución), el resto queda sin tocar.
    const iniciales: Record<string, string> = {};
    for (const item of res.valor) {
      if (item.conflicto) iniciales[item.id] = nuevaFecha;
    }
    setSeleccionados(iniciales);
  };

  const toggleHijo = (itemId: string, fechaSugerida: string) => {
    setSeleccionados((prev) => {
      const copia = { ...prev };
      if (itemId in copia) delete copia[itemId];
      else copia[itemId] = fechaSugerida;
      return copia;
    });
  };

  const confirmar = async () => {
    setGuardando(true);
    const cambiosHijos = Object.entries(seleccionados).map(
      ([hijoId, fecha]) => ({
        id: hijoId,
        nuevaFecha: fecha,
      })
    );
    const res = await aplicarUseCase.ejecutar(
      nivel,
      id,
      nuevaFecha,
      cambiosHijos
    );
    setGuardando(false);
    if (res.ok) {
      mostrarToast("Fecha ajustada.", "exito");
      onAjustado();
      onCerrar();
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  return (
    <Dialog
      abierto={abierto}
      onClose={onCerrar}
      titulo={`Ajustar fecha de "${titulo}"`}
      maxWidth="lg"
      footer={
        preview ? (
          <>
            <button
              onClick={onCerrar}
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
            >
              Cancelar
            </button>
            <Button onClick={confirmar} cargando={guardando}>
              Confirmar ajuste
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
              Nueva fecha límite
            </span>
            <input
              type="date"
              value={nuevaFecha}
              onChange={(e) => {
                setNuevaFecha(e.target.value);
                setPreview(null);
              }}
              className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
          </div>
          {!preview && (
            <Button
              variant="outline"
              onClick={verPreview}
              cargando={cargando}
              disabled={nuevaFecha === fechaActual}
            >
              Ver qué afecta
            </Button>
          )}
        </div>

        {preview && preview.length === 0 && (
          <p className="text-sm text-zinc-500">
            No tiene nada debajo — se ajusta solo.
          </p>
        )}

        {preview && preview.length > 0 && (
          <>
            <p className="text-sm text-zinc-300">
              Esto afecta a {preview.length} elemento(s). Elegí cuáles ajustar
              también (los marcados en rojo ya vencían antes de la nueva fecha):
            </p>
            <div className="flex flex-col gap-1.5">
              {preview.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 ${
                    item.conflicto
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-[#2A2A2E] bg-[#0D0D0F]"
                  }`}
                >
                  <label className="flex items-center gap-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      checked={item.id in seleccionados}
                      onChange={() => toggleHijo(item.id, nuevaFecha)}
                      className="accent-emerald-500"
                    />
                    {item.titulo}
                    {item.conflicto && (
                      <span title="Su fecha actual ya supera la nueva fecha propuesta">
                        <Icono.Alert className="h-3.5 w-3.5 text-red-400" />
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>{item.fechaActual}</span>
                    {item.id in seleccionados && (
                      <>
                        <Icono.ArrowRight className="h-3 w-3" />
                        <input
                          type="date"
                          value={seleccionados[item.id]}
                          onChange={(e) =>
                            setSeleccionados((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          className="rounded border border-[#2A2A2E] bg-[#111113] px-1.5 py-0.5 text-xs text-zinc-200"
                        />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
};
