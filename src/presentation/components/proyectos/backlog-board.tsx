"use client";

import React, { useState } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { Input } from "../input";
import { Select } from "../select";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { GestionarBacklogUseCase } from "../../../application/use-cases/proyecto/gestionar-backlog.use-case";
import { useToast } from "../../hooks/useToast";

interface BacklogBoardProps {
  proyectoId: string;
}

interface EpicaCRM {
  id: string;
  nombre: string;
  descripcion?: string;
}

interface HistoriaCRM {
  id: string;
  epicaId?: string;
  titulo: string;
  descripcion?: string;
  prioridad: string;
  estimacion: number;
  estado: string;
}

const PLANTILLAS_PREDEFINIDAS = [
  {
    id: "tmpl_landing",
    nombre: "Landing Page (HTML/Tailwind/Vercel)",
    tareas: [
      {
        titulo: "Diseño UI y mockups iniciales",
        descripcion:
          "Estructurar la landing en Figma y definir paleta de colores.",
        prioridad: "Alta",
        estimacion: 2,
      },
      {
        titulo: "Desarrollo del maquetado HTML5 y CSS",
        descripcion: "Escribir estructura semántica del sitio.",
        prioridad: "Alta",
        estimacion: 3,
      },
      {
        titulo: "Estilos responsivos con TailwindCSS",
        descripcion: "Asegurar soporte mobile, tablet y desktop.",
        prioridad: "Media",
        estimacion: 2,
      },
      {
        titulo: "Configurar formulario de contacto con API",
        descripcion: "Integrar Resend o Formspree para los mails.",
        prioridad: "Media",
        estimacion: 2,
      },
      {
        titulo: "Despliegue inicial en Vercel",
        descripcion: "Configurar CI/CD conectado a GitHub.",
        prioridad: "Alta",
        estimacion: 1,
      },
    ],
  },
  {
    id: "tmpl_ecommerce",
    nombre: "E-commerce Completo (Next.js/Supabase/Stripe)",
    tareas: [
      {
        titulo: "Arquitectura Next.js y Setup inicial",
        descripcion: "Configurar App Router y carpetas de componentes.",
        prioridad: "Alta",
        estimacion: 3,
      },
      {
        titulo: "Diseño del catálogo de productos",
        descripcion: "Montar grilla responsiva de productos con filtros.",
        prioridad: "Alta",
        estimacion: 3,
      },
      {
        titulo: "Pasarela de pagos Stripe/Mercado Pago",
        descripcion: "Configurar Checkout, Webhooks y orden de compra.",
        prioridad: "Alta",
        estimacion: 5,
      },
      {
        titulo: "Autenticación de clientes en el portal",
        descripcion: "Utilizar Supabase Auth o Clerk para sesión.",
        prioridad: "Alta",
        estimacion: 3,
      },
      {
        titulo: "Base de datos y carrito de compras",
        descripcion: "Persistencia del carrito en LocalStorage e IndexedDB.",
        prioridad: "Alta",
        estimacion: 4,
      },
    ],
  },
  {
    id: "tmpl_saas",
    nombre: "SaaS / Sistema Web (React/Node.js/PostgreSQL)",
    tareas: [
      {
        titulo: "Base de datos y modelo de dominio",
        descripcion: "Esquema relacional de tablas y migraciones Drizzle.",
        prioridad: "Alta",
        estimacion: 4,
      },
      {
        titulo: "Endpoints de API y autenticación JWT",
        descripcion: "Middleware de seguridad, registro e inicio de sesión.",
        prioridad: "Alta",
        estimacion: 3,
      },
      {
        titulo: "Dashboard administrativo y métricas",
        descripcion: "Panel de control con gráficos Recharts.",
        prioridad: "Media",
        estimacion: 5,
      },
      {
        titulo: "Workspace de trabajo y ABMs principales",
        descripcion: "Listados, filtros y operaciones CRUD del negocio.",
        prioridad: "Alta",
        estimacion: 5,
      },
      {
        titulo: "CI/CD con Docker y deploy en servidor VPS",
        descripcion: "Crear Dockerfile y configurar pipeline de GitHub.",
        prioridad: "Media",
        estimacion: 3,
      },
    ],
  },
];

export const BacklogBoard: React.FC<BacklogBoardProps> = ({ proyectoId }) => {
  const { mostrarToast } = useToast();
  const backlogUC = new GestionarBacklogUseCase();

  const [nombreEpica, setNombreEpica] = useState("");
  const [descEpica, setDescEpica] = useState("");

  const [tituloHistoria, setTituloHistoria] = useState("");
  const [descHistoria, setDescHistoria] = useState("");
  const [epicaSel, setEpicaSel] = useState("");
  const [prioridad, setPrioridad] = useState("Media");
  const [estimacion, setEstimacion] = useState(3);

  const [mostrarFormEpica, setMostrarFormEpica] = useState(false);
  const [mostrarFormHistoria, setMostrarFormHistoria] = useState(false);

  // Template Library State
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState("");
  const [nombreNuevaPlantilla, setNombreNuevaPlantilla] = useState("");
  const [mostrarGuardarPlantilla, setMostrarGuardarPlantilla] = useState(false);

  const epicas =
    ((useLiveQuery(() =>
      db.epicas.where("proyectoId").equals(proyectoId).toArray()
    ) || []) as unknown as EpicaCRM[]) || [];
  const historias =
    ((useLiveQuery(() =>
      db.historias.where("proyectoId").equals(proyectoId).toArray()
    ) || []) as unknown as HistoriaCRM[]) || [];

  // Load custom templates saved in IndexedDB
  const plantillasCustomRaw =
    useLiveQuery(() => db.plantillas_backlog.toArray()) || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plantillasCustom = plantillasCustomRaw as unknown as {
    id: string;
    nombre: string;
    tareas: any[];
  }[];
  const todasLasPlantillas = [...PLANTILLAS_PREDEFINIDAS, ...plantillasCustom];

  const handleCrearEpica = async () => {
    if (!nombreEpica.trim()) {
      mostrarToast("El nombre de la épica es obligatorio.", "error");
      return;
    }
    const res = await backlogUC.crearEpica(proyectoId, {
      nombre: nombreEpica,
      descripcion: descEpica,
    });
    if (res.ok) {
      mostrarToast("Épica creada correctamente.", "exito");
      setNombreEpica("");
      setDescEpica("");
      setMostrarFormEpica(false);
    }
  };

  const handleCrearHistoria = async () => {
    if (!tituloHistoria.trim()) {
      mostrarToast("El título de la historia es obligatorio.", "error");
      return;
    }
    const res = await backlogUC.crearHistoriaUsuario(proyectoId, {
      titulo: tituloHistoria,
      descripcion: descHistoria,
      epicaId: epicaSel,
      prioridad,
      estimacion,
      estado: "backlog",
    });
    if (res.ok) {
      mostrarToast("Historia de usuario agregada al backlog.", "exito");
      setTituloHistoria("");
      setDescHistoria("");
      setMostrarFormHistoria(false);
    }
  };

  const handleImportarPlantilla = async () => {
    if (!plantillaSeleccionada) return;
    const target = todasLasPlantillas.find(
      (t) => t.id === plantillaSeleccionada
    );
    if (!target) return;

    try {
      for (const t of target.tareas) {
        await backlogUC.crearHistoriaUsuario(proyectoId, {
          titulo: t.titulo,
          descripcion: t.descripcion || "",
          prioridad: t.prioridad || "Media",
          estimacion: t.estimacion || 3,
          estado: "backlog",
        });
      }
      mostrarToast(
        `Importadas ${target.tareas.length} historias del backlog desde: ${target.nombre}`,
        "exito"
      );
      setPlantillaSeleccionada("");
    } catch {
      mostrarToast("Error al importar la plantilla de backlog.", "error");
    }
  };

  const handleGuardarComoPlantilla = async () => {
    if (!nombreNuevaPlantilla.trim()) {
      mostrarToast("El nombre de la plantilla es obligatorio.", "error");
      return;
    }
    if (historias.length === 0) {
      mostrarToast(
        "No tienes historias en el backlog actual para exportar.",
        "error"
      );
      return;
    }

    try {
      const nuevaPlantilla = {
        id: `tmpl_${Date.now()}`,
        nombre: nombreNuevaPlantilla.trim(),
        tareas: historias.map((h) => ({
          titulo: h.titulo,
          descripcion: h.descripcion || "",
          prioridad: h.prioridad,
          estimacion: h.estimacion,
        })),
      };

      await db.plantillas_backlog.add(
        nuevaPlantilla as unknown as Record<string, unknown>
      );
      mostrarToast("Backlog guardado en tu Biblioteca de Plantillas.", "exito");
      setNombreNuevaPlantilla("");
      setMostrarGuardarPlantilla(false);
    } catch {
      mostrarToast("Error al exportar plantilla de backlog.", "error");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Template Library Panel */}
      <Card>
        <div className="mb-4 border-b border-[#2A2A2E] pb-3">
          <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            Biblioteca de Plantillas de Backlog
          </h3>
          <p className="font-mono text-[9px] text-zinc-500">
            Ahorra clicks importando conjuntos de historias predefinidas o
            guarda tu backlog actual
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px] flex-1">
            <Select
              label="Seleccionar Plantilla"
              options={[
                { value: "", label: "-- Selecciona una plantilla --" },
                ...todasLasPlantillas.map((t) => ({
                  value: t.id,
                  label: t.nombre,
                })),
              ]}
              value={plantillaSeleccionada}
              onChange={(val) => setPlantillaSeleccionada(val)}
            />
          </div>
          <button
            onClick={handleImportarPlantilla}
            disabled={!plantillaSeleccionada}
            className="rounded-xl bg-emerald-500 px-4 py-2 font-mono text-xs font-bold text-black transition-all hover:bg-emerald-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Importar Historias
          </button>

          <button
            onClick={() => setMostrarGuardarPlantilla(!mostrarGuardarPlantilla)}
            className="rounded-xl border border-zinc-800 bg-[#18181B] px-4 py-2 font-mono text-xs font-bold text-zinc-300 transition-all hover:bg-zinc-800"
          >
            {mostrarGuardarPlantilla
              ? "Cerrar Exportar"
              : "Guardar Backlog Actual como Plantilla"}
          </button>
        </div>

        {/* Modal-like inline form to save template */}
        {mostrarGuardarPlantilla && (
          <div className="animate-in fade-in mt-4 flex items-end gap-3 rounded-xl border border-[#2A2A2E] bg-zinc-950/80 p-4">
            <div className="flex-1">
              <Input
                label="Nombre de la nueva plantilla de backlog"
                value={nombreNuevaPlantilla}
                onChange={(e) => setNombreNuevaPlantilla(e.target.value)}
                placeholder="Ej. Plantilla SaaS Laravel + React"
              />
            </div>
            <button
              onClick={handleGuardarComoPlantilla}
              className="rounded-xl bg-blue-500 px-4 py-2.5 font-mono text-xs font-bold text-black transition-all hover:bg-blue-600 active:scale-95"
            >
              Guardar Plantilla
            </button>
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
          <div>
            <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
              Épicas del Proyecto
            </h3>
            <p className="font-mono text-[9px] text-zinc-500">
              Agrupadores de alto nivel funcional
            </p>
          </div>
          <Button onClick={() => setMostrarFormEpica(!mostrarFormEpica)}>
            {mostrarFormEpica ? "Cerrar" : "Nueva Épica"}
          </Button>
        </div>

        {mostrarFormEpica && (
          <div className="animate-in slide-in-from-top-3 mb-4 flex flex-col gap-4 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-4 duration-150">
            <Input
              label="Nombre de la Épica"
              value={nombreEpica}
              onChange={(e) => setNombreEpica(e.target.value)}
              placeholder="Módulo de checkout..."
            />
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] font-bold text-zinc-400 uppercase">
                Descripción
              </label>
              <textarea
                value={descEpica}
                onChange={(e) => setDescEpica(e.target.value)}
                placeholder="Detalla qué engloba esta épica..."
                rows={3}
                className="w-full rounded-xl border border-zinc-800 bg-[#18181B] p-2.5 font-mono text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setMostrarFormEpica(false)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 font-mono text-xs text-zinc-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearEpica}
                className="rounded-xl bg-emerald-500 px-4 py-2 font-mono text-xs font-bold text-black"
              >
                Confirmar Épica
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {epicas.length === 0 ? (
            <span className="py-4 text-center font-mono text-xs text-zinc-600 italic">
              Sin épicas creadas aún.
            </span>
          ) : (
            epicas.map((ep) => (
              <div
                key={ep.id}
                className="rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3 font-mono text-xs transition-all hover:border-zinc-800"
              >
                <span className="block font-bold text-zinc-100">
                  {ep.nombre}
                </span>
                {ep.descripcion && (
                  <span className="mt-0.5 block text-[10px] text-zinc-500">
                    {ep.descripcion}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
          <div>
            <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
              Historias de Usuario (Backlog)
            </h3>
            <p className="font-mono text-[9px] text-zinc-500">
              Listado de tareas requeridas para el desarrollo
            </p>
          </div>
          <Button onClick={() => setMostrarFormHistoria(!mostrarFormHistoria)}>
            {mostrarFormHistoria ? "Cerrar" : "Nueva Historia"}
          </Button>
        </div>

        {mostrarFormHistoria && (
          <div className="animate-in slide-in-from-top-3 mb-4 flex flex-col gap-4 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-4 duration-150">
            <Input
              label="Título de la Historia"
              value={tituloHistoria}
              onChange={(e) => setTituloHistoria(e.target.value)}
              placeholder="Ej. Como cliente quiero agregar productos al carrito..."
            />
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] font-bold text-zinc-400 uppercase">
                Criterios de Aceptación / Descripción
              </label>
              <textarea
                value={descHistoria}
                onChange={(e) => setDescHistoria(e.target.value)}
                placeholder="Detalla los requerimientos o comportamiento esperado..."
                rows={3}
                className="w-full rounded-xl border border-zinc-800 bg-[#18181B] p-2.5 font-mono text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select
                label="Asociar Épica"
                options={[
                  { value: "", label: "Ninguna" },
                  ...epicas.map((ep) => ({ value: ep.id, label: ep.nombre })),
                ]}
                value={epicaSel}
                onChange={setEpicaSel}
              />
              <Select
                label="Prioridad"
                options={[
                  { value: "Baja", label: "Baja" },
                  { value: "Media", label: "Media" },
                  { value: "Alta", label: "Alta" },
                  { value: "Urgente", label: "Urgente" },
                ]}
                value={prioridad}
                onChange={setPrioridad}
              />
              <Input
                label="Estimación (Story Points)"
                type="number"
                value={estimacion}
                onChange={(e) => setEstimacion(Number(e.target.value))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setMostrarFormHistoria(false)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 font-mono text-xs text-zinc-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearHistoria}
                className="rounded-xl bg-emerald-500 px-4 py-2 font-mono text-xs font-bold text-black"
              >
                Agregar Historia
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {historias.length === 0 ? (
            <span className="rounded-xl border border-dashed border-[#2A2A2E] py-8 text-center font-mono text-xs text-zinc-600 italic">
              El Backlog está vacío. Carga una plantilla arriba o añade
              historias manualmente.
            </span>
          ) : (
            historias.map((h) => {
              const ep = epicas.find((e) => e.id === h.epicaId);
              return (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3.5 font-mono text-xs transition-all hover:border-zinc-800"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-200">
                        {h.titulo}
                      </span>
                      {ep && (
                        <span className="py-0.2 rounded border border-zinc-800 bg-zinc-900 px-1.5 text-[8px] font-bold text-zinc-400 uppercase">
                          {ep.nombre}
                        </span>
                      )}
                      <span className="py-0.2 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 text-[8px] font-bold text-emerald-400 uppercase">
                        {h.estado}
                      </span>
                    </div>
                    {h.descripcion && (
                      <span className="block text-[10px] leading-normal text-zinc-500">
                        {h.descripcion}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-bold text-zinc-400">
                      SP: {h.estimacion}
                    </span>
                    <span
                      className={`rounded px-2 py-1 text-[9px] font-bold ${
                        h.prioridad === "Urgente"
                          ? "border border-red-500/20 bg-red-500/10 text-red-400"
                          : h.prioridad === "Alta"
                            ? "border border-amber-500/20 bg-amber-500/10 text-amber-400"
                            : "border border-zinc-800 bg-zinc-900 text-zinc-400"
                      }`}
                    >
                      {h.prioridad}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
