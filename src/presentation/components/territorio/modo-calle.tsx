"use client";

import React from "react";
import { Card } from "../card";
import { Icono } from "../icons";

interface StopCalle {
  id: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  whatsapp?: string;
  latitud?: number;
  longitud?: number;
}

interface ModoCalleProps {
  paradas: StopCalle[];
  onRegistrarVisita: (p: StopCalle) => void;
  onNavegar: (p: StopCalle) => void;
}

export const ModoCalle: React.FC<ModoCalleProps> = ({
  paradas,
  onRegistrarVisita,
  onNavegar,
}) => {
  if (paradas.length === 0) {
    return (
      <Card>
        <span className="block py-6 text-center font-mono text-xs text-zinc-500 italic">
          No hay paradas en ruta activa. Calcula una ruta en el planificador.
        </span>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-emerald-500/20 bg-[#18181B] p-4">
        <h3 className="mb-1 font-mono text-xs font-bold tracking-wider text-emerald-400 uppercase">
          Modo Calle Activado (Optimizado para Celular)
        </h3>
        <p className="font-mono text-[10px] text-zinc-400">
          Navegación e interacciones rápidas de un toque durante el trabajo de
          campo.
        </p>
      </div>

      <div className="flex flex-col gap-3.5">
        {paradas.map((p, idx) => (
          <div
            key={p.id}
            className="flex flex-col gap-4 rounded-2xl border border-[#2A2A2E] bg-zinc-950 p-5 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="block font-mono text-[10px] font-bold text-zinc-500 uppercase">
                  Parada #{idx + 1}
                </span>
                <span className="mt-0.5 block font-mono text-sm font-extrabold text-white">
                  {p.nombre}
                </span>
                <span className="mt-1 block text-xs text-zinc-400">
                  {p.direccion || "Sin dirección física"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button
                onClick={() => onNavegar(p)}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 p-3 font-mono text-xs font-extrabold text-zinc-950 shadow-lg transition-all hover:bg-emerald-600"
              >
                <Icono.MapPin className="h-4 w-4" />
                Iniciar GPS
              </button>

              <button
                onClick={() => onRegistrarVisita(p)}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 p-3 font-mono text-xs font-extrabold text-white shadow-lg transition-all hover:bg-blue-600"
              >
                <Icono.Check className="h-4 w-4" />
                Registrar Visita
              </button>

              {p.whatsapp && (
                <a
                  href={`https://wa.me/${p.whatsapp
                    .replaceAll(" ", "")
                    .replaceAll("+", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3 font-mono text-xs font-extrabold text-zinc-300 shadow-lg transition-all hover:text-white"
                >
                  <Icono.Phone className="h-4 w-4" />
                  WhatsApp
                </a>
              )}

              {p.telefono && (
                <a
                  href={`tel:${p.telefono}`}
                  className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3 font-mono text-xs font-extrabold text-zinc-300 shadow-lg transition-all hover:text-white"
                >
                  <Icono.Phone className="h-4 w-4" />
                  Llamar
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
