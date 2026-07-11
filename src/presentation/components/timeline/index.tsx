import React from "react";
import { Icono } from "../icons";

export interface TimelineItem {
  id: string | number;
  titulo: string;
  descripcion?: string;
  fecha: string;
  icono?: React.ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
}

export const Timeline: React.FC<TimelineProps> = ({ items }) => {
  const Clock = Icono.Clock;

  return (
    <div className="relative ml-4 space-y-8 border-l border-zinc-800 py-2 pl-6">
      {items.map((item) => (
        <div key={item.id} className="relative">
          <span className="absolute top-0 -left-[35px] flex h-7 w-7 items-center justify-center rounded-full border border-[#2A2A2E] bg-[#18181B] text-zinc-400">
            {item.icono || <Clock className="h-3.5 w-3.5" />}
          </span>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-200">
                {item.titulo}
              </span>
              <span className="rounded border border-[#2A2A2E] bg-[#18181B] px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-500">
                {item.fecha}
              </span>
            </div>
            {item.descripcion && (
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                {item.descripcion}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export interface ActivityItem {
  id: string | number;
  usuario: {
    nombre: string;
    avatarUrl?: string;
  };
  accion: string;
  detalle?: string;
  fecha: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ items }) => {
  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3.5 rounded-xl border border-transparent p-3 transition-all hover:border-[#2A2A2E] hover:bg-[#18181B]/40"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2A2A2E] bg-zinc-800 text-xs font-bold text-zinc-300">
            {item.usuario.nombre.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-bold text-zinc-200">
                {item.usuario.nombre}
              </span>
              <span className="text-[10px] font-medium whitespace-nowrap text-zinc-500">
                {item.fecha}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-zinc-300">
              {item.accion}{" "}
              {item.detalle && (
                <span className="mt-1 block rounded border border-zinc-900 bg-zinc-950 p-1.5 font-mono text-[11px] text-zinc-500">
                  {item.detalle}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
