"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { MainLayout } from "../../../presentation/components/layout";
import { Icono } from "../../../presentation/components/icons";
import { Button } from "../../../presentation/components/button";
import { SelectorCicloSemanal } from "../../../presentation/components/contenido/selector-ciclo-semanal";
import { EstacionGuion } from "../../../presentation/components/contenido/estacion-guion";
import { EstacionGrabacion } from "../../../presentation/components/contenido/estacion-grabacion";
import { EstacionProduccion } from "../../../presentation/components/contenido/estacion-produccion";
import { EstacionPublicado } from "../../../presentation/components/contenido/estacion-publicado";
import { PanelMetricas } from "../../../presentation/components/contenido/panel-metricas";
import { PanelCierreSemana } from "../../../presentation/components/contenido/panel-cierre-semana";
import { EtiquetaSemana } from "../../../presentation/components/contenido/etiqueta-semana";
import { EstacionPlanificar } from "../../../presentation/components/contenido/estacion-planificar";
import { CalendarioContenido } from "../../../presentation/components/contenido/calendario-contenido";
import { GestionarContenidoUseCase } from "../../../application/use-cases/contenido/gestionar-contenido.use-case";
import {
  ETIQUETA_ETAPA,
  type EtapaCinta,
} from "../../../domain/entidades/contenido.entity";
import {
  semanaDeCiclo,
  tareasDelDia,
} from "../../../domain/entidades/contenido-semana.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";

type Estacion =
  | "planificar"
  | "guion"
  | "grabar"
  | "editar"
  | "publicado"
  | "calendario"
  | "panel";

const ESTACIONES: { id: Estacion; label: string; icono: keyof typeof Icono }[] =
  [
    { id: "planificar", label: "① Planificar", icono: "ListTodo" },
    { id: "guion", label: "② Guion", icono: "Edit" },
    { id: "grabar", label: "③ Grabar", icono: "Play" },
    { id: "editar", label: "④ Editar y programar", icono: "Activity" },
    { id: "publicado", label: "⑤ Publicar", icono: "TrendingUp" },
    { id: "calendario", label: "Calendario", icono: "Calendario" },
    { id: "panel", label: "Resultados", icono: "History" },
  ];

const useCase = new GestionarContenidoUseCase();
const SIN_CONTENIDOS: never[] = [];

/** Cada etapa de "hoy" lleva a la pestaña donde se resuelve. */
const ESTACION_DE_ETAPA: Record<EtapaCinta, Estacion> = {
  guion: "guion",
  grabacion: "grabar",
  edicion: "editar",
  publicacion: "publicado",
};

/**
 * Planificador de Contenido. Cinta de producción en estaciones, mapeada al
 * flujo real del SOP (Ideas → Guion → Producción → Publicado), más la
 * planificación semanal dinámica (mezcla de tipos y días de cada etapa, que
 * cambian semana a semana), la planificación con IA por etapas y el calendario.
 */
export default function PlanificadorContenidoPage() {
  const [estacion, setEstacion] = useState<Estacion>("planificar");
  const [mostrarCierre, setMostrarCierre] = useState(false);
  const hoy = obtenerDiaTareaHoy();

  useEffect(() => {
    // Si la plantilla de guion guardada es la vieja de 7 secciones, pasa a la del SOP.
    void useCase.asegurarPlantillaSop();
  }, []);

  const cicloActivo = useLiveQuery(() =>
    db.ciclo_semanal.where("estado").equals("activo").first()
  );
  const contenidos =
    useLiveQuery(() => db.contenido.toArray()) ?? SIN_CONTENIDOS;

  const semanaVencida = useMemo(
    () => !!cicloActivo && sumarDias(semanaDeCiclo(cicloActivo), 7) <= hoy,
    [cicloActivo, hoy]
  );
  const tareasHoy = useMemo(
    () => tareasDelDia(contenidos, hoy),
    [contenidos, hoy]
  );

  const resumenHoy = (Object.keys(ETIQUETA_ETAPA) as EtapaCinta[])
    .map((e) => ({
      etapa: e,
      n: tareasHoy.filter((t) => t.etapa === e).length,
    }))
    .filter((x) => x.n > 0);

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
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

        <EtiquetaSemana />

        {resumenHoy.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">
              Hoy toca
            </span>
            {resumenHoy.map((x) => (
              <button
                key={x.etapa}
                onClick={() => setEstacion(ESTACION_DE_ETAPA[x.etapa])}
                className="rounded-lg border border-[#2A2A2E] bg-[#18181B] px-3 py-1 text-xs font-bold text-zinc-200 hover:border-emerald-500/40"
              >
                {ETIQUETA_ETAPA[x.etapa]} · {x.n}
              </button>
            ))}
          </div>
        )}

        {!cicloActivo ? (
          <SelectorCicloSemanal
            onCicloCreado={() => setEstacion("planificar")}
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-1 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-1">
              {ESTACIONES.map((e) => {
                const Icon = Icono[e.icono];
                return (
                  <button
                    key={e.id}
                    onClick={() => setEstacion(e.id)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold whitespace-nowrap transition-all ${
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

            {estacion === "planificar" && (
              <EstacionPlanificar
                cicloId={cicloActivo.id}
                irAGuion={() => setEstacion("guion")}
              />
            )}
            {estacion === "guion" && <EstacionGuion cicloId={cicloActivo.id} />}
            {estacion === "grabar" && (
              <EstacionGrabacion cicloId={cicloActivo.id} />
            )}
            {estacion === "editar" && (
              <EstacionProduccion cicloId={cicloActivo.id} />
            )}
            {estacion === "publicado" && (
              <EstacionPublicado cicloId={cicloActivo.id} />
            )}
            {estacion === "calendario" && <CalendarioContenido />}
            {estacion === "panel" && <PanelMetricas />}
          </>
        )}

        {mostrarCierre && cicloActivo && (
          <PanelCierreSemana
            cicloId={cicloActivo.id}
            objetivoAnterior={cicloActivo.objetivoVideos}
            onCerrado={() => {
              setMostrarCierre(false);
              setEstacion("planificar");
            }}
            onCancelar={() => setMostrarCierre(false)}
          />
        )}
      </div>
    </MainLayout>
  );
}
