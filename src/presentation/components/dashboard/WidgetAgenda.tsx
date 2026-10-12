"use client";

import React from "react";
import { Card } from "../card";
import { Icono } from "../icons";

interface AgendaItem {
  id: string;
  tipo: "llamada" | "visita" | "seguimiento" | "pago" | "reunion";
  titulo: string;
  hora: string;
  cliente: string;
}

interface WidgetAgendaProps {
  items: AgendaItem[];
}

export const WidgetAgenda: React.FC<WidgetAgendaProps> = ({ items }) => {
  const User = Icono.Clientes;

  return (
    <Card>
      <div className="mb-4 border-b border-[#2A2A2E] pb-4">
        <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-100 uppercase">
          Agenda del Día
        </h3>
        <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
          Visitas, llamadas y reuniones programadas
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {items.length === 0 ? (
          <div className="py-6 text-center font-mono text-xs text-zinc-600">
            No tenés eventos para hoy.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3 transition-all hover:border-zinc-800"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="shrink-0 rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-zinc-200">
                    {item.titulo}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[10px] text-zinc-500">
                    {item.cliente}
                  </span>
                </div>
              </div>
              <span className="shrink-0 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-bold whitespace-nowrap text-emerald-400">
                {item.hora}
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
