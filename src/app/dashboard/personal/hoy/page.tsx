"use client";

import React, { useEffect, useState } from "react";
import { MainLayout } from "../../../../presentation/components/layout";
import { Icono } from "../../../../presentation/components/icons";
import { CapturaInbox } from "../../../../presentation/components/personal/captura-inbox";
import { BunkerDelDia } from "../../../../presentation/components/personal/bunker-del-dia";
import { PanelPendientes } from "../../../../presentation/components/personal/panel-pendientes";
import { PanelRetorno } from "../../../../presentation/components/personal/panel-retorno";
import { AvisoFasesPendientes } from "../../../../presentation/components/personal/aviso-fases-pendientes";
import { PanelRecuperarHabitos } from "../../../../presentation/components/personal/panel-recuperar-habitos";
import { NavegadorJerarquico } from "../../../../presentation/components/personal/navegador-jerarquico";
import { PanelEstadoGeneral } from "../../../../presentation/components/personal/panel-estado-general";
import { PlanificarSemanaIA } from "../../../../presentation/components/personal/planificar-con-ia";
import { TarjetaHabitos } from "../../../../presentation/components/personal/tarjeta-habitos";
import { CalendarioSemanal } from "../../../../presentation/components/personal/calendario-semanal";
import { CalendarioMensual } from "../../../../presentation/components/personal/calendario-mensual";
import { GestionarObjetivosUseCase } from "../../../../application/use-cases/personal/gestionar-objetivos.use-case";
import { MaterializarActividadesDelDiaUseCase } from "../../../../application/use-cases/personal/materializar-actividades-del-dia.use-case";
import { obtenerDiaTareaHoy } from "../../../../domain/entidades/personal.entity";

const objetivosUseCase = new GestionarObjetivosUseCase();
const materializarUseCase = new MaterializarActividadesDelDiaUseCase();

type Horizonte = "dia" | "semana" | "mes" | "cal_semana" | "cal_mes";

const HORIZONTES: {
  id: Horizonte;
  label: string;
  icono: keyof typeof Icono;
}[] = [
  { id: "dia", label: "Día", icono: "Sunrise" },
  { id: "semana", label: "Semana", icono: "ListTodo" },
  { id: "mes", label: "Mes", icono: "Target" },
  { id: "cal_semana", label: "Cal. semana", icono: "Calendario" },
  { id: "cal_mes", label: "Cal. mes", icono: "Calendario" },
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
  cal_semana:
    "La semana completa de un vistazo, coloreada por Área, para corroborar que la planificación quedó bien armada.",
  cal_mes:
    "El mes completo de un vistazo — click en un día para ver el detalle.",
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
  // buscarlos; y materializa la Actividad de hoy de cada Entregable
  // recurrente aplicable (ver Sprint 20 §2/§4) — así "Contacto en frío
  // Lun-Vie" aparece solo, sin recrearlo cada semana.
  useEffect(() => {
    const hoy = obtenerDiaTareaHoy();
    void objetivosUseCase.marcarVencidosSiCorresponde(hoy);
    void materializarUseCase.ejecutar(hoy);
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
            <AvisoFasesPendientes />
            <PanelRecuperarHabitos />
            <TarjetaHabitos />
            <CapturaInbox />
            <BunkerDelDia />
          </div>
        )}

        {horizonte === "semana" && (
          <div className="flex flex-col gap-4">
            <PlanificarSemanaIA />
            <PanelPendientes />
          </div>
        )}

        {horizonte === "mes" && (
          <div className="flex flex-col gap-6">
            <PanelEstadoGeneral />
            <NavegadorJerarquico />
          </div>
        )}

        {horizonte === "cal_semana" && <CalendarioSemanal />}

        {horizonte === "cal_mes" && <CalendarioMensual />}
      </div>
    </MainLayout>
  );
}
