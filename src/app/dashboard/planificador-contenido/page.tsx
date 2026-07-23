"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/purity, react-hooks/exhaustive-deps */

import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Card } from "../../../presentation/components/card";
import { Button } from "../../../presentation/components/button";
import { useToast } from "../../../presentation/hooks/useToast";
import { MainLayout } from "../../../presentation/components/layout";

const CANALES_DEFAULT = [
  "Instagram",
  "TikTok",
  "LinkedIn",
  "YouTube",
  "Facebook",
];
const TIPOS_DEFAULT = ["Post", "Reel", "Historia", "Estado"];
const PASOS_DEFAULT = [
  "Definir Gancho y Script",
  "Grabación del video",
  "Edición y Subtítulos",
  "Redacción del Copy y CTA",
  "Programar y Publicar",
];

const DIAS_SEMANA = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miércoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
];

export default function PlanificadorContenidoPage() {
  const { mostrarToast } = useToast();

  const [activeTab, setActiveTab] = useState<
    "planificacion" | "taller" | "calendario"
  >("planificacion");

  // Presets from DB
  const presets = (useLiveQuery(() => db.agencia_config.toArray()) ||
    []) as any[];
  const planificaciones = (useLiveQuery(() =>
    db.planificaciones_contenido.toArray()
  ) || []) as any[];
  const todosContenidos = (useLiveQuery(() => db.contenidos.toArray()) ||
    []) as any[];

  // Active planning ID selection
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const activePlan =
    planificaciones.find((p) => p.id === selectedPlanId) || planificaciones[0];

  useEffect(() => {
    if (planificaciones.length > 0 && !selectedPlanId) {
      setSelectedPlanId(planificaciones[0].id);
    }
  }, [planificaciones, selectedPlanId]);

  // Form states for Planificacion
  const [planId, setPlanId] = useState("");
  const [planNombre, setPlanNombre] = useState("");
  const [planFechaInicio, setPlanFechaInicio] = useState("");
  const [planFechaFin, setPlanFechaFin] = useState("");
  const [planObjetivo, setPlanObjetivo] = useState("");
  const [planKpi, setPlanKpi] = useState("");
  const [planIdeas, setPlanIdeas] = useState<
    Array<{ id: string; texto: string; dia?: string }>
  >([]);
  const [nuevaIdeaTexto, setNuevaIdeaTexto] = useState("");
  const [nuevaIdeaDia, setNuevaIdeaDia] = useState("lunes");

  // Load selected plan form values
  useEffect(() => {
    if (activePlan) {
      setPlanId(activePlan.id);
      setPlanNombre(activePlan.nombre || "");
      setPlanFechaInicio(activePlan.fechaInicio || "");
      setPlanFechaFin(activePlan.fechaFin || "");
      setPlanObjetivo(activePlan.objetivo || "");
      setPlanKpi(activePlan.kpi || "");
      setPlanIdeas(activePlan.ideas || []);
    } else {
      // Default dates for current week
      const now = new Date();
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMonday));
      const sunday = new Date(now.setDate(monday.getDate() + 6));

      setPlanId(`plan_${Date.now()}`);
      setPlanNombre(
        `Semana del ${monday.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`
      );
      setPlanFechaInicio(monday.toISOString().split("T")[0]);
      setPlanFechaFin(sunday.toISOString().split("T")[0]);
      setPlanObjetivo("");
      setPlanKpi("");
      setPlanIdeas([]);
    }
  }, [activePlan, selectedPlanId]);

  // Form states for Taller / Contenido Editor
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [contentTitulo, setContentTitulo] = useState("");
  const [contentCanales, setContentCanales] = useState<string[]>([]);
  const [contentTipos, setContentTipos] = useState<string[]>([]);
  const [contentIdeaId, setContentIdeaId] = useState("");
  const [contentFecha, setContentFecha] = useState("");
  const [contentEstado, setContentEstado] = useState<
    "Planificado" | "Grabado" | "Editado" | "Subido"
  >("Planificado");
  const [contentGancho, setContentGancho] = useState("");
  const [contentGanchoVisual, setContentGanchoVisual] = useState("");
  const [contentDesarrollo, setContentDesarrollo] = useState("");
  const [contentCta, setContentCta] = useState("");
  const [contentDescripcion, setContentDescripcion] = useState("");
  const [contentPasos, setContentPasos] = useState<string[]>([]);

  // Custom tags adding states
  const [customCanal, setCustomCanal] = useState("");
  const [customTipo, setCustomTipo] = useState("");

  // Preserved Suggestions lists from DB config
  const historicoObjetivos = presets
    .filter((p) => p.tipo === "historico_objetivos")
    .map((p) => p.valor as string);
  const historicoKpis = presets
    .filter((p) => p.tipo === "historico_kpis")
    .map((p) => p.valor as string);
  const dbCanales = presets
    .filter((p) => p.tipo === "canales_contenido")
    .map((p) => p.valor as string);
  const dbTipos = presets
    .filter((p) => p.tipo === "tipos_contenido")
    .map((p) => p.valor as string);
  const listCanales = Array.from(new Set([...CANALES_DEFAULT, ...dbCanales]));
  const listTipos = Array.from(new Set([...TIPOS_DEFAULT, ...dbTipos]));

  // Closeout modal states
  const [isCloseoutOpen, setIsCloseoutOpen] = useState(false);
  const [rolloverActions, setRolloverActions] = useState<
    Record<string, "rollover" | "delete">
  >({});

  // JSON Import/Export states
  const [jsonInput, setJsonInput] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Load Default Content steps
  useEffect(() => {
    const configPasos = presets.find(
      (p) => p.tipo === "pasos_contenido_default"
    );
    if (configPasos && Array.isArray(configPasos.valor)) {
      setContentPasos(configPasos.valor);
    } else {
      setContentPasos(PASOS_DEFAULT);
    }
  }, [presets]);

  const handleAgregarIdea = () => {
    if (!nuevaIdeaTexto.trim()) return;
    const nueva = {
      id: `idea_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      texto: nuevaIdeaTexto.trim(),
      dia: nuevaIdeaDia,
    };
    setPlanIdeas([...planIdeas, nueva]);
    setNuevaIdeaTexto("");
  };

  const handleEliminarIdea = (id: string) => {
    setPlanIdeas(planIdeas.filter((idea) => idea.id !== id));
  };

  const handleSavePlan = async () => {
    if (!planNombre.trim() || !planFechaInicio || !planFechaFin) {
      mostrarToast("Completa los campos obligatorios del plan.", "error");
      return;
    }

    try {
      // Save plan structure
      await db.planificaciones_contenido.put({
        id: planId,
        nombre: planNombre.trim(),
        fechaInicio: planFechaInicio,
        fechaFin: planFechaFin,
        objetivo: planObjetivo.trim(),
        kpi: planKpi.trim(),
        ideas: planIdeas,
        creadoEn: Date.now(),
      });

      // Save suggestion presets if new
      if (
        planObjetivo.trim() &&
        !historicoObjetivos.includes(planObjetivo.trim())
      ) {
        await db.agencia_config.put({
          id: `obj_${Date.now()}`,
          tipo: "historico_objetivos",
          valor: planObjetivo.trim(),
        });
      }
      if (planKpi.trim() && !historicoKpis.includes(planKpi.trim())) {
        await db.agencia_config.put({
          id: `kpi_${Date.now()}`,
          tipo: "historico_kpis",
          valor: planKpi.trim(),
        });
      }

      setSelectedPlanId(planId);
      mostrarToast("Planificación guardada con éxito.", "exito");
    } catch (err: any) {
      mostrarToast(`Error al guardar planificación: ${err.message}`, "error");
    }
  };

  const handleAgregarCustomCanal = async () => {
    if (!customCanal.trim()) return;
    try {
      await db.agencia_config.put({
        id: `chan_${Date.now()}`,
        tipo: "canales_contenido",
        valor: customCanal.trim(),
      });
      setContentCanales([...contentCanales, customCanal.trim()]);
      setCustomCanal("");
      mostrarToast("Canal agregado.", "exito");
    } catch (err: any) {
      mostrarToast(err.message, "error");
    }
  };

  const handleAgregarCustomTipo = async () => {
    if (!customTipo.trim()) return;
    try {
      await db.agencia_config.put({
        id: `type_${Date.now()}`,
        tipo: "tipos_contenido",
        valor: customTipo.trim(),
      });
      setContentTipos([...contentTipos, customTipo.trim()]);
      setCustomTipo("");
      mostrarToast("Tipo de contenido agregado.", "exito");
    } catch (err: any) {
      mostrarToast(err.message, "error");
    }
  };

  const selectIdeaForTaller = (idea: any) => {
    setContentIdeaId(idea.id);
    setContentTitulo(idea.texto);
    setContentGancho("");
    setContentGanchoVisual("");
    setContentDesarrollo("");
    setContentCta("");
    setContentDescripcion("");
    setEditingContentId(null);

    // Default dates & channels
    setContentFecha(new Date().toISOString().split("T")[0]);
    setContentEstado("Planificado");

    // Load default steps template
    const configPasos = presets.find(
      (p) => p.tipo === "pasos_contenido_default"
    );
    setContentPasos(
      configPasos && Array.isArray(configPasos.valor)
        ? configPasos.valor
        : PASOS_DEFAULT
    );
    mostrarToast(`Idea "${idea.texto}" cargada al taller.`, "info");
  };

  const selectContentForEditing = (content: any) => {
    setEditingContentId(content.id);
    setContentTitulo(content.titulo || "");
    setContentCanales(content.canales || []);
    setContentTipos(content.tipos || []);
    setContentIdeaId(content.ideaId || "");
    setContentFecha(content.fecha || "");
    setContentEstado(content.estado || "Planificado");
    setContentGancho(content.gancho || "");
    setContentGanchoVisual(content.ganchoVisual || "");
    setContentDesarrollo(content.desarrollo || "");
    setContentCta(content.cta || "");
    setContentDescripcion(content.descripcionVideo || "");
    setContentPasos(content.pasos || PASOS_DEFAULT);
    mostrarToast(`Editando contenido: "${content.titulo}"`, "info");
  };

  const handleSaveContent = async () => {
    if (!contentTitulo.trim()) {
      mostrarToast("Escribe un título para el contenido.", "error");
      return;
    }

    const cid = editingContentId || `cont_${Date.now()}`;
    try {
      // Check if steps differ from default config
      const defaultSteps =
        presets.find((p) => p.tipo === "pasos_contenido_default")?.valor ||
        PASOS_DEFAULT;
      const stepsDiffer =
        JSON.stringify(contentPasos) !== JSON.stringify(defaultSteps);

      if (stepsDiffer) {
        const check = confirm(
          "Los pasos a seguir han cambiado respecto a la plantilla global. ¿Deseas guardar estos nuevos pasos como la configuración predefinida para futuros contenidos?"
        );
        if (check) {
          await db.agencia_config.put({
            id: "pasos_contenido_default",
            tipo: "pasos_contenido_default",
            valor: contentPasos,
          });
          mostrarToast("Plantilla global de pasos actualizada.", "exito");
        }
      }

      await db.contenidos.put({
        id: cid,
        planificacionId: selectedPlanId || "backlog",
        ideaId: contentIdeaId || null,
        titulo: contentTitulo.trim(),
        canales: contentCanales,
        tipos: contentTipos,
        fecha: contentFecha,
        estado: contentEstado,
        gancho: contentGancho.trim(),
        ganchoVisual: contentGanchoVisual.trim(),
        desarrollo: contentDesarrollo.trim(),
        cta: contentCta.trim(),
        descripcionVideo: contentDescripcion.trim(),
        pasos: contentPasos,
        creadoEn: Date.now(),
      });

      mostrarToast("Contenido guardado con éxito.", "exito");
      // Reset editor
      setEditingContentId(null);
      setContentTitulo("");
      setContentCanales([]);
      setContentTipos([]);
      setContentIdeaId("");
      setContentGancho("");
      setContentGanchoVisual("");
      setContentDesarrollo("");
      setContentCta("");
      setContentDescripcion("");
    } catch (err: any) {
      mostrarToast(`Error al guardar contenido: ${err.message}`, "error");
    }
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;

    try {
      const content = await db.contenidos.get(id);
      if (content) {
        await db.contenidos.update(id, {
          fecha: dateStr,
          planificacionId: selectedPlanId || content.planificacionId,
        });
        mostrarToast("Contenido re-calendarizado correctamente.", "exito");
      }
    } catch (err: any) {
      mostrarToast(err.message, "error");
    }
  };

  // Closeout closing modal triggers
  const handleOpenCloseout = () => {
    const activeConts = todosContenidos.filter(
      (c) => c.planificacionId === selectedPlanId
    );
    const initialActions: Record<string, "rollover" | "delete"> = {};
    activeConts.forEach((c) => {
      if (c.estado !== "Subido") {
        initialActions[c.id] = "rollover";
      }
    });
    setRolloverActions(initialActions);
    setIsCloseoutOpen(true);
  };

  const handleExecuteCloseout = async () => {
    try {
      const activeConts = todosContenidos.filter(
        (c) => c.planificacionId === selectedPlanId
      );
      for (const c of activeConts) {
        if (c.estado === "Subido") {
          // Completed contents are archived or kept
          continue;
        }

        const action = rolloverActions[c.id];
        if (action === "delete") {
          await db.contenidos.delete(c.id);
        } else {
          // Rollover moves it to backlog pool
          await db.contenidos.update(c.id, {
            planificacionId: "backlog",
            fecha: "",
          });
        }
      }

      setIsCloseoutOpen(false);
      mostrarToast("Semana finalizada y backlog cerrado con éxito.", "exito");
    } catch (err: any) {
      mostrarToast(`Error al finalizar la semana: ${err.message}`, "error");
    }
  };

  // Export planning + contents
  const handleExportJSON = () => {
    const planConts = todosContenidos.filter(
      (c) => c.planificacionId === selectedPlanId
    );
    const blob = {
      planificacion: activePlan,
      contenidos: planConts,
    };
    navigator.clipboard.writeText(JSON.stringify(blob, null, 2));
    mostrarToast("Estructura JSON copiada al portapapeles.", "exito");
  };

  // Import planning + contents
  const handleImportJSON = async () => {
    if (!jsonInput.trim()) return;
    try {
      const parsed = JSON.parse(jsonInput);
      if (!parsed.planificacion || !Array.isArray(parsed.contenidos)) {
        throw new Error(
          "El JSON debe contener las llaves 'planificacion' y 'contenidos'."
        );
      }

      const importedPlanId = parsed.planificacion.id || `plan_${Date.now()}`;
      await db.planificaciones_contenido.put({
        ...parsed.planificacion,
        id: importedPlanId,
        creadoEn: Date.now(),
      });

      for (const c of parsed.contenidos) {
        const cid = c.id || `cont_${Date.now()}_${Math.random()}`;
        await db.contenidos.put({
          ...c,
          id: cid,
          planificacionId: importedPlanId,
        });
      }

      setSelectedPlanId(importedPlanId);
      setIsImportModalOpen(false);
      setJsonInput("");
      mostrarToast(
        "¡Planificación y contenidos importados con éxito!",
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al importar JSON: ${err.message}`, "error");
    }
  };

  const planContenidos = todosContenidos.filter(
    (c) => c.planificacionId === selectedPlanId
  );
  const backlogContenidos = todosContenidos.filter(
    (c) =>
      c.planificacionId === "backlog" ||
      !c.planificacionId ||
      (c.planificacionId !== selectedPlanId && c.fecha === "")
  );

  const getDayDateString = (dayIndex: number) => {
    if (!activePlan || !activePlan.fechaInicio) return "";
    const start = new Date(activePlan.fechaInicio as string);
    start.setDate(start.getDate() + dayIndex);
    return start.toISOString().split("T")[0];
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case "Subido":
        return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
      case "Editado":
        return "border-orange-500/20 bg-orange-500/10 text-orange-400";
      case "Grabado":
        return "border-amber-500/20 bg-amber-500/10 text-amber-400";
      default:
        return "border-zinc-800 bg-zinc-900/60 text-zinc-400";
    }
  };

  return (
    <MainLayout breadcrumbs={[{ label: "Planificador de Contenidos" }]}>
      <div className="flex flex-col gap-5 text-zinc-200">
        {/* Header section */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2A2E] pb-3">
          <div>
            <h2 className="font-mono text-sm font-bold tracking-wider text-zinc-100 uppercase">
              Planificador de Contenidos (Weekly Calendar Workspace)
            </h2>
            <p className="text-zinc-550 mt-0.5 font-mono text-[10px]">
              Organiza tu cronograma semanal de contenido, escribe guiones y
              publica tus redes sociales.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="border-zinc-850 rounded border bg-zinc-900 px-3 py-1.5 font-mono text-[10px] text-zinc-200 outline-none"
            >
              {planificaciones.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setSelectedPlanId("");
                setPlanId(`plan_${Date.now()}`);
              }}
              className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
            >
              + Nueva Semana
            </button>
            <button
              onClick={handleExportJSON}
              className="rounded border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
            >
              📤 Exportar JSON
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="rounded border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
            >
              📥 Importar JSON
            </button>
            <button
              onClick={handleOpenCloseout}
              className="rounded border border-emerald-500 bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-emerald-400"
            >
              🏁 Finalizar Semana
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-zinc-900 pb-2">
          <button
            onClick={() => setActiveTab("planificacion")}
            className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
              activeTab === "planificacion"
                ? "bg-emerald-500 text-zinc-950 shadow"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            1. Planificación Semanal
          </button>
          <button
            onClick={() => setActiveTab("taller")}
            className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
              activeTab === "taller"
                ? "bg-emerald-500 text-zinc-950 shadow"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            2. Taller de Guion & Copys
          </button>
          <button
            onClick={() => setActiveTab("calendario")}
            className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
              activeTab === "calendario"
                ? "bg-emerald-500 text-zinc-950 shadow"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            3. Calendario Semanal
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "planificacion" && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
            <div className="flex flex-col gap-4 md:col-span-6">
              <Card>
                <div className="mb-4 border-b border-zinc-900 pb-2">
                  <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Parámetros de Planificación
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
                      Nombre del Plan Semanal
                    </label>
                    <input
                      type="text"
                      value={planNombre}
                      onChange={(e) => setPlanNombre(e.target.value)}
                      placeholder="Ej: Semana 30 - Lanzamiento Nodexa"
                      className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
                        Desde
                      </label>
                      <input
                        type="date"
                        value={planFechaInicio}
                        onChange={(e) => setPlanFechaInicio(e.target.value)}
                        className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
                        Hasta
                      </label>
                      <input
                        type="date"
                        value={planFechaFin}
                        onChange={(e) => setPlanFechaFin(e.target.value)}
                        className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
                      Objetivo Semanal
                    </label>
                    <input
                      type="text"
                      value={planObjetivo}
                      onChange={(e) => setPlanObjetivo(e.target.value)}
                      placeholder="Ej: Generar branding de post-venta..."
                      list="historico-objetivos-list"
                      className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                    />
                    <datalist id="historico-objetivos-list">
                      {historicoObjetivos.map((o, idx) => (
                        <option key={idx} value={o} />
                      ))}
                    </datalist>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
                      KPI Semanal
                    </label>
                    <input
                      type="text"
                      value={planKpi}
                      onChange={(e) => setPlanKpi(e.target.value)}
                      placeholder="Ej: +10 leads orgánicos, 5000 views..."
                      list="historico-kpis-list"
                      className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                    />
                    <datalist id="historico-kpis-list">
                      {historicoKpis.map((k, idx) => (
                        <option key={idx} value={k} />
                      ))}
                    </datalist>
                  </div>

                  <Button onClick={handleSavePlan}>
                    Guardar Planificación
                  </Button>
                </div>
              </Card>
            </div>

            <div className="flex flex-col gap-4 md:col-span-6">
              <Card>
                <div className="mb-4 border-b border-zinc-900 pb-2">
                  <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Lluvia de Ideas Rápidas (Backlog)
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nuevaIdeaTexto}
                      onChange={(e) => setNuevaIdeaTexto(e.target.value)}
                      placeholder="Ej: Soporte Nodexa (Post del jueves)..."
                      className="border-zinc-850 flex-1 rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                    />
                    <select
                      value={nuevaIdeaDia}
                      onChange={(e) => setNuevaIdeaDia(e.target.value)}
                      className="border-zinc-850 rounded border bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-200 outline-none"
                    >
                      {DIAS_SEMANA.map((d) => (
                        <option key={d.key} value={d.key}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAgregarIdea}
                      className="rounded bg-emerald-500 px-3.5 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-emerald-400"
                    >
                      +
                    </button>
                  </div>

                  <div className="mt-2 flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-1">
                    {planIdeas.length === 0 ? (
                      <p className="text-zinc-550 py-6 text-center font-mono text-[9px]">
                        No hay ideas rápidas cargadas en este plan.
                      </p>
                    ) : (
                      planIdeas.map((idea) => (
                        <div
                          key={idea.id}
                          className="flex items-center justify-between rounded-lg border border-zinc-900 bg-zinc-950/60 p-2"
                        >
                          <div>
                            <span className="mr-2 font-mono text-[9px] font-bold text-emerald-400 uppercase">
                              {(idea.dia || "").toUpperCase()}:
                            </span>
                            <span className="font-mono text-[10px] text-zinc-200">
                              {idea.texto}
                            </span>
                          </div>
                          <button
                            onClick={() => handleEliminarIdea(idea.id)}
                            className="font-mono text-[10px] text-red-400 hover:text-red-300"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Tab Taller de Guion & Copys */}
        {activeTab === "taller" && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
            {/* Ideas quick list */}
            <div className="flex flex-col gap-4 md:col-span-4">
              <Card>
                <div className="mb-4 border-b border-zinc-900 pb-2">
                  <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Ideas de la Semana
                  </span>
                </div>

                <div className="flex max-h-[40vh] flex-col gap-2 overflow-y-auto">
                  {planIdeas.map((idea) => (
                    <div
                      key={idea.id}
                      onClick={() => selectIdeaForTaller(idea)}
                      className="flex cursor-pointer flex-col gap-1.5 rounded-lg border border-zinc-900 bg-zinc-950/40 p-2.5 hover:bg-zinc-900/60"
                    >
                      <span className="font-mono text-[8px] font-bold text-emerald-400 uppercase">
                        {idea.dia}:
                      </span>
                      <span className="font-mono text-[10px] text-zinc-200">
                        {idea.texto}
                      </span>
                    </div>
                  ))}
                  {planIdeas.length === 0 && (
                    <p className="text-zinc-550 py-4 text-center font-mono text-[9px]">
                      No hay ideas en esta planificación semanal.
                    </p>
                  )}
                </div>

                <div className="mt-4 border-t border-zinc-900 pt-4">
                  <span className="mb-2 block font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Editar Contenidos Existentes
                  </span>
                  <div className="flex max-h-[30vh] flex-col gap-2 overflow-y-auto">
                    {planContenidos.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => selectContentForEditing(c)}
                        className={`flex cursor-pointer items-center justify-between rounded border p-2 font-mono text-[9px] ${
                          editingContentId === c.id
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                            : "border-zinc-900 bg-zinc-950/20 hover:bg-zinc-900"
                        }`}
                      >
                        <span className="flex-1 truncate font-bold">
                          {c.titulo}
                        </span>
                        <span
                          className={`ml-1 shrink-0 rounded px-1.5 py-0.5 text-[8px] ${getStatusColor(c.estado)}`}
                        >
                          {c.estado}
                        </span>
                      </div>
                    ))}
                    {planContenidos.length === 0 && (
                      <p className="text-zinc-550 py-2 text-center font-mono text-[9px]">
                        Sin contenidos guardados aún.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Workshop Editor Form */}
            <div className="flex flex-col gap-4 md:col-span-8">
              <Card>
                <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Maquetador de Contenido
                  </span>
                  {editingContentId && (
                    <button
                      onClick={() => {
                        setEditingContentId(null);
                        setContentTitulo("");
                      }}
                      className="animate-pulse font-mono text-[9px] text-zinc-500 underline"
                    >
                      Crear Nuevo
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
                      Título del Contenido
                    </label>
                    <input
                      type="text"
                      value={contentTitulo}
                      onChange={(e) => setContentTitulo(e.target.value)}
                      placeholder="Ej: Tutorial paso-a-paso de Soporte..."
                      className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Channels selector */}
                    <div className="flex flex-col gap-1">
                      <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
                        Canal (Redes Sociales)
                      </label>
                      <div className="mb-2 flex flex-wrap gap-1">
                        {listCanales.map((c) => {
                          const active = contentCanales.includes(c);
                          return (
                            <button
                              key={c}
                              onClick={() =>
                                setContentCanales(
                                  active
                                    ? contentCanales.filter(
                                        (item) => item !== c
                                      )
                                    : [...contentCanales, c]
                                )
                              }
                              className={`rounded px-2 py-1 font-mono text-[8px] font-bold transition-all ${
                                active
                                  ? "bg-emerald-500 text-zinc-950"
                                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                              }`}
                            >
                              {c}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={customCanal}
                          onChange={(e) => setCustomCanal(e.target.value)}
                          placeholder="Agregar canal..."
                          className="border-zinc-850 flex-1 rounded border bg-zinc-950 px-2 py-1 font-mono text-[8px] text-zinc-300 outline-none"
                        />
                        <button
                          onClick={handleAgregarCustomCanal}
                          className="bg-zinc-850 rounded border border-zinc-800 px-2.5 py-1 font-mono text-[8px] font-bold text-zinc-200"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Types selector */}
                    <div className="flex flex-col gap-1">
                      <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
                        Tipo de Formato
                      </label>
                      <div className="mb-2 flex flex-wrap gap-1">
                        {listTipos.map((t) => {
                          const active = contentTipos.includes(t);
                          return (
                            <button
                              key={t}
                              onClick={() =>
                                setContentTipos(
                                  active
                                    ? contentTipos.filter((item) => item !== t)
                                    : [...contentTipos, t]
                                )
                              }
                              className={`rounded px-2 py-1 font-mono text-[8px] font-bold transition-all ${
                                active
                                  ? "bg-emerald-500 text-zinc-950"
                                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={customTipo}
                          onChange={(e) => setCustomTipo(e.target.value)}
                          placeholder="Agregar formato..."
                          className="border-zinc-850 flex-1 rounded border bg-zinc-950 px-2 py-1 font-mono text-[8px] text-zinc-300 outline-none"
                        />
                        <button
                          onClick={handleAgregarCustomTipo}
                          className="bg-zinc-850 rounded border border-zinc-800 px-2.5 py-1 font-mono text-[8px] font-bold text-zinc-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
                        Fecha de Publicación
                      </label>
                      <input
                        type="date"
                        value={contentFecha}
                        onChange={(e) => setContentFecha(e.target.value)}
                        className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
                        Estado de Producción
                      </label>
                      <select
                        value={contentEstado}
                        onChange={(e) =>
                          setContentEstado(e.target.value as any)
                        }
                        className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                      >
                        <option value="Planificado">Planificado (Gris)</option>
                        <option value="Grabado">Grabado (Amarillo)</option>
                        <option value="Editado">Editado (Naranja)</option>
                        <option value="Subido">Subido (Verde)</option>
                      </select>
                    </div>
                  </div>

                  {/* Script details */}
                  <div className="grid grid-cols-1 gap-4 border-t border-zinc-900 pt-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
                        Gancho (Hook Text)
                      </label>
                      <input
                        type="text"
                        value={contentGancho}
                        onChange={(e) => setContentGancho(e.target.value)}
                        placeholder="Ej: Este error te está costando clientes..."
                        className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
                        Gancho Visual (Video Intro)
                      </label>
                      <input
                        type="text"
                        value={contentGanchoVisual}
                        onChange={(e) => setContentGanchoVisual(e.target.value)}
                        placeholder="Ej: Laptop cerrándose de golpe, cara de frustración..."
                        className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
                      Desarrollo (Script Body)
                    </label>
                    <textarea
                      value={contentDesarrollo}
                      onChange={(e) => setContentDesarrollo(e.target.value)}
                      placeholder="Escribe la explicación paso a paso de lo que dices o se ve..."
                      rows={4}
                      className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
                      Llamado a la Acción (CTA)
                    </label>
                    <input
                      type="text"
                      value={contentCta}
                      onChange={(e) => setContentCta(e.target.value)}
                      placeholder="Ej: Comenta SOPORTE y te enviamos la guía..."
                      className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
                      Descripción del video lista para copiar
                    </label>
                    <textarea
                      value={contentDescripcion}
                      onChange={(e) => setContentDescripcion(e.target.value)}
                      placeholder="Hashtags, copy de Instagram/LinkedIn..."
                      rows={3}
                      className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                    />
                  </div>

                  {/* Custom Checklist Template */}
                  <div className="flex flex-col gap-2 border-t border-zinc-900 pt-4">
                    <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
                      Pasos a Seguir (Checklist)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {contentPasos.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[8px] text-zinc-300"
                        >
                          <span>
                            {idx + 1}. {step}
                          </span>
                          <button
                            onClick={() =>
                              setContentPasos(
                                contentPasos.filter((_, i) => i !== idx)
                              )
                            }
                            className="ml-1 text-red-400 hover:text-red-300"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        placeholder="Agregar nuevo paso..."
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            e.currentTarget.value.trim()
                          ) {
                            setContentPasos([
                              ...contentPasos,
                              e.currentTarget.value.trim(),
                            ]);
                            e.currentTarget.value = "";
                          }
                        }}
                        className="border-zinc-850 max-w-[240px] flex-1 rounded border bg-zinc-950 px-2 py-1 font-mono text-[8px] text-zinc-300 outline-none"
                      />
                    </div>
                  </div>

                  <Button onClick={handleSaveContent}>Guardar Contenido</Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Tab: Weekly Grid Calendar (Drag & Drop) */}
        {activeTab === "calendario" && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
            {/* Unassigned backlog column */}
            <div className="md:col-span-3">
              <Card>
                <div className="mb-4 border-b border-zinc-900 pb-2">
                  <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Contenidos Sin Fecha (Backlog)
                  </span>
                  <p className="text-zinc-550 mt-0.5 font-mono text-[8px]">
                    Arrastra tarjetas al calendario para programar
                  </p>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, "")}
                  className="border-zinc-850 flex max-h-[60vh] min-h-[300px] flex-col gap-2 overflow-y-auto rounded-lg border border-dashed bg-zinc-950/20 p-2"
                >
                  {backlogContenidos.length === 0 ? (
                    <p className="text-zinc-550 py-12 text-center font-mono text-[8px]">
                      Sin contenidos pendientes.
                    </p>
                  ) : (
                    backlogContenidos.map((c) => (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, c.id)}
                        onClick={() => {
                          setActiveTab("taller");
                          selectContentForEditing(c);
                        }}
                        className={`cursor-grab rounded-lg border p-2.5 font-mono text-[9px] transition-all hover:bg-zinc-900 active:cursor-grabbing ${getStatusColor(
                          c.estado
                        )}`}
                      >
                        <span className="block font-bold text-zinc-200">
                          {c.titulo}
                        </span>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-zinc-550 text-[8px]">
                            {c.canales?.join(", ") || "Sin canal"}
                          </span>
                          <span className="rounded bg-zinc-800 px-1 text-[8px] text-zinc-300">
                            {c.estado}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* 7 Days Grid Column */}
            <div className="md:col-span-9">
              <Card>
                <div className="mb-4 border-b border-zinc-900 pb-2">
                  <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Cronograma Semanal: {activePlan?.nombre || "Semana"}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
                  {DIAS_SEMANA.map((day, idx) => {
                    const dateStr = getDayDateString(idx);
                    const itemsOnDay = planContenidos.filter(
                      (c) => c.fecha === dateStr
                    );

                    return (
                      <div
                        key={day.key}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, dateStr)}
                        className="border-zinc-850 flex min-h-[350px] flex-col gap-2 rounded-xl border bg-zinc-950/40 p-2.5 transition-all hover:border-zinc-800"
                      >
                        <div className="flex flex-col border-b border-zinc-900 pb-1">
                          <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                            {day.label}
                          </span>
                          <span className="text-zinc-550 font-mono text-[8px]">
                            {dateStr || "Sin configurar"}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-1 flex-col gap-2">
                          {itemsOnDay.map((c) => (
                            <div
                              key={c.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, c.id)}
                              onClick={() => {
                                setActiveTab("taller");
                                selectContentForEditing(c);
                              }}
                              className={`cursor-grab rounded-lg border p-2 font-mono text-[9px] transition-all hover:bg-zinc-900 active:cursor-grabbing ${getStatusColor(
                                c.estado
                              )}`}
                            >
                              <span className="block leading-snug font-bold">
                                {c.titulo}
                              </span>
                              <span className="text-zinc-550 mt-1 block text-[7px]">
                                {c.canales?.join(", ") || "Sin canal"}
                              </span>
                            </div>
                          ))}
                          {itemsOnDay.length === 0 && (
                            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-900/60">
                              <span className="font-mono text-[8px] text-zinc-700 uppercase">
                                Vacío
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Completion Modal sheet */}
        {isCloseoutOpen && (
          <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="border-zinc-850 w-[550px] rounded-xl border bg-zinc-950 p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-3">
                <span className="font-mono text-xs font-bold text-emerald-400 uppercase">
                  🏁 Cierre & Finalización de Semana
                </span>
                <button
                  onClick={() => setIsCloseoutOpen(false)}
                  className="font-mono text-[10px] text-zinc-500 uppercase hover:text-zinc-300"
                >
                  Cerrar
                </button>
              </div>

              <div className="flex flex-col gap-4 text-zinc-200">
                <div className="border-zinc-850 grid grid-cols-2 gap-2 rounded-lg border bg-zinc-900 p-2.5">
                  <div className="text-center">
                    <span className="block font-mono text-[8px] text-zinc-500 uppercase">
                      Completados (Subidos)
                    </span>
                    <span className="font-mono text-lg font-bold text-emerald-400">
                      {
                        planContenidos.filter((c) => c.estado === "Subido")
                          .length
                      }
                    </span>
                  </div>
                  <div className="border-l border-zinc-800 text-center">
                    <span className="block font-mono text-[8px] text-zinc-500 uppercase">
                      Pendientes / En Proceso
                    </span>
                    <span className="font-mono text-lg font-bold text-amber-500">
                      {
                        planContenidos.filter((c) => c.estado !== "Subido")
                          .length
                      }
                    </span>
                  </div>
                </div>

                <div className="flex max-h-[220px] flex-col gap-2 overflow-y-auto border-t border-b border-zinc-900 py-3">
                  <span className="mb-1 block font-mono text-[9px] font-bold text-zinc-400 uppercase">
                    Acciones para contenidos pendientes:
                  </span>
                  {planContenidos
                    .filter((c) => c.estado !== "Subido")
                    .map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded border border-zinc-900 bg-zinc-900/40 p-2 font-mono text-[9px]"
                      >
                        <span className="mr-2 flex-1 truncate font-bold">
                          {c.titulo}
                        </span>
                        <div className="flex gap-2">
                          <label className="flex cursor-pointer items-center gap-1">
                            <input
                              type="radio"
                              name={`action_${c.id}`}
                              checked={rolloverActions[c.id] === "rollover"}
                              onChange={() =>
                                setRolloverActions({
                                  ...rolloverActions,
                                  [c.id]: "rollover",
                                })
                              }
                              className="h-3 w-3 border-zinc-800 bg-zinc-900 text-emerald-500"
                            />
                            <span className="text-[8px] text-zinc-300">
                              Guardar en Backlog
                            </span>
                          </label>
                          <label className="flex cursor-pointer items-center gap-1">
                            <input
                              type="radio"
                              name={`action_${c.id}`}
                              checked={rolloverActions[c.id] === "delete"}
                              onChange={() =>
                                setRolloverActions({
                                  ...rolloverActions,
                                  [c.id]: "delete",
                                })
                              }
                              className="h-3 w-3 border-zinc-800 bg-zinc-900 text-red-500"
                            />
                            <span className="text-[8px] text-red-400">
                              Eliminar
                            </span>
                          </label>
                        </div>
                      </div>
                    ))}
                </div>

                <button
                  onClick={handleExecuteCloseout}
                  className="w-full rounded bg-emerald-500 py-2.5 text-[10px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-600"
                >
                  Ejecutar Cierre y Finalizar Semana
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {isImportModalOpen && (
          <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="border-zinc-850 w-[500px] rounded-xl border bg-zinc-950 p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-3">
                <span className="font-mono text-xs font-bold text-sky-400 uppercase">
                  📥 Importar Planificación (JSON)
                </span>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="font-mono text-[10px] text-zinc-500 uppercase hover:text-zinc-300"
                >
                  Cerrar
                </button>
              </div>

              <div className="flex flex-col gap-3 text-zinc-200">
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='Pega aquí el JSON del planificador... {"planificacion": {...}, "contenidos": [...]}'
                  rows={8}
                  className="border-zinc-850 w-full rounded border bg-zinc-900 p-2 font-mono text-[9px] text-zinc-300 outline-none"
                />
                <button
                  onClick={handleImportJSON}
                  className="hover:bg-sky-450 w-full rounded bg-sky-500 py-2 text-[10px] font-bold text-zinc-950 uppercase"
                >
                  Procesar e Importar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
