"use client";

import React, { useState } from "react";
import { MainLayout } from "../../../presentation/components/layout";
import { Icono } from "../../../presentation/components/icons";
import { RegistroProspecto } from "../../../presentation/components/contacto-frio/registro-prospecto";
import { StockProspectos } from "../../../presentation/components/contacto-frio/stock-prospectos";
import { SeleccionContacto } from "../../../presentation/components/contacto-frio/seleccion-contacto";
import { SeguimientoPendiente } from "../../../presentation/components/contacto-frio/seguimiento-pendiente";
import { CintaDiaria } from "../../../presentation/components/contacto-frio/cinta-diaria";

type Estacion = "hoy" | "registro" | "contacto" | "seguimiento" | "stock";

const ESTACIONES: { id: Estacion; label: string; icono: keyof typeof Icono }[] =
  [
    { id: "hoy", label: "Hoy", icono: "Activity" },
    { id: "registro", label: "Registro", icono: "Plus" },
    { id: "contacto", label: "Contactar", icono: "Sparkles" },
    { id: "seguimiento", label: "Seguimiento", icono: "Clock" },
    { id: "stock", label: "Stock", icono: "Search" },
  ];

/**
 * Contacto en Frío — rediseño (Fase 4.2). Reemplaza taller-contacto y la
 * pestaña digital de territorio: un solo flujo en estaciones, cada una
 * enfocada en una sola tarea, sin mezclar datos de otra estación.
 */
export default function ContactoFrioPage() {
  const [estacion, setEstacion] = useState<Estacion>("hoy");

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Contacto en Frío</h1>
          <p className="text-sm text-zinc-500">
            Prospección digital — procedimiento NODEXA-SOP-02.
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

        {estacion === "hoy" && <CintaDiaria />}
        {estacion === "registro" && <RegistroProspecto />}
        {estacion === "contacto" && <SeleccionContacto />}
        {estacion === "seguimiento" && <SeguimientoPendiente />}
        {estacion === "stock" && <StockProspectos />}
      </div>
    </MainLayout>
  );
}
