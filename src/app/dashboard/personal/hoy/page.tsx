"use client";

import React, { useEffect, useState } from "react";
import { MainLayout } from "../../../../presentation/components/layout";
import { Icono } from "../../../../presentation/components/icons";
import { CapturaInbox } from "../../../../presentation/components/personal/captura-inbox";
import { BunkerDelDia } from "../../../../presentation/components/personal/bunker-del-dia";
import { PanelPendientes } from "../../../../presentation/components/personal/panel-pendientes";
import { PanelRetorno } from "../../../../presentation/components/personal/panel-retorno";
import { PanelObjetivos } from "../../../../presentation/components/personal/panel-objetivos";
import { TarjetaHabitos } from "../../../../presentation/components/personal/tarjeta-habitos";
import { GestionarObjetivosUseCase } from "../../../../application/use-cases/personal/gestionar-objetivos.use-case";
import { obtenerDiaTareaHoy } from "../../../../domain/entidades/personal.entity";

const objetivosUseCase = new GestionarObjetivosUseCase();

type Horizonte = "dia" | "semana" | "mes";

const HORIZONTES: {
  id: Horizonte;
  label: string;
  icono: keyof typeof Icono;
}[] = [
  { id: "dia", label: "Día", icono: "Sunrise" },
  { id: "semana", label: "Semana", icono: "ListTodo" },
  { id: "mes", label: "Mes", icono: "Target" },
];

const breadcrumbs = [
  { label: "Personal", href: "/dashboard/personal/hoy" },
  { label: "Hoy" },
];

const DESCRIPCION_HORIZONTE: Record<Horizonte, string> = {
  dia: "Anotá lo que se te ocurra y resolvé el día con lo justo: 1 foco + hasta 3 de mantenimiento.",
  semana:
    "Lo que sí o sí tenés que hacer aunque no entre en el foco de hoy, ordenado por prioridad — como en una guardia.",
  mes: "Tus objetivos cuantitativos y el ritmo real para llegar a cada uno, recalculado solo.",
};

/**
 * Área Personal separada por horizonte temporal — antes todo (retorno,
 * hábitos, bandeja, búnker, pendientes) vivía apilado en una sola pantalla,
 * mezclando lo que se resuelve hoy con lo que se revisa una vez por semana o
 * una vez por mes. Cada estación muestra solo lo que corresponde a su
 * horizonte, sin ritual de repaso completo para volver a estar al día.
 */
export default function PersonalHoyPage() {
  const [horizonte, setHorizonte] = useState<Horizonte>("dia");

  // Se corre una vez al entrar (no en segundo plano): marca vencidos los
  // objetivos que ya pasaron su fecha límite, para que el panel de retorno
  // y la vista de Mes los muestren de una sin que el usuario tenga que ir a
  // buscarlos.
  useEffect(() => {
    void objetivosUseCase.marcarVencidosSiCorresponde(obtenerDiaTareaHoy());
  }, []);

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Personal
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {DESCRIPCION_HORIZONTE[horizonte]}
          </p>
        </div>

        <div className="flex gap-1 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-1">
          {HORIZONTES.map((h) => {
            const Icon = Icono[h.icono];
            return (
              <button
                key={h.id}
                onClick={() => setHorizonte(h.id)}
                className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all ${
                  horizonte === h.id
                    ? "bg-[#10B981] text-zinc-950"
                    : "text-zinc-400 hover:bg-[#232326] hover:text-zinc-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {h.label}
              </button>
            );
          })}
        </div>

        {horizonte === "dia" && (
          <div className="flex flex-col gap-6">
            <PanelRetorno />
            <TarjetaHabitos />
            <CapturaInbox />
            <BunkerDelDia />
          </div>
        )}

        {horizonte === "semana" && <PanelPendientes />}

        {horizonte === "mes" && <PanelObjetivos />}
      </div>
    </MainLayout>
  );
}
