"use client";

import React from "react";
import { Card } from "../card";
import { useToast } from "../../hooks/useToast";

const VARIABLES_DISPONIBLES = [
  { variable: "{{cliente.nombre}}", desc: "Nombre del Cliente" },
  { variable: "{{cliente.empresa}}", desc: "Compañía del Cliente" },
  { variable: "{{cliente.cuit}}", desc: "CUIT del Cliente" },
  { variable: "{{agencia.nombre}}", desc: "Nombre de la Agencia" },
  { variable: "{{agencia.email}}", desc: "Email de la Agencia" },
  { variable: "{{proyecto.nombre}}", desc: "Nombre del Proyecto" },
  { variable: "{{fecha_actual}}", desc: "Fecha de Hoy" },
  { variable: "{{monto.total}}", desc: "Monto Total" },
  { variable: "{{forma_pago}}", desc: "Modalidad de Pago" },
];

interface PanelVariablesProps {
  onInsertar: (variable: string) => void;
}

export const PanelVariables: React.FC<PanelVariablesProps> = ({
  onInsertar,
}) => {
  const { mostrarToast } = useToast();

  const handleCopy = (val: string) => {
    void navigator.clipboard.writeText(val);
    mostrarToast(`Copiado: ${val}`, "exito");
    onInsertar(val);
  };

  return (
    <Card>
      <div className="mb-3 border-b border-[#2A2A2E] pb-3">
        <h4 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
          Variables Dinámicas
        </h4>
        <p className="font-mono text-[10px] text-zinc-500">
          Haz clic en una variable para copiar e insertarla
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {VARIABLES_DISPONIBLES.map((v) => (
          <button
            key={v.variable}
            onClick={() => handleCopy(v.variable)}
            className="flex items-center justify-between rounded-lg border border-[#2A2A2E] bg-zinc-950 p-2 text-left font-mono text-[10px] transition-all hover:border-emerald-500/40"
          >
            <span className="font-bold text-emerald-400">{v.variable}</span>
            <span className="text-[9px] text-zinc-500">{v.desc}</span>
          </button>
        ))}
      </div>
    </Card>
  );
};
