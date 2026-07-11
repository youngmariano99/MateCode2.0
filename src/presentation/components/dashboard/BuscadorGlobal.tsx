"use client";

import React, { useState, useEffect } from "react";
import { useBusqueda } from "../../hooks/useBusqueda";
import { Icono } from "../icons";

interface SearchResult {
  id: string;
  tipo: "cliente" | "proyecto" | "pago" | "contrato";
  titulo: string;
  detalle: string;
}

export const BuscadorGlobal: React.FC = () => {
  const { query, setQuery, debouncedQuery } = useBusqueda("", 300);
  const [resultados, setResultados] = useState<SearchResult[]>([]);
  const SearchIcon = Icono.Search;

  const mockDataset: SearchResult[] = [
    {
      id: "1",
      tipo: "cliente",
      titulo: "Acme Corp",
      detalle: "Cliente activo - Digital",
    },
    {
      id: "2",
      tipo: "cliente",
      titulo: "Globex Inc",
      detalle: "Cliente activo - Leads",
    },
    {
      id: "3",
      tipo: "proyecto",
      titulo: "Rediseño Web",
      detalle: "Proyecto en progreso - Acme Corp",
    },
    {
      id: "4",
      tipo: "pago",
      titulo: "Factura #1034",
      detalle: "Pago pendiente - Stark Ind",
    },
    {
      id: "5",
      tipo: "contrato",
      titulo: "Contrato de Soporte",
      detalle: "Contrato firmado - Initech",
    },
  ];

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      Promise.resolve().then(() => setResultados([]));
      return;
    }

    const lower = debouncedQuery.toLowerCase();
    const filtrados = mockDataset.filter(
      (item) =>
        item.titulo.toLowerCase().includes(lower) ||
        item.detalle.toLowerCase().includes(lower) ||
        item.tipo.toLowerCase().includes(lower)
    );
    Promise.resolve().then(() => setResultados(filtrados));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <SearchIcon className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar clientes, contratos, pagos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-full border border-[#2A2A2E] bg-[#18181B] py-2 pr-4 pl-10 font-mono text-xs text-zinc-200 placeholder-zinc-500 transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 focus:outline-none"
        />
      </div>

      {resultados.length > 0 && (
        <div className="animate-in fade-in absolute top-[110%] left-0 z-50 max-h-60 w-full overflow-y-auto rounded-xl border border-[#2A2A2E] bg-[#18181B] p-2 shadow-2xl duration-150">
          <div className="mb-1 border-b border-[#2A2A2E] px-2 py-1">
            <span className="font-mono text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
              Resultados encontrados
            </span>
          </div>
          {resultados.map((res) => (
            <div
              key={`${res.tipo}-${res.id}`}
              className="flex cursor-pointer flex-col rounded-lg px-3 py-2 transition-all hover:bg-[#232326]"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-400 uppercase">
                  {res.tipo}
                </span>
                <span className="text-xs font-bold text-zinc-200">
                  {res.titulo}
                </span>
              </div>
              <span className="mt-0.5 text-[10px] text-zinc-500">
                {res.detalle}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
