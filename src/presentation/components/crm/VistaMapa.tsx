"use client";

import React from "react";
import { Card } from "../card";

interface ClienteCRM {
  id: string;
  nombre: string;
  correo: string;
  empresa?: string;
  cargo?: string;
  telefono?: string;
  whatsapp?: string;
  redes?: string;
  direccion?: string;
  observaciones?: string;
  origenContacto?: string;
  estado: string;
  responsable?: string;
  etiquetas?: string[];
  favorito?: boolean;
  latitud?: number;
  longitud?: number;
  fechaSeguimiento?: string;
  notaSeguimiento?: string;
}

interface VistaMapaProps {
  clientes: ClienteCRM[];
}

export const VistaMapa: React.FC<VistaMapaProps> = ({ clientes }) => {
  return (
    <Card>
      <div className="mb-4 border-b border-[#2A2A2E] pb-4">
        <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-100 uppercase">
          Geolocalización de Clientes
        </h3>
        <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
          Coordenadas registradas de cada oportunidad comercial
        </p>
      </div>

      <div className="relative flex h-[320px] items-center justify-center overflow-hidden rounded-2xl border border-[#2A2A2E] bg-zinc-950">
        <svg
          className="absolute inset-0 h-full w-full text-[#2A2A2E]/25"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="grid"
              width="30"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 30 0 L 0 0 0 30"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <div className="relative flex h-full w-full items-center justify-center">
          {clientes.map((c, idx) => {
            const topPos = 20 + ((idx * 25) % 60);
            const leftPos = 20 + ((idx * 30) % 60);

            return (
              <div
                key={c.id}
                style={{ top: `${topPos}%`, left: `${leftPos}%` }}
                className="group absolute flex flex-col items-center"
              >
                <div className="h-3.5 w-3.5 animate-pulse cursor-pointer rounded-full border border-zinc-950 bg-emerald-500 shadow-lg shadow-emerald-500/40" />
                <div className="pointer-events-none absolute top-[110%] z-20 min-w-[150px] rounded-lg border border-[#2A2A2E] bg-[#18181B] p-2 font-mono text-[10px] opacity-0 shadow-2xl transition-all group-hover:pointer-events-auto group-hover:opacity-100">
                  <span className="block font-bold text-zinc-200">
                    {c.nombre}
                  </span>
                  <span className="block text-zinc-500">
                    Lat: {c.latitud?.toFixed(4)}, Lng: {c.longitud?.toFixed(4)}
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${c.latitud},${c.longitud}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 block text-emerald-400 hover:underline"
                  >
                    Abrir en Maps ↗
                  </a>
                </div>
              </div>
            );
          })}
          <span className="font-mono text-xs text-zinc-500 select-none">
            [ Canvas Geográfico de Leads ]
          </span>
        </div>
      </div>
    </Card>
  );
};
