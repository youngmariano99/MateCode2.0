"use client";

import React, { useState } from "react";
import { Icono } from "../icons";
import { Select } from "../select";

interface ModalRegistrarContactoProps {
  abierto: boolean;
  onCerrar: () => void;
  nombreProspecto: string;
  onConfirmar: (resultado: {
    canal: "whatsapp" | "email" | "instagram" | "facebook";
    estado: "Contactado" | "Respondido" | "Sin Interés";
    notas: string;
  }) => void;
}

export const ModalRegistrarContacto: React.FC<ModalRegistrarContactoProps> = ({
  abierto,
  onCerrar,
  nombreProspecto,
  onConfirmar,
}) => {
  const [canal, setCanal] = useState<
    "whatsapp" | "email" | "instagram" | "facebook"
  >("whatsapp");
  const [estado, setEstado] = useState<
    "Contactado" | "Respondido" | "Sin Interés"
  >("Contactado");
  const [notas, setNotas] = useState("");

  if (!abierto) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmar({
      canal,
      estado,
      notas: notas.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="animate-in zoom-in w-full max-w-md rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6 shadow-2xl duration-150"
      >
        <div className="mb-4 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
          <h3 className="font-mono text-sm font-extrabold tracking-tight text-white uppercase">
            Registrar Contacto Digital
          </h3>
          <button
            type="button"
            onClick={onCerrar}
            className="p-1 text-zinc-500 hover:text-zinc-300"
          >
            <Icono.Close className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 font-mono text-[11px] text-zinc-400">
          Registrando acción comercial en frío para:{" "}
          <b className="text-zinc-100">{nombreProspecto}</b>
        </p>

        <div className="flex flex-col gap-4">
          <Select
            label="Canal Utilizado"
            options={[
              { value: "whatsapp", label: "💬 WhatsApp" },
              { value: "instagram", label: "📸 Instagram" },
              { value: "facebook", label: "📘 Facebook" },
              { value: "email", label: "✉️ Correo Electrónico" },
            ]}
            value={canal}
            onChange={(val) => setCanal(val as typeof canal)}
          />

          <Select
            label="Nuevo Estado del Prospecto"
            options={[
              { value: "Contactado", label: "✉️ Contactado (Mensaje Enviado)" },
              {
                value: "Respondido",
                label: "💬 Respondido (Interés / Conversación)",
              },
              { value: "Sin Interés", label: "❌ Sin Interés" },
            ]}
            value={estado}
            onChange={(val) => setEstado(val as typeof estado)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] font-bold text-zinc-400 uppercase">
              Notas / Comentarios de la conversación
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej. Me pidió que le mande la propuesta formal por mail mañana..."
              rows={4}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-100 placeholder-zinc-700 transition-all focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-[#2A2A2E] pt-4">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl bg-zinc-800 px-4 py-2.5 font-mono text-xs font-bold text-zinc-100 transition-all hover:bg-zinc-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-xl bg-emerald-500 px-5 py-2.5 font-mono text-xs font-bold text-black transition-all hover:bg-emerald-600 active:scale-95"
          >
            Guardar Historial
          </button>
        </div>
      </form>
    </div>
  );
};
