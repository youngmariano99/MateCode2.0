"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Input } from "../input";
import { Button } from "../button";
import { Badge } from "../badge";
import { GestionarContenidoUseCase } from "../../../application/use-cases/contenido/gestionar-contenido.use-case";
import { formatearFechaBA } from "../../helpers/formatters";

const useCase = new GestionarContenidoUseCase();
const SIN_CONTENIDOS: never[] = [];
const SIN_KPIS: never[] = [];

interface EstacionPublicadoProps {
  cicloId: string;
}

/** Estación 5: publicar (fecha real) y cargar métricas contra el catálogo de KPIs. */
export const EstacionPublicado: React.FC<EstacionPublicadoProps> = ({
  cicloId,
}) => {
  const [activoId, setActivoId] = useState<string | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [valoresKpi, setValoresKpi] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const listos =
    useLiveQuery(
      () => db.contenido.where({ cicloId, estado: "Producción" }).toArray(),
      [cicloId]
    ) || SIN_CONTENIDOS;
  const publicados =
    useLiveQuery(
      () => db.contenido.where({ cicloId, estado: "Publicado" }).toArray(),
      [cicloId]
    ) || SIN_CONTENIDOS;
  const kpis =
    useLiveQuery(() => db.catalogo_kpi_contenido.toArray()) || SIN_KPIS;
  const activo = useLiveQuery(
    () => (activoId ? db.contenido.get(activoId) : undefined),
    [activoId]
  );

  // Ajusta el estado durante el render, no en un useEffect (evita el render
  // extra en cascada) — mismo patrón que seccion-ficha-digital.tsx.
  const [activoSincronizado, setActivoSincronizado] = useState(activo);
  if (activo !== activoSincronizado) {
    setActivoSincronizado(activo);
    const valores: Record<string, string> = {};
    if (activo?.metricas) {
      for (const [k, v] of Object.entries(activo.metricas))
        valores[k] = String(v);
    }
    setValoresKpi(valores);
  }

  const publicar = async () => {
    if (!activoId) return;
    setGuardando(true);
    await useCase.publicar(activoId, new Date(fecha).getTime());
    setGuardando(false);
  };

  const guardarMetricas = async () => {
    if (!activoId) return;
    setGuardando(true);
    const metricas: Record<string, number> = {};
    for (const [k, v] of Object.entries(valoresKpi)) {
      const n = Number(v);
      if (!isNaN(n) && v !== "") metricas[k] = n;
    }
    await useCase.actualizarMetricas(activoId, metricas);
    setGuardando(false);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-2">
          <span className="px-1 text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Listos para publicar
          </span>
          {listos.map((c) => (
            <button
              key={c.id}
              onClick={() => setActivoId(c.id)}
              className={`rounded-lg px-2 py-1.5 text-left text-sm ${
                activoId === c.id
                  ? "bg-emerald-500/10 font-bold text-emerald-400"
                  : "text-zinc-300 hover:bg-[#232326]"
              }`}
            >
              {c.titulo}
            </button>
          ))}
          {listos.length === 0 && (
            <span className="p-2 text-sm text-zinc-600">Nada esperando.</span>
          )}
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-2">
          <span className="px-1 text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Publicados (cargar métricas)
          </span>
          {publicados.map((c) => (
            <button
              key={c.id}
              onClick={() => setActivoId(c.id)}
              className={`rounded-lg px-2 py-1.5 text-left text-sm ${
                activoId === c.id
                  ? "bg-emerald-500/10 font-bold text-emerald-400"
                  : "text-zinc-300 hover:bg-[#232326]"
              }`}
            >
              {c.titulo}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6">
        {!activo ? (
          <span className="text-sm text-zinc-600">
            Elegí un contenido de la lista.
          </span>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-zinc-100">
                {activo.titulo}
              </h3>
              <Badge
                color={activo.estado === "Publicado" ? "emerald" : "amber"}
              >
                {activo.estado}
              </Badge>
            </div>

            {activo.estado === "Producción" ? (
              <>
                <Input
                  label="Fecha real de publicación"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
                <Button
                  onClick={publicar}
                  cargando={guardando}
                  className="self-end"
                >
                  Publicar
                </Button>
              </>
            ) : (
              <>
                {activo.fechaPublicacion && (
                  <span className="text-xs text-zinc-500">
                    Publicado el {formatearFechaBA(activo.fechaPublicacion)}
                  </span>
                )}
                <div className="flex flex-col gap-3">
                  {kpis.map((kpi) => (
                    <Input
                      key={kpi.id}
                      label={`${kpi.nombre}${kpi.unidad ? ` (${kpi.unidad})` : ""}`}
                      descripcion={
                        kpi.meta !== undefined
                          ? `Meta: ${kpi.meta}${kpi.unidad || ""}`
                          : undefined
                      }
                      type="number"
                      value={valoresKpi[kpi.id] || ""}
                      onChange={(e) =>
                        setValoresKpi({
                          ...valoresKpi,
                          [kpi.id]: e.target.value,
                        })
                      }
                    />
                  ))}
                </div>
                <Button
                  onClick={guardarMetricas}
                  cargando={guardando}
                  className="self-end"
                >
                  Guardar métricas
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
