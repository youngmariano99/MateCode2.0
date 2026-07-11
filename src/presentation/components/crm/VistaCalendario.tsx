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

interface VistaCalendarioProps {
  clientes: ClienteCRM[];
  onEdicion: (c: ClienteCRM) => void;
}

export const VistaCalendario: React.FC<VistaCalendarioProps> = ({
  clientes,
  onEdicion,
}) => {
  return (
    <Card>
      <div className="mb-4 border-b border-[#2A2A2E] pb-4">
        <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-100 uppercase">
          Agenda de Seguimiento Comercial
        </h3>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-7">
        {[
          "Lunes",
          "Martes",
          "Miércoles",
          "Jueves",
          "Viernes",
          "Sábado",
          "Domingo",
        ].map((d) => (
          <div
            key={d}
            className="border-b border-[#2A2A2E] p-2 text-center font-mono text-[10px] font-bold tracking-wider text-zinc-500 uppercase"
          >
            {d}
          </div>
        ))}

        {Array.from({ length: 14 }).map((_, idx) => {
          const dayNum = 10 + idx;
          const matching = clientes.filter(
            (c) =>
              c.fechaSeguimiento && c.fechaSeguimiento.includes(`-07-${dayNum}`)
          );

          return (
            <div
              key={idx}
              className="flex min-h-[110px] flex-col gap-1.5 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-2.5"
            >
              <span className="font-mono text-[10px] font-bold text-zinc-600">
                {dayNum} de Julio
              </span>
              <div className="flex flex-col gap-1">
                {matching.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onEdicion(c)}
                    className="cursor-pointer truncate rounded border border-emerald-500/20 bg-emerald-500/10 p-1 px-1.5 text-[9px] font-bold text-emerald-400"
                    title={c.notaSeguimiento}
                  >
                    {c.nombre}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
