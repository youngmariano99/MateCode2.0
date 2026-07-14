"use client";

import React, { useState } from "react";
import { MainLayout } from "../../../presentation/components/layout";
import { Card } from "../../../presentation/components/card";
import { Button } from "../../../presentation/components/button";
import { useToast } from "../../../presentation/hooks/useToast";
import { Icono } from "../../../presentation/components/icons";
import { db } from "../../../offline/dexie/db";
import { useLiveQuery } from "dexie-react-hooks";
import { CrearProyectoUseCase } from "../../../application/use-cases/proyecto/crear-proyecto.use-case";
import { ActualizarProyectoUseCase } from "../../../application/use-cases/proyecto/actualizar-proyecto.use-case";
import {
  GestionarIngenieriaUseCase,
  StackConfig,
  EstandaresConfig,
  ProductOwnerConfig,
  FinancieroConfig,
} from "../../../application/use-cases/proyecto/gestionar-ingenieria.use-case";

// Sub-views
import { VistaRoadmap } from "../../../presentation/components/proyectos/vista-roadmap";
import { VistaDocumentos } from "../../../presentation/components/proyectos/vista-documentos";
import { VistaArchivos } from "../../../presentation/components/proyectos/vista-archivos";
import { VistaComentarios } from "../../../presentation/components/proyectos/vista-comentarios";
import { ModalProyecto } from "../../../presentation/components/proyectos/modal-proyecto";
import { VistaGeneral } from "../../../presentation/components/proyectos/vista-general";

// Engineering sub-views
import { StackSelector } from "../../../presentation/components/proyectos/stack-selector";
import { StandardSelector } from "../../../presentation/components/proyectos/standard-selector";
import { MarkdownEditor } from "../../../presentation/components/proyectos/markdown-editor";
import { BacklogBoard } from "../../../presentation/components/proyectos/backlog-board";
import { SprintPlanner } from "../../../presentation/components/proyectos/sprint-planner";
import { KanbanBoard } from "../../../presentation/components/proyectos/kanban-board";
import { FinancialPanel } from "../../../presentation/components/proyectos/financial-panel";
import { PromptGenerator } from "../../../presentation/components/proyectos/prompt-generator";

type FaseCicloVida =
  "negocio" | "arquitectura" | "planificacion" | "ejecucion" | "cierre";

interface ProyectoCRM {
  id: string;
  nombre: string;
  clienteId: string;
  descripcion?: string;
  tipo: string;
  estado: string;
  fechaInicio?: string;
  fechaEntrega?: string;
  repositorio?: string;
  urlProduccion?: string;
  urlDesarrollo?: string;
  observaciones?: string;
  stack?: Record<string, string[]>;
  estandares?: Record<string, unknown>;
  productOwner?: Record<string, string>;
  financiero?: Record<string, unknown>;
}

const ESTADOS_PROYECTO = [
  "Pendiente",
  "Análisis",
  "Diseño",
  "Desarrollo",
  "Testing",
  "Producción",
  "Finalizado",
];

const TIPOS_PROYECTO = [
  "Landing Page",
  "Sitio Web",
  "Sistema Web",
  "Aplicación Móvil",
  "E-commerce",
  "Automatización",
  "Diseño",
  "Branding",
  "Consultoría",
  "Otro",
];

export default function ProyectosPage() {
  const { mostrarToast } = useToast();
  const crearUC = new CrearProyectoUseCase();
  const actualizarUC = new ActualizarProyectoUseCase();

  const [proyectoSeleccionado, setProyectoSeleccionado] =
    useState<ProyectoCRM | null>(null);

  // Guided development lifecycle active phase
  const [faseActiva, setFaseActiva] = useState<FaseCicloVida>("negocio");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [proyectoEdicion, setProyectoEdicion] = useState<ProyectoCRM | null>(
    null
  );

  const rawProyectos = useLiveQuery(() => db.proyectos.toArray()) || [];
  const proyectos = rawProyectos as unknown as ProyectoCRM[];

  const rawClientes = useLiveQuery(() => db.clientes.toArray()) || [];
  const clientes = rawClientes.map((c) => ({
    id: c.id as string,
    nombre: c.nombre as string,
  }));

  const abrirCreacion = () => {
    if (clientes.length === 0) {
      mostrarToast(
        "Debes registrar al menos un cliente en el CRM antes de crear proyectos.",
        "error"
      );
      return;
    }
    setProyectoEdicion(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (p: ProyectoCRM) => {
    setProyectoEdicion(p);
    setModalAbierto(true);
  };

  const guardarProyecto = async (payload: Partial<ProyectoCRM>) => {
    if (proyectoEdicion) {
      const res = await actualizarUC.ejecutar(
        proyectoEdicion.id,
        payload as Record<string, unknown>
      );
      if (res.ok) {
        mostrarToast("Proyecto actualizado con éxito.", "exito");
        if (proyectoSeleccionado?.id === proyectoEdicion.id) {
          setProyectoSeleccionado({ ...proyectoSeleccionado, ...payload });
        }
      }
    } else {
      const res = await crearUC.ejecutar(payload as Record<string, unknown>);
      if (res.ok) {
        mostrarToast("Proyecto creado con éxito.", "exito");
      }
    }
    setModalAbierto(false);
  };

  const handleSaveTechnical = async (payload: {
    stack?: Record<string, string[]>;
    estandares?: Record<string, unknown>;
  }) => {
    if (!proyectoSeleccionado) return;
    const uc = new GestionarIngenieriaUseCase();
    const nextStack = payload.stack ||
      proyectoSeleccionado.stack || {
        frontend: [],
        backend: [],
        baseDatos: [],
        infraestructura: [],
        seguridad: [],
        integraciones: [],
      };
    const nextEstandares = payload.estandares ||
      proyectoSeleccionado.estandares || {
        arquitectura: [],
        patrones: [],
        buenasPracticas: [],
        principios: [],
        testing: [],
        devops: [],
        coberturaMinima: 80,
      };

    const res = await uc.configurarStackYEstandares(
      proyectoSeleccionado.id,
      nextStack as unknown as StackConfig,
      nextEstandares as unknown as EstandaresConfig
    );
    if (res.ok) {
      mostrarToast("Configuración técnica guardada offline.", "exito");
      setProyectoSeleccionado({
        ...proyectoSeleccionado,
        stack: nextStack,
        estandares: nextEstandares,
      });
    }
  };

  const handleSaveProductOwner = async (po: Record<string, string>) => {
    if (!proyectoSeleccionado) return;
    const uc = new GestionarIngenieriaUseCase();
    const res = await uc.guardarProductOwner(
      proyectoSeleccionado.id,
      po as unknown as ProductOwnerConfig
    );
    if (res.ok) {
      mostrarToast("Detalles de Product Owner guardados offline.", "exito");
      setProyectoSeleccionado({
        ...proyectoSeleccionado,
        productOwner: po,
      });
    }
  };

  const handleSaveFinanciero = async (fin: Record<string, unknown>) => {
    if (!proyectoSeleccionado) return;
    const uc = new GestionarIngenieriaUseCase();
    const res = await uc.guardarFinanciero(
      proyectoSeleccionado.id,
      fin as unknown as FinancieroConfig
    );
    if (res.ok) {
      mostrarToast("Información financiera del presupuesto guardada.", "exito");
      setProyectoSeleccionado({
        ...proyectoSeleccionado,
        financiero: fin,
      });
    }
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Workspace de Proyectos" },
  ];

  if (proyectoSeleccionado) {
    const cliNombre =
      clientes.find((c) => c.id === proyectoSeleccionado.clienteId)?.nombre ||
      "Sin cliente";

    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col gap-6">
          {/* Details header */}
          <div className="flex flex-col justify-between gap-4 border-b border-[#2A2A2E] pb-5 md:flex-row md:items-center">
            <div>
              <button
                onClick={() => setProyectoSeleccionado(null)}
                className="mb-2 flex items-center gap-1.5 font-mono text-xs font-bold text-zinc-400 hover:text-zinc-200"
              >
                ← Volver al listado
              </button>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                {proyectoSeleccionado.nombre}
              </h1>
              <p className="mt-0.5 font-mono text-xs tracking-wide text-zinc-500 uppercase">
                Cliente: {cliNombre} • Tipo: {proyectoSeleccionado.tipo}
              </p>
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs font-bold text-emerald-400 select-none">
                Estado: {proyectoSeleccionado.estado}
              </span>
              <Button onClick={() => abrirEdicion(proyectoSeleccionado)}>
                Editar Proyecto
              </Button>
            </div>
          </div>

          {/* Guided lifecycle step timeline */}
          <div className="rounded-2xl border border-[#2A2A2E] bg-zinc-950/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="font-mono text-[9px] font-bold tracking-widest text-zinc-400 uppercase">
                Ciclo de Vida del Desarrollo (Guía de Fases)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                {
                  id: "negocio",
                  num: "1",
                  title: "Concepción",
                  desc: "Presupuestos y Requerimientos PO",
                },
                {
                  id: "arquitectura",
                  num: "2",
                  title: "Arquitectura",
                  desc: "Definir Stack y Estándares",
                },
                {
                  id: "planificacion",
                  num: "3",
                  title: "Planificación",
                  desc: "Biblioteca y Backlog de Sprints",
                },
                {
                  id: "ejecucion",
                  num: "4",
                  title: "Ejecución",
                  desc: "Tablero Ágil Kanban",
                },
                {
                  id: "cierre",
                  num: "5",
                  title: "Entrega & Docs",
                  desc: "Prompts IA, Wiki y Archivos",
                },
              ].map((step) => {
                const isActive = faseActiva === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => setFaseActiva(step.id as FaseCicloVida)}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left font-mono transition-all select-none ${
                      isActive
                        ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-400 shadow-md"
                        : "border-[#2A2A2E] bg-zinc-950/60 text-zinc-500 hover:border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-5.5 w-5.5 items-center justify-center rounded-full text-[10px] font-bold ${
                          isActive
                            ? "bg-emerald-500 font-extrabold text-black"
                            : "bg-zinc-900 text-zinc-500"
                        }`}
                      >
                        {step.num}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-200">
                        {step.title}
                      </span>
                    </div>
                    <span className="mt-0.5 line-clamp-1 text-[8px] leading-normal text-zinc-500">
                      {step.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Combined workspace grid rendering for reduced clicks */}
          <div className="animate-in fade-in grid grid-cols-1 gap-6 duration-200">
            {faseActiva === "negocio" && (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <VistaGeneral proyecto={proyectoSeleccionado} />
                  <FinancialPanel
                    proyectoId={proyectoSeleccionado.id}
                    clienteId={proyectoSeleccionado.clienteId}
                    initialFinanciero={proyectoSeleccionado.financiero}
                    onSave={handleSaveFinanciero}
                  />
                </div>
                <MarkdownEditor
                  initialValues={proyectoSeleccionado.productOwner}
                  onSave={handleSaveProductOwner}
                />
              </div>
            )}

            {faseActiva === "arquitectura" && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <StackSelector
                  proyectoId={proyectoSeleccionado.id}
                  initialStack={proyectoSeleccionado.stack}
                  onSave={(stack) => handleSaveTechnical({ stack })}
                />
                <StandardSelector
                  initialEstandares={proyectoSeleccionado.estandares}
                  onSave={(estandares) => handleSaveTechnical({ estandares })}
                />
              </div>
            )}

            {faseActiva === "planificacion" && (
              <div className="grid grid-cols-1 gap-6">
                <BacklogBoard proyectoId={proyectoSeleccionado.id} />
                <SprintPlanner proyectoId={proyectoSeleccionado.id} />
              </div>
            )}

            {faseActiva === "ejecucion" && (
              <KanbanBoard proyectoId={proyectoSeleccionado.id} />
            )}

            {faseActiva === "cierre" && (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <PromptGenerator proyectoId={proyectoSeleccionado.id} />
                  <VistaRoadmap proyectoId={proyectoSeleccionado.id} />
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <VistaDocumentos proyectoId={proyectoSeleccionado.id} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <VistaArchivos proyectoId={proyectoSeleccionado.id} />
                    <VistaComentarios proyectoId={proyectoSeleccionado.id} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Workspace de Proyectos
            </h1>
            <p className="mt-1 font-mono text-sm text-zinc-400">
              Fidelización, desarrollos activos, release notes e integración de
              contexto para IA.
            </p>
          </div>
          <Button
            onClick={abrirCreacion}
            icono={<Icono.Plus className="h-4 w-4" />}
          >
            Crear Proyecto
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proyectos.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-[#2A2A2E] bg-[#18181B] py-10 text-center text-zinc-500 italic">
              No tienes proyectos registrados. Comienza creando tu primer
              proyecto.
            </div>
          ) : (
            proyectos.map((p) => {
              const clientName =
                clientes.find((c) => c.id === p.clienteId)?.nombre ||
                "Cargando...";
              return (
                <Card key={p.id}>
                  <div className="flex items-start justify-between gap-3">
                    <h3
                      onClick={() => setProyectoSeleccionado(p)}
                      className="block cursor-pointer text-xs font-bold text-zinc-200 transition-all hover:text-emerald-400"
                    >
                      {p.nombre}
                    </h3>
                    <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400">
                      {p.estado}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-zinc-500">
                    Cliente: {clientName} • Tipo: {p.tipo}
                  </p>
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                    {p.descripcion || "Sin descripción adicional."}
                  </p>

                  <div className="mt-4 flex justify-end gap-3 border-t border-[#2A2A2E]/60 pt-3">
                    <Button onClick={() => setProyectoSeleccionado(p)}>
                      Ingresar Workspace
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <ModalProyecto
          abierto={modalAbierto}
          proyectoEdicion={proyectoEdicion}
          onCerrar={() => setModalAbierto(false)}
          onConfirmar={guardarProyecto}
          estados={ESTADOS_PROYECTO}
          tipos={TIPOS_PROYECTO}
          clientes={clientes}
        />
      </div>
    </MainLayout>
  );
}
