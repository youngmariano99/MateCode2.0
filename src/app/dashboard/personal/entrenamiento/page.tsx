"use client";

import React, { useState } from "react";
import { MainLayout } from "../../../../presentation/components/layout";
import { Icono } from "../../../../presentation/components/icons";
import { PanelBloques } from "../../../../presentation/components/personal/entrenamiento/panel-bloques";
import { EjecucionSesion } from "../../../../presentation/components/personal/entrenamiento/ejecucion-sesion";
import { CrearPlantilla } from "../../../../presentation/components/personal/entrenamiento/crear-plantilla";
import { PanelEstadisticas } from "../../../../presentation/components/personal/entrenamiento/panel-estadisticas";

type Estacion = "hoy" | "rutinas" | "progreso";

const ESTACIONES: { id: Estacion; label: string; icono: keyof typeof Icono }[] =
  [
    { id: "hoy", label: "Hoy", icono: "Dumbbell" },
    { id: "rutinas", label: "Rutinas", icono: "Plus" },
    { id: "progreso", label: "Progreso", icono: "TrendingUp" },
  ];

const breadcrumbs = [
  { label: "Personal", href: "/dashboard/personal/hoy" },
  { label: "Entrenamiento" },
];

/**
 * Bienestar y Entrenamiento — estaciones separadas porque este módulo no
 * tiene el ritmo diario de "Hoy": el Búnker/hábitos se resuelven todos los
 * días, entrenar y planificar rutinas son acciones más espaciadas.
 */
export default function EntrenamientoPage() {
  const [estacion, setEstacion] = useState<Estacion>("hoy");

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Entrenamiento
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Registrá con el mínimo esfuerzo — un tap si salió como el plan, solo
            editás lo que cambió.
          </p>
        </div>

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

        {estacion === "hoy" && (
          <div className="flex flex-col gap-4">
            <PanelBloques />
            <EjecucionSesion />
          </div>
        )}
        {estacion === "rutinas" && <CrearPlantilla />}
        {estacion === "progreso" && <PanelEstadisticas />}
      </div>
    </MainLayout>
  );
}
