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
import { EliminarProyectoUseCase } from "../../../application/use-cases/proyecto/eliminar-proyecto.use-case";

// Sub-views
import { VistaRoadmap } from "../../../presentation/components/proyectos/vista-roadmap";
import { VistaDocumentos } from "../../../presentation/components/proyectos/vista-documentos";
import { VistaArchivos } from "../../../presentation/components/proyectos/vista-archivos";
import { VistaComentarios } from "../../../presentation/components/proyectos/vista-comentarios";
import { ModalProyecto } from "../../../presentation/components/proyectos/modal-proyecto";
import { VistaGeneral } from "../../../presentation/components/proyectos/vista-general";
import { ModalImportarProyecto } from "../../../presentation/components/proyectos/modal-importar-proyecto";

// Engineering sub-views
import { StackSelector } from "../../../presentation/components/proyectos/stack-selector";
import { StandardSelector } from "../../../presentation/components/proyectos/standard-selector";
import { MarkdownEditor } from "../../../presentation/components/proyectos/markdown-editor";
import { RelevamientoWorkspace } from "../../../presentation/components/proyectos/relevamiento-workspace";
import { BacklogBoard } from "../../../presentation/components/proyectos/backlog-board";
import { SprintPlanner } from "../../../presentation/components/proyectos/sprint-planner";
import { DesarrolloWorkspace } from "../../../presentation/components/proyectos/desarrollo-workspace";
import { FinancialPanel } from "../../../presentation/components/proyectos/financial-panel";
import { PromptGenerator } from "../../../presentation/components/proyectos/prompt-generator";
import { DesignSystemForm } from "../../../presentation/components/proyectos/design-system-form";
import { Drawer } from "../../../presentation/components/proyectos/drawer";
import { SummaryCard } from "../../../presentation/components/proyectos/summary-card";
import { PlanoGeneralBacklog } from "../../../presentation/components/proyectos/plano-general-backlog";
import { PlanificacionIAWorkspace } from "../../../presentation/components/proyectos/planificacion-ia-workspace";

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
  stack?: StackConfig;
  estandares?: EstandaresConfig;
  productOwner?: ProductOwnerConfig;
  financiero?: FinancieroConfig;
  relevamientoNotasBrutas?: string;
  relevamientoMarkdown?: string;
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

const TIPOS_PROYECTO = ["Sistemas", "Landing/Institucional"];

interface ProyectoCardProps {
  proyecto: ProyectoCRM;
  clientName: string;
  onSelect: (p: ProyectoCRM) => void;
  onEdit: (p: ProyectoCRM) => void;
  onDelete: (p: ProyectoCRM) => void;
}

const ProyectoCard: React.FC<ProyectoCardProps> = ({
  proyecto,
  clientName,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const tareas =
    useLiveQuery(
      () => db.tareas.where("proyectoId").equals(proyecto.id).toArray(),
      [proyecto.id]
    ) || [];

  const historias =
    useLiveQuery(
      () => db.historias.where("proyectoId").equals(proyecto.id).toArray(),
      [proyecto.id]
    ) || [];

  const totalTasks = tareas.length;
  const completedTasks = tareas.filter(
    (t) => t.estado === "done" || t.estado === "Finalizado"
  ).length;

  const totalStories = historias.length;
  const completedStories = historias.filter((s) => {
    const est = s["estado"];
    return (
      typeof est === "string" &&
      (est.toLowerCase() === "done" || est === "Finalizado" || est === "Done")
    );
  }).length;

  let progressPercent = 0;
  let progressText = "";
  if (totalTasks > 0) {
    progressPercent = Math.round((completedTasks / totalTasks) * 100);
    progressText = `${completedTasks} de ${totalTasks} actividades`;
  } else if (totalStories > 0) {
    progressPercent = Math.round((completedStories / totalStories) * 100);
    progressText = `${completedStories} de ${totalStories} historias`;
  } else {
    progressPercent = 0;
    progressText = "Sin tareas planificadas";
  }

  let timeBadgeColor = "border-zinc-850 bg-zinc-900/40 text-zinc-400";
  let timeText = "Sin fecha límite";

  if (proyecto.fechaEntrega) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveryDate = new Date(proyecto.fechaEntrega);
    deliveryDate.setHours(0, 0, 0, 0);

    const diffTime = deliveryDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
      const absDays = Math.abs(daysDiff);
      timeText = `Vencido hace ${absDays} d`;
      timeBadgeColor =
        "border-rose-500/20 bg-rose-500/10 text-rose-400 font-bold animate-pulse";
    } else if (daysDiff === 0) {
      timeText = "Vence hoy";
      timeBadgeColor =
        "border-rose-500/20 bg-rose-500/10 text-rose-400 font-bold animate-pulse";
    } else if (daysDiff <= 3) {
      timeText = `Faltan ${daysDiff} d`;
      timeBadgeColor =
        "border-rose-500/20 bg-rose-500/10 text-rose-400 font-bold";
    } else if (daysDiff <= 10) {
      timeText = `Faltan ${daysDiff} d`;
      timeBadgeColor =
        "border-amber-500/20 bg-amber-500/10 text-amber-400 font-bold";
    } else {
      timeText = `Faltan ${daysDiff} d`;
      timeBadgeColor =
        "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <h3
          onClick={() => onSelect(proyecto)}
          className="block cursor-pointer text-xs font-bold text-zinc-200 transition-all hover:text-emerald-400"
        >
          {proyecto.nombre}
        </h3>
        <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400">
          {proyecto.estado}
        </span>
      </div>
      <p className="mt-1 font-mono text-[10px] text-zinc-500">
        Cliente: {clientName} • Tipo: {proyecto.tipo}
      </p>

      {proyecto.descripcion && (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-zinc-400">
          {proyecto.descripcion}
        </p>
      )}

      {/* Progress Bar */}
      <div className="mt-4 flex flex-col gap-1">
        <div className="flex items-center justify-between font-mono text-[9px]">
          <span className="text-zinc-550">Progreso</span>
          <span className="font-bold text-emerald-400">{progressPercent}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full border border-zinc-800/40 bg-zinc-900">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="font-mono text-[8px] text-zinc-500">
          {progressText}
        </span>
      </div>

      {/* Time Planning Alarm */}
      <div className="mt-3.5 flex items-center justify-between border-t border-[#2A2A2E]/30 pt-2.5">
        <span className="font-mono text-[9px] text-zinc-500">Entrega</span>
        <span
          className={`rounded border px-1.5 py-0.5 font-mono text-[9px] ${timeBadgeColor}`}
        >
          {timeText}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#2A2A2E]/60 pt-3">
        <button
          onClick={() => onDelete(proyecto)}
          className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
          title="Eliminar Proyecto"
        >
          <Icono.Close className="h-4 w-4" />
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(proyecto)}
            className="text-zinc-450 rounded-xl border border-zinc-800 bg-transparent px-3 py-1.5 font-mono text-[10px] hover:bg-zinc-900 hover:text-zinc-200"
          >
            Editar
          </button>
          <Button onClick={() => onSelect(proyecto)}>Ingresar</Button>
        </div>
      </div>
    </Card>
  );
};

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

  const [moduloActivo, setModuloActivo] = useState<string | null>(null);
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [importarModalAbierto, setImportarModalAbierto] = useState(false);

  const currentDesignSystem = useLiveQuery(
    () => db.proyecto_design_system.get(proyectoSeleccionado?.id || ""),
    [proyectoSeleccionado]
  ) as Record<string, string> | undefined;

  const currentContexto = useLiveQuery(
    () => db.proyecto_contexto.get(proyectoSeleccionado?.id || ""),
    [proyectoSeleccionado]
  ) as Record<string, unknown> | undefined;

  const selectedProyectoTareas =
    useLiveQuery(
      () =>
        db.tareas
          .where("proyectoId")
          .equals(proyectoSeleccionado?.id || "")
          .toArray(),
      [proyectoSeleccionado]
    ) || [];

  const selectedProyectoHistorias =
    useLiveQuery(
      () =>
        db.historias
          .where("proyectoId")
          .equals(proyectoSeleccionado?.id || "")
          .toArray(),
      [proyectoSeleccionado]
    ) || [];

  const abrirModulo = (modulo: string) => {
    setModuloActivo(modulo);
    setDrawerAbierto(true);
  };

  const getTituloModulo = () => {
    switch (moduloActivo) {
      case "general":
        return "Información General del Proyecto";
      case "financiero":
        return "Presupuesto y Estructura Financiera";
      case "product_owner":
        return "Definición del Product Owner";
      case "relevamiento":
        return "Taller de Relevamiento & Resumen IA";
      case "stack":
        return "Stack Tecnológico Seleccionado";
      case "estandares":
        return "Estándares y Prácticas de Ingeniería";
      case "design_system":
        return "Design System & Metáforas Visuales";
      case "planificacion_ia":
        return "Planificación, Requerimientos y Sitemap (IA)";
      case "backlog":
        return "Gestión del Backlog de Ingeniería";
      case "sprints":
        return "Planificación de Sprints";
      case "plano_backlog":
        return "Plano General del Proyecto (Roadmap de Avance)";
      case "prompts":
        return "Generador de Prompts IA & Sincronización";
      case "roadmap":
        return "Roadmap Temporal del Proyecto";
      case "documentos":
        return "Biblioteca de Wiki & Documentos";
      case "archivos":
        return "Repositorio de Archivos y Assets";
      case "comentarios":
        return "Garantías y Mejoras";
      default:
        return "Detalle del Módulo";
    }
  };

  const renderContenidoModulo = () => {
    if (!proyectoSeleccionado) return null;
    switch (moduloActivo) {
      case "general":
        return <VistaGeneral proyecto={proyectoSeleccionado} />;
      case "financiero":
        return (
          <FinancialPanel
            proyectoId={proyectoSeleccionado.id}
            clienteId={proyectoSeleccionado.clienteId}
            initialFinanciero={proyectoSeleccionado.financiero}
            onSave={async (fin) => {
              await handleSaveFinanciero(fin);
              setDrawerAbierto(false);
            }}
          />
        );
      case "product_owner":
        return (
          <MarkdownEditor
            initialValues={proyectoSeleccionado.productOwner}
            onSave={async (po) => {
              await handleSaveProductOwner(po);
              setDrawerAbierto(false);
            }}
          />
        );
      case "relevamiento":
        return (
          <RelevamientoWorkspace
            proyectoId={proyectoSeleccionado.id}
            tipoProyecto={proyectoSeleccionado.tipo}
            onSave={async (notasBrutas, markdown) => {
              setProyectoSeleccionado({
                ...proyectoSeleccionado,
                relevamientoNotasBrutas: notasBrutas,
                relevamientoMarkdown: markdown,
              } as ProyectoCRM);
              setDrawerAbierto(false);
            }}
          />
        );
      case "stack":
        return (
          <StackSelector
            proyectoId={proyectoSeleccionado.id}
            initialStack={proyectoSeleccionado.stack}
            onSave={async (stack) => {
              await handleSaveTechnical({ stack });
              setDrawerAbierto(false);
            }}
          />
        );
      case "estandares":
        return (
          <StandardSelector
            proyectoId={proyectoSeleccionado.id}
            initialEstandares={proyectoSeleccionado.estandares}
            onSave={async (estandares) => {
              await handleSaveTechnical({ estandares });
              setDrawerAbierto(false);
            }}
          />
        );

      case "design_system":
        return <DesignSystemForm proyectoId={proyectoSeleccionado.id} />;
      case "planificacion_ia":
        return (
          <PlanificacionIAWorkspace proyectoId={proyectoSeleccionado.id} />
        );
      case "backlog":
        return <BacklogBoard proyectoId={proyectoSeleccionado.id} />;
      case "sprints":
        return <SprintPlanner proyectoId={proyectoSeleccionado.id} />;
      case "plano_backlog":
        return <PlanoGeneralBacklog proyectoId={proyectoSeleccionado.id} />;
      case "prompts":
        return <PromptGenerator proyectoId={proyectoSeleccionado.id} />;
      case "roadmap":
        return <VistaRoadmap proyectoId={proyectoSeleccionado.id} />;
      case "documentos":
        return <VistaDocumentos proyectoId={proyectoSeleccionado.id} />;
      case "archivos":
        return <VistaArchivos proyectoId={proyectoSeleccionado.id} />;
      case "comentarios":
        return <VistaComentarios proyectoId={proyectoSeleccionado.id} />;
      default:
        return null;
    }
  };

  const rawProyectos = useLiveQuery(() => db.proyectos.toArray()) || [];
  const proyectos = rawProyectos as unknown as ProyectoCRM[];

  const rawClientes = useLiveQuery(() => db.clientes.toArray()) || [];
  const clientes = rawClientes.map((c) => ({
    id: c.id as string,
    nombre: c.nombre as string,
  }));

  const abrirCreacion = () => {
    setProyectoEdicion(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (p: ProyectoCRM) => {
    setProyectoEdicion(p);
    setModalAbierto(true);
  };

  const borrarProyecto = async (proyectoId: string) => {
    const uc = new EliminarProyectoUseCase();
    const res = await uc.ejecutar(proyectoId);
    if (res.ok) {
      mostrarToast("Proyecto eliminado con éxito.", "exito");
      setProyectoSeleccionado(null);
      setModalAbierto(false);
    } else {
      mostrarToast(
        res.error?.mensaje || "No se pudo eliminar el proyecto.",
        "error"
      );
    }
  };

  const handleBorrarProyectoRapido = async (p: ProyectoCRM) => {
    if (
      confirm(
        `¿Estás seguro de que deseas eliminar permanentemente el proyecto "${p.nombre}"? Esta acción borrará todo el backlog, tareas e historial asociado.`
      )
    ) {
      await borrarProyecto(p.id);
    }
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
        stack: nextStack as unknown as StackConfig,
        estandares: nextEstandares as unknown as EstandaresConfig,
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
        productOwner: po as unknown as ProductOwnerConfig,
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
        financiero: fin as unknown as FinancieroConfig,
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
      "💡 Idea / Proyecto Propio";

    // Selected project calculations
    const totalSelTasks = selectedProyectoTareas.length;
    const completedSelTasks = selectedProyectoTareas.filter(
      (t) =>
        t.estado === "done" ||
        t.estado === "Done" ||
        t.estado === "Finalizado" ||
        t.estado === "completado" ||
        t.estado === "Completado"
    ).length;

    const totalSelStories = selectedProyectoHistorias.length;
    const completedSelStories = selectedProyectoHistorias.filter((s) => {
      const est = s["estado"];
      return (
        typeof est === "string" &&
        (est.toLowerCase() === "done" ||
          est === "Finalizado" ||
          est.toLowerCase() === "completado")
      );
    }).length;

    let selProgressPercent = 0;
    if (totalSelTasks > 0) {
      selProgressPercent = Math.round(
        (completedSelTasks / totalSelTasks) * 100
      );
    } else if (totalSelStories > 0) {
      selProgressPercent = Math.round(
        (completedSelStories / totalSelStories) * 100
      );
    }

    let selTimeBadgeColor = "border-zinc-800 bg-zinc-900/40 text-zinc-400";
    let selTimeText = "Sin fecha límite";
    if (proyectoSeleccionado.fechaEntrega) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deliveryDate = new Date(proyectoSeleccionado.fechaEntrega);
      deliveryDate.setHours(0, 0, 0, 0);

      const diffTime = deliveryDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysDiff < 0) {
        const absDays = Math.abs(daysDiff);
        selTimeText = `Vencido hace ${absDays} d`;
        selTimeBadgeColor =
          "border-rose-500/20 bg-rose-500/10 text-rose-400 font-bold animate-pulse";
      } else if (daysDiff === 0) {
        selTimeText = "Vence hoy";
        selTimeBadgeColor =
          "border-rose-500/20 bg-rose-500/10 text-rose-400 font-bold animate-pulse";
      } else if (daysDiff <= 3) {
        selTimeText = `Urgente: ${daysDiff} d`;
        selTimeBadgeColor =
          "border-rose-500/20 bg-rose-500/10 text-rose-400 font-bold";
      } else if (daysDiff <= 10) {
        selTimeText = `Quedan ${daysDiff} d`;
        selTimeBadgeColor =
          "border-amber-500/20 bg-amber-500/10 text-amber-400 font-bold";
      } else {
        selTimeText = `Quedan ${daysDiff} d`;
        selTimeBadgeColor =
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
      }
    }

    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col gap-6">
          {/* Details header */}
          <div className="flex flex-col justify-between gap-4 border-b border-[#2A2A2E] pb-5 lg:flex-row lg:items-center">
            <div className="flex-1">
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

            {/* Time and Progress Quick Indicator */}
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#2A2A2E]/50 bg-zinc-950/40 px-4 py-3 md:min-w-[320px] lg:min-w-[400px]">
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-zinc-550">Progreso</span>
                  <span className="font-bold text-emerald-400">
                    {selProgressPercent}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full border border-zinc-800/40 bg-zinc-900">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${selProgressPercent}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 font-mono">
                <span className="text-[9px] text-zinc-500">Límite</span>
                <span
                  className={`rounded border px-1.5 py-0.5 text-[9px] ${selTimeBadgeColor}`}
                >
                  {selTimeText}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
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
                  title: "Relevamiento",
                  desc: "Notas, Selección de Prompt y Resumen IA",
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SummaryCard
                  titulo="Información General"
                  descripcion="Información básica, descripción, tipo y enlaces principales del proyecto."
                  estado={
                    proyectoSeleccionado.descripcion ? "Configurado" : "Vacío"
                  }
                  icono={
                    <span className="font-mono text-xs font-bold text-indigo-400">
                      ID
                    </span>
                  }
                  onClick={() => abrirModulo("general")}
                />
                <SummaryCard
                  titulo="Presupuesto y Finanzas"
                  descripcion="Presupuesto total, moneda, esquema de facturación y estado del cobro."
                  estado={
                    (proyectoSeleccionado.financiero?.precioTotal ?? 0) > 0
                      ? "Configurado"
                      : "Vacío"
                  }
                  icono={
                    <span className="text-sm font-bold text-amber-400">$</span>
                  }
                  onClick={() => abrirModulo("financiero")}
                />
                <SummaryCard
                  titulo="Taller de Relevamiento (IA)"
                  descripcion="Reúne notas brutas, genera prompts de relevamiento y consolida la especificación Markdown."
                  estado={
                    currentContexto?.relevamientoMarkdown
                      ? "Configurado"
                      : "Vacío"
                  }
                  icono={
                    <span className="font-mono text-xs font-bold text-sky-400">
                      IA
                    </span>
                  }
                  onClick={() => abrirModulo("relevamiento")}
                />
              </div>
            )}

            {faseActiva === "arquitectura" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SummaryCard
                  titulo="Stack Tecnológico"
                  descripcion="Definición del frontend, backend, base de datos y DevOps."
                  estado={
                    proyectoSeleccionado.stack &&
                    Object.values(proyectoSeleccionado.stack).some(
                      (val) => Array.isArray(val) && val.length > 0
                    )
                      ? "Configurado"
                      : "Vacío"
                  }
                  icono={
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      ST
                    </span>
                  }
                  onClick={() => abrirModulo("stack")}
                />
                <SummaryCard
                  titulo="Estándares de Ingeniería"
                  descripcion="Buenas prácticas, patrones de diseño, arquitectura y testing."
                  estado={
                    proyectoSeleccionado.estandares &&
                    Object.values(proyectoSeleccionado.estandares).some(
                      (val) =>
                        (Array.isArray(val) && val.length > 0) ||
                        (typeof val === "number" && val > 0)
                    )
                      ? "Configurado"
                      : "Vacío"
                  }
                  icono={
                    <span className="font-mono text-xs font-bold text-pink-400">
                      ES
                    </span>
                  }
                  onClick={() => abrirModulo("estandares")}
                />
                <SummaryCard
                  titulo="Design System & Vibe"
                  descripcion="Arquetipo estético, directrices visuales y tokens de UI."
                  estado={
                    currentDesignSystem?.designSystemMarkdown ||
                    currentDesignSystem?.metafora
                      ? "Configurado"
                      : "Incompleto"
                  }
                  icono={
                    <span className="font-mono text-xs font-bold text-violet-400">
                      DS
                    </span>
                  }
                  onClick={() => abrirModulo("design_system")}
                />
              </div>
            )}

            {faseActiva === "planificacion" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SummaryCard
                  titulo="Requerimientos y Entidades (IA)"
                  descripcion="Requisitos funcionales, no funcionales, sitemaps y modelado de entidades en 3FN."
                  estado={
                    currentContexto?.requisitosFuncionales
                      ? "Configurado"
                      : "Vacío"
                  }
                  icono={
                    <span className="font-mono text-xs font-bold text-sky-400">
                      RQ
                    </span>
                  }
                  onClick={() => abrirModulo("planificacion_ia")}
                />
                <SummaryCard
                  titulo="Plano General de Avance"
                  descripcion="Vista global interactiva de avance del backlog agrupado por Épica."
                  estado="Configurado"
                  icono={
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      PL
                    </span>
                  }
                  onClick={() => abrirModulo("plano_backlog")}
                />
                <SummaryCard
                  titulo="Planificación de Sprints"
                  descripcion="Asignación de historias y organización del planificador ágil."
                  estado="Configurado"
                  icono={
                    <span className="font-mono text-xs font-bold text-amber-400">
                      SP
                    </span>
                  }
                  onClick={() => abrirModulo("sprints")}
                />
              </div>
            )}

            {faseActiva === "ejecucion" && (
              <DesarrolloWorkspace proyectoId={proyectoSeleccionado.id} />
            )}

            {faseActiva === "cierre" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SummaryCard
                  titulo="Garantías y Mejoras"
                  descripcion="Registro de cambios post-entrega, soporte y control de mejoras con formato Markdown."
                  estado="Configurado"
                  icono={
                    <span className="font-mono text-xs font-bold text-rose-400">
                      GM
                    </span>
                  }
                  onClick={() => abrirModulo("comentarios")}
                />
              </div>
            )}

            {/* Slide-over Drawer for active module editing */}
            <Drawer
              abierto={drawerAbierto}
              onCerrar={() => setDrawerAbierto(false)}
              titulo={getTituloModulo()}
            >
              {renderContenidoModulo()}
            </Drawer>
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
          <div className="flex gap-2">
            <button
              onClick={() => setImportarModalAbierto(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-transparent px-4 py-2 font-mono text-xs font-bold text-zinc-300 transition-all select-none hover:bg-zinc-900 hover:text-zinc-100"
            >
              <Icono.Plus className="h-4 w-4 rotate-45 text-emerald-400" />
              Importar Proyecto (IA)
            </button>
            <Button
              onClick={abrirCreacion}
              icono={<Icono.Plus className="h-4 w-4" />}
            >
              Crear Proyecto
            </Button>
          </div>
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
                "💡 Idea / Proyecto Propio";
              return (
                <ProyectoCard
                  key={p.id}
                  proyecto={p}
                  clientName={clientName}
                  onSelect={setProyectoSeleccionado}
                  onEdit={(p) => {
                    setProyectoEdicion(p);
                    setModalAbierto(true);
                  }}
                  onDelete={handleBorrarProyectoRapido}
                />
              );
            })
          )}
        </div>

        <ModalProyecto
          abierto={modalAbierto}
          proyectoEdicion={proyectoEdicion}
          onCerrar={() => setModalAbierto(false)}
          onConfirmar={guardarProyecto}
          onEliminar={borrarProyecto}
          estados={ESTADOS_PROYECTO}
          tipos={TIPOS_PROYECTO}
          clientes={clientes}
        />

        <ModalImportarProyecto
          abierto={importarModalAbierto}
          onCerrar={() => setImportarModalAbierto(false)}
          onImportado={() => {
            mostrarToast("Proyecto ingestado con éxito por IA.", "exito");
          }}
        />
      </div>
    </MainLayout>
  );
}
