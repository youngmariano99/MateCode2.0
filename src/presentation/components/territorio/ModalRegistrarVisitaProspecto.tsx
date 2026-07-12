"use client";

import React, { useState } from "react";
import { Input } from "../input";
import { Button } from "../button";
import { Icono } from "../icons";

interface ModalRegistrarVisitaProspectoProps {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar: (payload: {
    visitado: boolean;
    motivoNoVisita?: string;
    volverFecha?: string;
  }) => void;
  nombreProspecto: string;
}

export const ModalRegistrarVisitaProspecto: React.FC<
  ModalRegistrarVisitaProspectoProps
> = ({ abierto, onCerrar, onConfirmar, nombreProspecto }) => {
  const [visitado, setVisitado] = useState(true);
  const [motivo, setMotivo] = useState("");
  const [volverFecha, setVolverFecha] = useState("");

  if (!abierto) return null;

  const handleConfirmar = () => {
    onConfirmar({
      visitado,
      motivoNoVisita: !visitado ? motivo.trim() : undefined,
      volverFecha: volverFecha || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="animate-in zoom-in w-full max-w-md rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6 shadow-2xl duration-150">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
          <h3 className="font-mono text-base font-extrabold tracking-tight text-white">
            Registrar Visita a Campo
          </h3>
          <button
            onClick={onCerrar}
            className="p-1 text-zinc-500 hover:text-zinc-300"
          >
            <Icono.Close className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
            <b>Negocio:</b> {nombreProspecto}
          </div>

          {/* Toggle visited status */}
          <div className="flex rounded-xl border border-[#2A2A2E] bg-zinc-950 p-1">
            <button
              type="button"
              onClick={() => setVisitado(true)}
              className={`flex-1 rounded-lg py-2 text-center font-mono text-xs font-bold transition-all ${
                visitado
                  ? "bg-emerald-500 text-black shadow-lg"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              ✓ Visitado Exitosamente
            </button>
            <button
              type="button"
              onClick={() => setVisitado(false)}
              className={`flex-1 rounded-lg py-2 text-center font-mono text-xs font-bold transition-all ${
                !visitado
                  ? "bg-red-500 text-white shadow-lg"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              ✗ No Contactado / Cerrado
            </button>
          </div>

          {!visitado && (
            <div className="animate-in fade-in duration-200">
              <Input
                label="Motivo del contacto fallido"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej. Estaba cerrado / Dueño no se encontraba"
              />
            </div>
          )}

          <div>
            <Input
              label="Fecha tentativa para volver (Opcional)"
              type="date"
              value={volverFecha}
              onChange={(e) => setVolverFecha(e.target.value)}
            />
          </div>

          <div className="mt-4 flex justify-end gap-3 border-t border-[#2A2A2E] pt-4">
            <button
              onClick={onCerrar}
              className="rounded-xl bg-zinc-800 px-4 py-2.5 font-mono text-xs font-bold text-zinc-100 transition-all hover:bg-zinc-700"
            >
              Cancelar
            </button>
            <Button onClick={handleConfirmar}>Guardar Registro</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
