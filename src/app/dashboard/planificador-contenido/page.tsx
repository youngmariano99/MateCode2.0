"use client";

import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { MainLayout } from "../../../presentation/components/layout";
import { Icono } from "../../../presentation/components/icons";
import { Button } from "../../../presentation/components/button";
import { EstacionIdeas } from "../../../presentation/components/contenido/estacion-ideas";
import { SelectorCicloSemanal } from "../../../presentation/components/contenido/selector-ciclo-semanal";
import { EstacionGuion } from "../../../presentation/components/contenido/estacion-guion";
import { EstacionProduccion } from "../../../presentation/components/contenido/estacion-produccion";
import { EstacionPublicado } from "../../../presentation/components/contenido/estacion-publicado";
import { PanelMetricas } from "../../../presentation/components/contenido/panel-metricas";
import { PanelCierreSemana } from "../../../presentation/components/contenido/panel-cierre-semana";

type Estacion = "ideas" | "guion" | "produccion" | "publicado" | "panel";

const ESTACIONES: { id: Estacion; label: string; icono: keyof typeof Icono }[] =
  [
    { id: "ideas", label: "Ideas", icono: "Sparkles" },
    { id: "guion", label: "Guion", icono: "Edit" },
    { id: "produccion", label: "Producción", icono: "Activity" },
    { id: "publicado", label: "Publicado", icono: "TrendingUp" },
    { id: "panel", label: "Panel", icono: "History" },
  ];

const UNA_SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Planificador de Contenido — rediseño (Fase 5.1). Cinta de producción en
 * estaciones, mapeada al flujo real del SOP: Ideas → Guion → Producción →
 * Publicado, más un panel de trazabilidad y el cierre de semana.
 */
export default function PlanificadorContenidoPage() {
  const [estacion, setEstacion] = useState<Estacion>("ideas");
  const [mostrarCierre, setMostrarCierre] = useState(false);

  const cicloActivo = useLiveQuery(() =>
    db.ciclo_semanal.where("estado").equals("activo").first()
  );

  const semanaVencida = useMemo(
    () =>
      !!cicloActivo &&
      new Date().getTime() - cicloActivo.fechaInicio > UNA_SEMANA_MS,
    [cicloActivo]
  );

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">
              Planificador de Contenido
            </h1>
            <p className="text-sm text-zinc-500">
              Procedimiento NODEXA-SOP-MKT-01.
            </p>
          </div>
          {cicloActivo && (
            <Button
              variant={semanaVencida ? "primary" : "outline"}
              onClick={() => setMostrarCierre(true)}
            >
              {semanaVencida ? "Cerrar semana (venció)" : "Cerrar semana"}
            </Button>
          )}
        </div>

        {!cicloActivo ? (
          <SelectorCicloSemanal onCicloCreado={() => setEstacion("ideas")} />
        ) : (
          <>
            <div className="flex gap-1 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-1">
              {ESTACIONES.map((e) => {
                const Icon = Icono[e.icono];
                return (
                  <button
                    key={e.id}
                    onClick={() => setEstacion(e.id)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all ${
                      estacion === e.id
                        ? "bg-[#10B981] text-zinc-950"
                        : "text-zinc-400 hover:bg-[#232326] hover:text-zinc-200"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {e.label}
                  </button>
                );
              })}
            </div>

            {estacion === "ideas" && <EstacionIdeas />}
            {estacion === "guion" && <EstacionGuion cicloId={cicloActivo.id} />}
            {estacion === "produccion" && (
              <EstacionProduccion cicloId={cicloActivo.id} />
            )}
            {estacion === "publicado" && (
              <EstacionPublicado cicloId={cicloActivo.id} />
            )}
            {estacion === "panel" && <PanelMetricas />}
          </>
        )}

        {mostrarCierre && cicloActivo && (
          <PanelCierreSemana
            cicloId={cicloActivo.id}
            objetivoAnterior={cicloActivo.objetivoVideos}
            onCerrado={() => {
              setMostrarCierre(false);
              setEstacion("ideas");
            }}
            onCancelar={() => setMostrarCierre(false)}
          />
        )}
      </div>
    </MainLayout>
  );
}
