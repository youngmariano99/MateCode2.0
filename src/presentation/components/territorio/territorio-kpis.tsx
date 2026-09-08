import React from "react";
import { Card } from "../card";

interface TerritorioKpisProps {
  totalProspectos: number;
  prospectosActivos: number;
  visitadosProspectos: number;
}

export const TerritorioKpis: React.FC<TerritorioKpisProps> = ({
  totalProspectos,
  prospectosActivos,
  visitadosProspectos,
}) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <Card>
      <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
        Prospectos Totales
      </span>
      <span className="mt-1 block font-mono text-xl font-bold text-white">
        {totalProspectos}
      </span>
    </Card>
    <Card>
      <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
        Prospectos Activos
      </span>
      <span className="mt-1 block font-mono text-xl font-bold text-emerald-400">
        {prospectosActivos}
      </span>
    </Card>
    <Card>
      <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
        Visitas de Campo
      </span>
      <span className="mt-1 block font-mono text-xl font-bold text-amber-400">
        {visitadosProspectos}
      </span>
    </Card>
  </div>
);
