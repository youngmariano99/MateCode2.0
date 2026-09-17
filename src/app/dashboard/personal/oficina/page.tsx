"use client";

import React from "react";
import { MainLayout } from "../../../../presentation/components/layout";
import { SesionTrabajo } from "../../../../presentation/components/personal/oficina/sesion-trabajo";
import { FasesActivas } from "../../../../presentation/components/personal/oficina/fases-activas";
import { CapturaInbox } from "../../../../presentation/components/personal/captura-inbox";
import { AccesosRapidos } from "../../../../presentation/components/personal/oficina/accesos-rapidos";

const breadcrumbs = [
  { label: "Personal", href: "/dashboard/personal/hoy" },
  { label: "Oficina" },
];

/**
 * Oficina: la pantalla que se mantiene abierta mientras se trabaja — distinta
 * de Planificación (el ritual de revisión/armado del día). Una tarea a la
 * vez, con cronómetro, pausa activa a mano si hace falta interrumpir, un
 * anotador de ideas suelto (reusa la Bandeja de entrada tal cual) y accesos
 * directos a los otros módulos sin perder el hilo.
 */
export default function OficinaPage() {
  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Oficina
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Ejecutá lo de hoy, una cosa a la vez.
          </p>
        </div>

        <FasesActivas />
        <SesionTrabajo />
        <CapturaInbox />
        <AccesosRapidos />
      </div>
    </MainLayout>
  );
}
