import React from "react";
import { Icono } from "../icons";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  ...props
}) => (
  <div
    className={`rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6 shadow-xl ${className}`}
    {...props}
  >
    {children}
  </div>
);

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  titulo: string;
  valor: string | number;
  cambio?: {
    porcentaje: number;
    tipo: "sube" | "baja";
    texto?: string;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  titulo,
  valor,
  cambio,
  className = "",
  ...props
}) => {
  const SubeIcon = Icono.TrendingUp;
  const BajaIcon = Icono.TrendingDown;

  return (
    <Card className={`flex flex-col justify-between ${className}`} {...props}>
      <div>
        <span className="mb-1 block font-mono text-xs tracking-wider text-zinc-500 uppercase">
          {titulo}
        </span>
        <span className="text-3xl font-extrabold tracking-tight text-zinc-100">
          {valor}
        </span>
      </div>
      {cambio ? (
        <div className="mt-4 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
              cambio.tipo === "sube"
                ? "border border-emerald-500/10 bg-emerald-500/10 text-emerald-400"
                : "border border-red-500/10 bg-red-500/10 text-red-400"
            }`}
          >
            {cambio.tipo === "sube" ? (
              <SubeIcon className="h-3.5 w-3.5" />
            ) : (
              <BajaIcon className="h-3.5 w-3.5" />
            )}
            {cambio.porcentaje}%
          </span>
          {cambio.texto ? (
            <span className="text-xs text-zinc-500">{cambio.texto}</span>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
};

interface QuickActionCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  titulo,
  descripcion,
  icono,
  className = "",
  ...props
}) => (
  <button
    className={`group flex w-full items-start gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-5 text-left shadow-xl transition-all hover:border-zinc-700 hover:bg-[#232326] focus:ring-1 focus:ring-emerald-500/50 focus:outline-none ${className}`}
    {...props}
  >
    <div className="rounded-xl border border-[#2A2A2E] bg-zinc-900/80 p-3 text-emerald-400 transition-all group-hover:border-zinc-700 group-hover:text-emerald-300">
      {icono}
    </div>
    <div className="flex-1">
      <h4 className="text-sm font-bold text-zinc-100 transition-all group-hover:text-emerald-400">
        {titulo}
      </h4>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        {descripcion}
      </p>
    </div>
  </button>
);
