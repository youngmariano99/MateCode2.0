"use client";

import React, { useState } from "react";
import { MainLayout } from "../../../../presentation/components/layout";
import { Icono } from "../../../../presentation/components/icons";
import { Button } from "../../../../presentation/components/button";
import { BannerHitosOficina } from "../../../../presentation/components/personal/oficina/banner-hitos-oficina";
import { AccesosRapidos } from "../../../../presentation/components/personal/oficina/accesos-rapidos";
import { CockpitTareasHoy } from "../../../../presentation/components/personal/oficina/cockpit-tareas-hoy";
import { SesionTrabajo } from "../../../../presentation/components/personal/oficina/sesion-trabajo";
import { ModalDiarioTecnico } from "../../../../presentation/components/personal/oficina/modal-diario-tecnico";
import { ModalBaulRecursos } from "../../../../presentation/components/personal/oficina/modal-baul-recursos";
import { ModalCopilotoOficina } from "../../../../presentation/components/personal/oficina/modal-copiloto-oficina";

const breadcrumbs = [
  { label: "Personal", href: "/dashboard/personal/hoy" },
  { label: "Oficina" },
];

/**
 * Oficina Virtual: Puesto de trabajo ejecutivo enfocado exclusivamente en el DÍA.
 * - Cockpit de tareas de hoy con progreso y trazabilidad jerárquica.
 * - Timer de foco con cronómetro y pausas activas.
 * - Modales flotantes para Diario Técnico, Baúl de Recursos y Copiloto IA (para no abandonar la oficina).
 * - Accesos rápidos con apertura en pestañas nuevas.
 */
export default function OficinaPage() {
  const [modalNoticias, setModalNoticias] = useState(false);
  const [modalBaul, setModalBaul] = useState(false);
  const [modalCopiloto, setModalCopiloto] = useState(false);

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-5">
        {/* Encabezado y Barra de Herramientas Flotantes */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Oficina Virtual
            </h1>
            <p className="mt-0.5 text-xs text-zinc-400">
              Puesto de trabajo diario. Enfocate en la ejecución de hoy, una
              cosa a la vez.
            </p>
          </div>

          {/* Botones de Modales Especializados */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setModalNoticias(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:border-sky-500/50 hover:text-sky-300"
            >
              <Icono.ListTodo className="h-4 w-4 text-sky-400" />
              Diario Técnico
            </Button>

            <Button
              variant="outline"
              onClick={() => setModalBaul(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:border-amber-500/50 hover:text-amber-300"
            >
              <Icono.Package className="h-4 w-4 text-amber-400" />
              Baúl de Recursos & Hitos
            </Button>

            <Button
              variant="outline"
              onClick={() => setModalCopiloto(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-300"
            >
              <Icono.Target className="h-4 w-4 text-emerald-400" />
              Copiloto IA
            </Button>
          </div>
        </div>

        {/* Banner de Recordatorios e Hitos Próximos */}
        <BannerHitosOficina onAbrirBaul={() => setModalBaul(true)} />

        {/* Accesos Rápidos (App en _blank + Personalizados) */}
        <AccesosRapidos />

        {/* Dashboard Central en 2 Columnas */}
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          {/* Columna Izquierda: Cockpit de Tareas de Hoy */}
          <div className="lg:col-span-7">
            <CockpitTareasHoy />
          </div>

          {/* Columna Derecha: Puesto de Foco & Temporizador */}
          <div className="lg:col-span-5">
            <SesionTrabajo />
          </div>
        </div>

        {/* Modales Especializados */}
        <ModalDiarioTecnico
          abierto={modalNoticias}
          onCerrar={() => setModalNoticias(false)}
        />

        <ModalBaulRecursos
          abierto={modalBaul}
          onCerrar={() => setModalBaul(false)}
        />

        <ModalCopilotoOficina
          abierto={modalCopiloto}
          onCerrar={() => setModalCopiloto(false)}
        />
      </div>
    </MainLayout>
  );
}
