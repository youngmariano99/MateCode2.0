import React from "react";

export type StatusType =
  | "lead"
  | "contacto"
  | "propuesta"
  | "aceptado"
  | "en_progreso"
  | "seguimiento"
  | "terminado"
  | "rechazado";

export type BadgeColor =
  "emerald" | "blue" | "sky" | "violet" | "amber" | "orange" | "red" | "zinc";

interface BadgeProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  "color"
> {
  children: React.ReactNode;
  color?: BadgeColor;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  color = "zinc",
  className = "",
  ...props
}) => {
  const colors = {
    emerald: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    sky: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
    violet: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
    amber: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    orange: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    red: "bg-red-500/10 text-red-400 border border-red-500/20",
    zinc: "bg-zinc-800/40 text-zinc-400 border border-zinc-700/60",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${colors[color]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

interface StatusBadgeProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  "color"
> {
  estado: StatusType | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  estado,
  className = "",
  ...props
}) => {
  const normEstado = estado.toLowerCase().replace(" ", "_");

  const statusMap: Record<string, { label: string; color: BadgeColor }> = {
    lead: { label: "Lead", color: "blue" },
    contacto: { label: "Contacto Realizado", color: "sky" },
    propuesta: { label: "Propuesta Enviada", color: "violet" },
    aceptado: { label: "Aceptado", color: "emerald" },
    en_progreso: { label: "En Progreso", color: "orange" },
    seguimiento: { label: "Seguimiento", color: "amber" },
    terminado: { label: "Terminado", color: "zinc" },
    rechazado: { label: "Rechazado", color: "red" },
  };

  const resolvedColor = (statusMap[normEstado]?.color || "zinc") as BadgeColor;
  const resolvedLabel = statusMap[normEstado]?.label || estado;

  return (
    <Badge color={resolvedColor} className={className} {...props}>
      {resolvedLabel}
    </Badge>
  );
};
