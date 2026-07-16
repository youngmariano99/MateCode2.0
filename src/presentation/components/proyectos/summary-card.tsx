"use client";

import React from "react";

export type SummaryCardEstado = "Configurado" | "Incompleto" | "Vacío";

interface SummaryCardProps {
  titulo: string;
  descripcion: string;
  estado: SummaryCardEstado;
  icono: React.ReactNode;
  onClick: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  titulo,
  descripcion,
  estado,
  icono,
  onClick,
}) => {
  // Determine color theme based on status
  let badgeColor = "bg-zinc-800/80 text-zinc-500 border-zinc-800/40";
  let statusIndicator = "bg-zinc-600";

  if (estado === "Configurado") {
    badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    statusIndicator = "bg-emerald-500";
  } else if (estado === "Incompleto") {
    badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    statusIndicator = "bg-amber-500";
  } else if (estado === "Vacío") {
    badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
    statusIndicator = "bg-rose-500";
  }

  return (
    <div
      onClick={onClick}
      className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-[#2A2A2E] bg-zinc-950/40 p-5 transition-all select-none hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-950/80"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Module Icon Wrapper */}
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors group-hover:bg-zinc-800 group-hover:text-zinc-200">
          {icono}
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase ${badgeColor}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusIndicator}`} />
          {estado}
        </span>
      </div>

      <div className="mt-4">
        <h4 className="font-mono text-xs font-bold text-zinc-100 transition-colors group-hover:text-white">
          {titulo}
        </h4>
        <p className="mt-1 font-mono text-[10px] leading-relaxed text-zinc-500 group-hover:text-zinc-400">
          {descripcion}
        </p>
      </div>
    </div>
  );
};
