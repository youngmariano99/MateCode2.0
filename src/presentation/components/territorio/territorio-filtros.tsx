import React from "react";

interface TerritorioFiltrosProps {
  ocultarCerrados: boolean;
  onOcultarCerradosChange: (v: boolean) => void;
  filtroVisita: "todos" | "visitados" | "no_visitados";
  onFiltroVisitaChange: (v: "todos" | "visitados" | "no_visitados") => void;
  filtroRubro: string;
  onFiltroRubroChange: (v: string) => void;
  rubrosDisponibles: string[];
  filtroOrden: "recientes" | "antiguos" | "prioridad";
  onFiltroOrdenChange: (v: "recientes" | "antiguos" | "prioridad") => void;
  totalFiltrados: number;
  totalGeneral: number;
}

export const TerritorioFiltros: React.FC<TerritorioFiltrosProps> = ({
  ocultarCerrados,
  onOcultarCerradosChange,
  filtroVisita,
  onFiltroVisitaChange,
  filtroRubro,
  onFiltroRubroChange,
  rubrosDisponibles,
  filtroOrden,
  onFiltroOrdenChange,
  totalFiltrados,
  totalGeneral,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#2A2A2E] bg-zinc-950 p-4">
    <div className="flex flex-wrap items-center gap-4">
      <label className="flex items-center gap-2 font-mono text-[10px] font-bold text-zinc-400 uppercase">
        <input
          type="checkbox"
          checked={ocultarCerrados}
          onChange={(e) => onOcultarCerradosChange(e.target.checked)}
        />
        Ocultar cerrados
      </label>

      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
          Estado Visita
        </label>
        <select
          value={filtroVisita}
          onChange={(e) =>
            onFiltroVisitaChange(e.target.value as typeof filtroVisita)
          }
          className="rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 font-mono text-xs text-zinc-300 focus:border-emerald-500 focus:outline-none"
        >
          <option value="todos">Mostrar Todos</option>
          <option value="visitados">Visitados</option>
          <option value="no_visitados">Sin Visitar</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
          Filtrar Rubro
        </label>
        <select
          value={filtroRubro}
          onChange={(e) => onFiltroRubroChange(e.target.value)}
          className="rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 font-mono text-xs text-zinc-300 focus:border-emerald-500 focus:outline-none"
        >
          <option value="todos">Todos los Rubros</option>
          {rubrosDisponibles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
          Ordenar por
        </label>
        <select
          value={filtroOrden}
          onChange={(e) =>
            onFiltroOrdenChange(e.target.value as typeof filtroOrden)
          }
          className="rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 font-mono text-xs text-zinc-300 focus:border-emerald-500 focus:outline-none"
        >
          <option value="prioridad">Mayor Prioridad primero</option>
          <option value="recientes">Más recientes primero</option>
          <option value="antiguos">Más antiguos primero</option>
        </select>
      </div>
    </div>

    <span className="self-end rounded-xl border border-[#2A2A2E] bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-500">
      Mostrando <b>{totalFiltrados}</b> de <b>{totalGeneral}</b>
    </span>
  </div>
);
