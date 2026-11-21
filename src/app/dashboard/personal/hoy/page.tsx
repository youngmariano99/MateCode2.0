"use client";

import React, { useEffect, useState } from "react";
import { MainLayout } from "../../../../presentation/components/layout";
import { Button } from "../../../../presentation/components/button";
import { Icono } from "../../../../presentation/components/icons";
import { CapturaInbox } from "../../../../presentation/components/personal/captura-inbox";
import { BunkerDelDia } from "../../../../presentation/components/personal/bunker-del-dia";
import { PanelCheckpointSemanal } from "../../../../presentation/components/personal/panel-checkpoint-semanal";
import { PanelFondoFaltantes } from "../../../../presentation/components/personal/panel-fondo-faltantes";
import { PanelPendientes } from "../../../../presentation/components/personal/panel-pendientes";
import { PanelEstadisticasPersonal } from "../../../../presentation/components/personal/panel-estadisticas-personal";
import { PanelTiempoProyectos } from "../../../../presentation/components/personal/panel-tiempo-proyectos";
import { PanelMetasPeriodo } from "../../../../presentation/components/personal/panel-metas-periodo";
import { AvisoMinimos } from "../../../../presentation/components/personal/aviso-minimos";
import { AvisoFasesPendientes } from "../../../../presentation/components/personal/aviso-fases-pendientes";
import { PanelRecuperarHabitos } from "../../../../presentation/components/personal/panel-recuperar-habitos";
import { PanelEstadoGeneral } from "../../../../presentation/components/personal/panel-estado-general";
import { TarjetaHabitos } from "../../../../presentation/components/personal/tarjeta-habitos";
import { CalendarioSemanal } from "../../../../presentation/components/personal/calendario-semanal";
import { CalendarioMensual } from "../../../../presentation/components/personal/calendario-mensual";
import { TareaRapida } from "../../../../presentation/components/personal/tarea-rapida";
import { GuiaProcedimientoPlanificacion } from "../../../../presentation/components/personal/guia-procedimiento-planificacion";
import { ArbolJerarquicoPersonal } from "../../../../presentation/components/personal/arbol-jerarquico-personal";
import {
  BotonCrearUniversal,
  type TipoElementoCrear,
} from "../../../../presentation/components/personal/modal-crear-elemento-personal";
import { WizardPlanificacionPersonal } from "../../../../presentation/components/personal/wizard-planificacion-personal";
import { SemaforoHorizontes } from "../../../../presentation/components/personal/semaforo-horizontes";
import { ModalPlanificarSemana } from "../../../../presentation/components/personal/modal-planificar-semana";
import { ModalPlanificarMes } from "../../../../presentation/components/personal/modal-planificar-mes";
import { GestionarObjetivosUseCase } from "../../../../application/use-cases/personal/gestionar-objetivos.use-case";
import { MaterializarActividadesDelDiaUseCase } from "../../../../application/use-cases/personal/materializar-actividades-del-dia.use-case";
import { EliminarNodoPersonalUseCase } from "../../../../application/use-cases/personal/eliminar-nodo-personal.use-case";
import { GestionarFasesUseCase } from "../../../../application/use-cases/personal/gestionar-fases.use-case";
import { rangoDelMes } from "../../../../domain/entidades/diagnostico-planificacion.entity";
import {
  lunesDeLaSemana,
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../../domain/entidades/personal.entity";

const objetivosUseCase = new GestionarObjetivosUseCase();
const materializarUseCase = new MaterializarActividadesDelDiaUseCase();
const fasesUseCase = new GestionarFasesUseCase();
const eliminarNodoUseCase = new EliminarNodoPersonalUseCase();

type Horizonte = "dia" | "semana" | "mes" | "mapa" | "stats";

const HORIZONTES: {
  id: Horizonte;
  label: string;
  icono: keyof typeof Icono;
}[] = [
  { id: "dia", label: "Hoy", icono: "Sunrise" },
  { id: "semana", label: "Semana", icono: "Calendario" },
  { id: "mes", label: "Mes", icono: "Target" },
  { id: "mapa", label: "Anual / Mapa", icono: "Proyectos" },
  { id: "stats", label: "Estadísticas", icono: "TrendingUp" },
];

const breadcrumbs = [
  { label: "Personal", href: "/dashboard/personal/hoy" },
  { label: "Planificación" },
];

const DESCRIPCION_HORIZONTE: Record<Horizonte, string> = {
  dia: "Foco exclusivo en hoy: completá tus actividades del día, anotá qué hiciste y pasá a Oficina.",
  semana:
    "Foco exclusivo en esta semana: checkpoint semanal (stats y decisiones de faltantes), reserva de pendientes y calendario de 7 días.",
  mes: "Foco exclusivo en el mes actual: calibración de fases del mes, metas vigentes de este mes y calendario mensual.",
  mapa: "Recorrido proyectado completo (Área → Objetivo → Proyecto → Entregable → Fases proyectadas) y estado general.",
  stats:
    "Cómo te fue por semana, mes o año: cumplimiento, qué no se hizo y por qué, y qué mejorar.",
};

const TIPO_CREAR_POR_HORIZONTE: Record<Horizonte, TipoElementoCrear> = {
  dia: "tarea",
  semana: "tarea",
  mes: "fase",
  mapa: "objetivo",
  stats: "tarea",
};

export default function PersonalHoyPage() {
  const [horizonte, setHorizonte] = useState<Horizonte>("dia");
  const [wizardAbierto, setWizardAbierto] = useState(false);
  const [modalPlanificarSemana, setModalPlanificarSemana] = useState(false);
  const [modalPlanificarMes, setModalPlanificarMes] = useState(false);

  const hoy = obtenerDiaTareaHoy();
  const { inicioMes, finMes } = rangoDelMes(hoy);

  useEffect(() => {
    const fechaHoy = obtenerDiaTareaHoy();
    void objetivosUseCase.marcarVencidosSiCorresponde(fechaHoy);
    void materializarUseCase.ejecutar(fechaHoy);
    void eliminarNodoUseCase
      .limpiarHuerfanos()
      .then(() => fasesUseCase.limpiarFasesHuerfanas());
  }, []);

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Planificación Personal
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {DESCRIPCION_HORIZONTE[horizonte]}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setWizardAbierto(true)}
              icono={<Icono.Sparkles className="h-4 w-4" />}
            >
              Armar Plan (Paso a Paso)
            </Button>
            <BotonCrearUniversal
              tipoPorDefecto={TIPO_CREAR_POR_HORIZONTE[horizonte]}
            />
          </div>
        </div>

        {/* Semáforo de Horizontes y Estado de Planificación en Tiempo Real */}
        <SemaforoHorizontes
          onAbrirWizardGeneral={() => setWizardAbierto(true)}
        />

        <div className="flex flex-wrap gap-1 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-1">
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
          <div className="flex flex-col gap-5">
            <GuiaProcedimientoPlanificacion
              horizonte="dia"
              onAbrirWizard={() => setWizardAbierto(true)}
            />
            <TareaRapida />
            <BunkerDelDia />
            <TarjetaHabitos />
            <PanelRecuperarHabitos />
            <CapturaInbox />
          </div>
        )}

        {horizonte === "semana" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
              <div className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                  <Icono.Calendario className="h-4 w-4 text-sky-400" />
                  Planificación Semanal Táctica (Tope Estricto de 7 Días)
                </span>
                <p className="text-xs text-zinc-400">
                  Auditá el 80% de cumplimiento de la semana previa, definí el
                  reparto semanal y controlá el techo cognitivo.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setModalPlanificarSemana(true)}
                className="bg-sky-500 font-bold text-zinc-950 hover:bg-sky-600"
              >
                ⚡ Planificar Próxima Semana (7 Días)
              </Button>
            </div>

            <GuiaProcedimientoPlanificacion
              horizonte="semana"
              onAbrirWizard={() => setWizardAbierto(true)}
            />
            <PanelCheckpointSemanal />
            <PanelFondoFaltantes />
            <CalendarioSemanal />
            <PanelPendientes />
            <PanelTiempoProyectos
              desde={lunesDeLaSemana(hoy)}
              hasta={sumarDias(lunesDeLaSemana(hoy), 6)}
              titulo="Tiempo por proyecto (esta semana)"
            />
          </div>
        )}

        {horizonte === "mes" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                  <Icono.Target className="h-4 w-4 text-amber-400" />
                  Sprint Mensual (Tope de 30 Días — WIP Limit = 1)
                </span>
                <p className="text-xs text-zinc-400">
                  Fijá el único proyecto de construcción para el mes con buffer
                  x1.5 y banda aceptable del 70%.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setModalPlanificarMes(true)}
                className="bg-amber-500 font-bold text-zinc-950 hover:bg-amber-600"
              >
                🎯 Planificar Mes (30 Días)
              </Button>
            </div>

            <GuiaProcedimientoPlanificacion
              horizonte="mes"
              onAbrirWizard={() => setWizardAbierto(true)}
            />
            <AvisoFasesPendientes />
            <AvisoMinimos />
            <PanelMetasPeriodo
              desde={inicioMes}
              hasta={finMes}
              titulo={`Metas exclusivas de este mes (${inicioMes} → ${finMes})`}
            />
            <CalendarioMensual />
          </div>
        )}

        {horizonte === "mapa" && (
          <div className="flex flex-col gap-5">
            <GuiaProcedimientoPlanificacion
              horizonte="mapa"
              onAbrirWizard={() => setWizardAbierto(true)}
            />
            <PanelEstadoGeneral />
            <ArbolJerarquicoPersonal
              onAbrirWizard={() => setWizardAbierto(true)}
            />
          </div>
        )}

        {horizonte === "stats" && <PanelEstadisticasPersonal />}

        <WizardPlanificacionPersonal
          abierto={wizardAbierto}
          onCerrar={() => setWizardAbierto(false)}
        />

        <ModalPlanificarSemana
          abierto={modalPlanificarSemana}
          onCerrar={() => setModalPlanificarSemana(false)}
        />

        <ModalPlanificarMes
          abierto={modalPlanificarMes}
          onCerrar={() => setModalPlanificarMes(false)}
        />
      </div>
    </MainLayout>
  );
}
