"use client";

import React, { useState, useEffect } from "react";
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

type TabDetalle =
  | "roadmap"
  | "documentos"
  | "archivos"
  | "comentarios"
  | "general"
  | "stack"
  | "backlog"
  | "sprints"
  | "kanban"
  | "negocio"
  | "contexto-ia";

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
  const [tab, setTab] = useState<TabDetalle>("roadmap");
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

  useEffect(() => {
    const seed = async () => {
      const cnt = await db.proyectos.count();
      if (cnt === 0) {
        await crearUC.ejecutar({
          id: "pro_1",
          nombre: "E-Commerce Plataforma Esmeralda",
          clienteId: "cli_1",
          descripcion: "Desarrollo completo de tienda con checkout local.",
          tipo: "E-commerce",
          estado: "Desarrollo",
          fechaInicio: "2026-06-01",
          fechaEntrega: "2026-08-01",
          repositorio: "github.com/matecode/esmeralda-shop",
          urlProduccion: "https://esmeralda-shop.com",
          urlDesarrollo: "https://dev.esmeralda-shop.com",
        });
      }
    };
    void seed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

          <div className="flex gap-2 overflow-x-auto border-b border-[#2A2A2E]">
            {(
              [
                { id: "roadmap", label: "Roadmap / Tareas" },
                { id: "stack", label: "Stack y Estándares" },
                { id: "negocio", label: "Product Owner" },
                { id: "backlog", label: "Backlog" },
                { id: "sprints", label: "Planificador Sprints" },
                { id: "kanban", label: "Kanban" },
                { id: "contexto-ia", label: "Contexto IA" },
                { id: "documentos", label: "Documentación" },
                { id: "archivos", label: "Archivos Adjuntos" },
                { id: "comentarios", label: "Comentarios & Chat" },
                { id: "general", label: "Información General" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`border-b-2 px-4 py-2.5 font-mono text-xs font-bold tracking-wide whitespace-nowrap transition-all ${
                  tab === t.id
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6">
            {tab === "roadmap" && (
              <VistaRoadmap proyectoId={proyectoSeleccionado.id} />
            )}
            {tab === "stack" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            {tab === "negocio" && (
              <div className="flex flex-col gap-6">
                <MarkdownEditor
                  initialValues={proyectoSeleccionado.productOwner}
                  onSave={handleSaveProductOwner}
                />
                <FinancialPanel
                  proyectoId={proyectoSeleccionado.id}
                  clienteId={proyectoSeleccionado.clienteId}
                  initialFinanciero={proyectoSeleccionado.financiero}
                  onSave={handleSaveFinanciero}
                />
              </div>
            )}
            {tab === "backlog" && (
              <BacklogBoard proyectoId={proyectoSeleccionado.id} />
            )}
            {tab === "sprints" && (
              <SprintPlanner proyectoId={proyectoSeleccionado.id} />
            )}
            {tab === "kanban" && (
              <KanbanBoard proyectoId={proyectoSeleccionado.id} />
            )}
            {tab === "contexto-ia" && (
              <PromptGenerator proyectoId={proyectoSeleccionado.id} />
            )}
            {tab === "documentos" && (
              <VistaDocumentos proyectoId={proyectoSeleccionado.id} />
            )}
            {tab === "archivos" && (
              <VistaArchivos proyectoId={proyectoSeleccionado.id} />
            )}
            {tab === "comentarios" && (
              <VistaComentarios proyectoId={proyectoSeleccionado.id} />
            )}
            {tab === "general" && (
              <VistaGeneral proyecto={proyectoSeleccionado} />
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
            <p className="mt-1 text-sm text-zinc-400">
              Fidelización, desarrollos activos, release notes e integraciones
              de repositorio.
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
