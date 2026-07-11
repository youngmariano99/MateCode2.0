"use client";

import React from "react";
import { Card } from "../card";

interface MarkerCliente {
  id: string;
  nombre: string;
  latitud?: number;
  longitud?: number;
  estado: string;
  empresa?: string;
}

interface VisorMapaProps {
  clientes: MarkerCliente[];
  rutaPuntos?: { id: string; nombre: string }[];
}

export const VisorMapa: React.FC<VisorMapaProps> = ({
  clientes,
  rutaPuntos = [],
}) => {
  return (
    <Card>
      <div className="mb-4 border-b border-[#2A2A2E] pb-3">
        <h4 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
          Mapa General Territorial
        </h4>
        <p className="font-mono text-[10px] text-zinc-500">
          Visualización de clusters, paradas y clientes activos en tiempo real
        </p>
      </div>

      <div className="relative flex h-[320px] items-center justify-center overflow-hidden rounded-xl border border-[#2A2A2E] bg-zinc-950">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] opacity-10" />

        <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1.5 rounded-lg border border-[#2A2A2E] bg-[#18181B] p-2.5 font-mono text-[9px] text-zinc-400">
          <span className="mb-0.5 font-bold tracking-wider text-white uppercase">
            Leyenda Estados
          </span>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span>Lead / Prospecto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Cliente Activo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-500" />
            <span>Archivado</span>
          </div>
        </div>

        <div className="absolute inset-10">
          {clientes.map((c, index) => {
            const seedX = Math.abs(Math.sin(index + 3.14) * 80);
            const seedY = Math.abs(Math.cos(index + 1.59) * 80);

            const isEnRuta = rutaPuntos.some((rp) => rp.id === c.id);
            const routeOrder = rutaPuntos.findIndex((rp) => rp.id === c.id) + 1;

            const bgClass =
              c.estado === "Cliente Activo"
                ? "bg-emerald-500 shadow-emerald-500/20"
                : c.estado === "Archivado"
                  ? "bg-zinc-500 shadow-zinc-500/20"
                  : "bg-blue-500 shadow-blue-500/20";

            return (
              <div
                key={c.id}
                style={{ left: `${seedX}%`, top: `${seedY}%` }}
                className="group absolute flex cursor-pointer flex-col items-center"
              >
                <div
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border border-zinc-950 font-mono text-[7px] font-bold text-black shadow-lg ${bgClass} transition-all hover:scale-125`}
                >
                  {isEnRuta && routeOrder}
                </div>

                <div className="absolute bottom-5 z-20 hidden rounded border border-zinc-700 bg-zinc-900 p-1.5 font-mono text-[9px] whitespace-nowrap text-white shadow-xl group-hover:block">
                  <span className="font-bold">{c.nombre}</span>
                  <span className="block text-[8px] text-zinc-500">
                    {c.empresa || "Sin Empresa"} ({c.estado})
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {rutaPuntos.length > 1 && (
          <div className="absolute top-3 right-3 rounded-lg border border-emerald-500/20 bg-[#18181B]/80 p-2 font-mono text-[9px] font-bold text-emerald-400 backdrop-blur-sm">
            ✓ Ruta Activa: {rutaPuntos.length} paradas optimizadas
          </div>
        )}
      </div>
    </Card>
  );
};
