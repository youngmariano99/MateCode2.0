/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import React, { useState, useEffect } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { GestionarIngenieriaUseCase } from "../../../application/use-cases/proyecto/gestionar-ingenieria.use-case";
import { useToast } from "../../hooks/useToast";
import { db } from "../../../offline/dexie/db";
import { useLiveQuery } from "dexie-react-hooks";

interface PromptGeneratorProps {
  proyectoId: string;
}

export const PromptGenerator: React.FC<PromptGeneratorProps> = ({
  proyectoId,
}) => {
  const { mostrarToast } = useToast();
  const uc = new GestionarIngenieriaUseCase();

  const [promptText, setPromptText] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [syncJsonText, setSyncJsonText] = useState("");

  // Tab control for right card
  const [activoTabDerecha, setActivoTabDerecha] = useState<
    "importar" | "sincronizar"
  >("importar");

  // Load Prompt Templates
  const templates = (useLiveQuery(() => db.prompt_templates.toArray()) ||
    []) as any[];
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // Variables parsed from selected template
  const [variables, setVariables] = useState<string[]>([]);
  const [variablesValues, setVariablesValues] = useState<
    Record<string, string>
  >({});

  // Technical memory state (synced dependencies/schema)
  const technicalState = useLiveQuery(
    () => db.proyecto_estado_tecnico.get(proyectoId),
    [proyectoId]
  ) as any;

  // Auto-populate first template if available
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  // Parse template variables and fetch matching values from DB
  useEffect(() => {
    if (!selectedTemplateId) return;

    const loadVariables = async () => {
      const template = await db.prompt_templates.get(selectedTemplateId);
      if (!template) return;

      const content = template.contenido as string;
      const regex = /\{\{(.*?)\}\}/g;
      const matches: string[] = [];
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (!matches.includes(match[1])) {
          matches.push(match[1]);
        }
      }

      setVariables(matches);

      // Fetch pre-populated values from DB context
      const poContext = ((await db.proyecto_contexto.get(proyectoId)) ||
        {}) as any;
      const ds = ((await db.proyecto_design_system.get(proyectoId)) ||
        {}) as any;
      const proyecto = (await db.proyectos.get(proyectoId)) as any;

      const stack = (proyecto?.stack || {}) as any;
      const estandares = (proyecto?.estandares || {}) as any;

      const dbValues: Record<string, string> = {
        dolores_cliente: (
          poContext.doloresCliente ||
          proyecto?.productOwner?.dolor ||
          ""
        ).toString(),
        reglas_negocio: (
          poContext.reglasNegocio ||
          proyecto?.productOwner?.restricciones ||
          ""
        ).toString(),
        publico_objetivo: (
          poContext.publicoObjetivo ||
          proyecto?.productOwner?.usuarios ||
          ""
        ).toString(),

        arquetipo: (ds.arquetipo || "").toString(),
        metafora: (ds.metafora || "").toString(),
        radio_bordes: (ds.radioBordes || "").toString(),
        sombras: (ds.sombras || "").toString(),
        directrices_diseno: (ds.directrizNegacion || "").toString(),
        escala_espaciado: (ds.escalaEspaciado || "").toString(),
        reglas_color: (ds.reglaColor || "").toString(),
        tipografias: (ds.tipografias || "").toString(),
        animaciones: (ds.estiloAnimaciones || "").toString(),

        stack_frontend: (stack.frontend || []).join(", "),
        stack_backend: (stack.backend || []).join(", "),
        stack_base_datos: (stack.baseDatos || []).join(", "),
        arquitectura_patrones: [
          ...(estandares.arquitectura || []),
          ...(estandares.patrones || []),
        ].join(", "),
      };

      const initialValues: Record<string, string> = {};
      matches.forEach((v) => {
        initialValues[v] = dbValues[v] || "";
      });
      setVariablesValues(initialValues);
    };

    loadVariables();
  }, [selectedTemplateId, proyectoId]);

  const handleVariableChange = (name: string, value: string) => {
    setVariablesValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGenerarPrompt = async () => {
    if (!selectedTemplateId) return;
    const res = await uc.generarPromptEspecializado(
      proyectoId,
      selectedTemplateId,
      variablesValues
    );
    if (res.ok) {
      setPromptText(res.valor);
      mostrarToast("Prompt dinámico resuelto.", "exito");
    }
  };

  const handleGenerarPromptIngesta = async () => {
    const res = await uc.generarPromptIngesta(proyectoId);
    if (res.ok) {
      setPromptText(res.valor);
      mostrarToast("Prompt de Ingesta generado.", "exito");
    }
  };

  const handleCopiarPrompt = () => {
    if (!promptText) return;
    navigator.clipboard.writeText(promptText);
    mostrarToast("Prompt copiado al portapapeles.", "exito");
  };

  const handleImportarJSON = async () => {
    if (!jsonText.trim()) {
      mostrarToast("Por favor pega el JSON antes de importar.", "error");
      return;
    }
    const res = await uc.importarBacklogJSON(proyectoId, jsonText);
    if (res.ok) {
      mostrarToast("Backlog importado y creado con éxito.", "exito");
      setJsonText("");
    } else {
      mostrarToast(
        res.error?.mensaje || "Error al importar el backlog",
        "error"
      );
    }
  };

  const handleSincronizarEstado = async () => {
    if (!syncJsonText.trim()) {
      mostrarToast("Por favor pega el bloque json-app-sync.", "error");
      return;
    }
    const res = await uc.sincronizarEstado(proyectoId, syncJsonText);
    if (res.ok) {
      mostrarToast("Estado técnico sincronizado con éxito.", "exito");
      setSyncJsonText("");
    } else {
      mostrarToast(
        res.error?.mensaje || "Error al sincronizar estado",
        "error"
      );
    }
  };

  const handleExportarMarkdown = async () => {
    const res = await uc.exportarContextoMarkdown(proyectoId);
    if (res.ok) {
      const blob = new Blob([res.valor], {
        type: "text/markdown;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `proyecto-contexto-${proyectoId}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      mostrarToast("Archivo Markdown descargado localmente.", "exito");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Dynamic Prompt Builder Card */}
      <Card className="flex flex-col gap-4">
        <div className="border-b border-[#2A2A2E] pb-3">
          <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            🤖 Generador de Prompts Dinámicos e Ingesta
          </h3>
          <p className="font-mono text-[10px] text-zinc-500">
            Resuelve placeholders del contexto del proyecto e inyecta contratos
            de retorno
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              Seleccionar Plantilla Maestra
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-[#18181B] p-2 font-mono text-xs text-zinc-200 focus:outline-none"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.fase}] {t.titulo}
                </option>
              ))}
            </select>
          </div>

          {/* Form Fields for Variables */}
          {variables.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-zinc-950/40 p-3">
              <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
                Valores del Prompt (Editar si faltan):
              </span>
              <div className="flex max-h-[160px] flex-col gap-2.5 overflow-y-auto pr-1">
                {variables.map((v) => (
                  <div key={v} className="flex flex-col gap-0.5">
                    <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                      {v.replace(/_/g, " ")}
                    </label>
                    <input
                      type="text"
                      value={variablesValues[v] || ""}
                      onChange={(e) => handleVariableChange(v, e.target.value)}
                      placeholder={`Ingresar ${v}...`}
                      className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-100 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerarPrompt} className="flex-1">
              Resolver Prompt
            </Button>
            <button
              onClick={handleGenerarPromptIngesta}
              className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 font-mono text-[10px] font-bold text-sky-400 transition-all select-none hover:bg-sky-500 hover:text-black"
            >
              Prompt Ingesta ↩
            </button>
            <button
              onClick={handleExportarMarkdown}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-[10px] font-bold text-white transition-all select-none hover:bg-zinc-700"
            >
              Exportar MD
            </button>
          </div>

          <textarea
            readOnly
            value={promptText}
            placeholder="Haz clic en Resolver Prompt o Ingesta para iniciar..."
            className="h-[140px] w-full rounded-xl border border-[#2A2A2E] bg-zinc-950 p-4 font-mono text-[10px] text-zinc-400 focus:outline-none"
          />

          {promptText && (
            <Button onClick={handleCopiarPrompt} className="w-full">
              Copiar Prompt Completo
            </Button>
          )}
        </div>
      </Card>

      {/* Sync and Ingestion Card */}
      <Card className="flex flex-col gap-4">
        {/* Tab Selector */}
        <div className="flex border-b border-[#2A2A2E]">
          <button
            onClick={() => setActivoTabDerecha("importar")}
            className={`flex-1 pb-2 font-mono text-xs font-bold uppercase transition-all ${
              activoTabDerecha === "importar"
                ? "border-b-2 border-emerald-500 text-emerald-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            📥 Importar Backlog
          </button>
          <button
            onClick={() => setActivoTabDerecha("sincronizar")}
            className={`flex-1 pb-2 font-mono text-xs font-bold uppercase transition-all ${
              activoTabDerecha === "sincronizar"
                ? "border-b-2 border-emerald-500 text-emerald-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            🔄 Sincronizar Estado
          </button>
        </div>

        {activoTabDerecha === "importar" ? (
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="font-mono text-xs font-bold text-zinc-200">
                Pega el JSON del Backlog o Ingesta
              </h4>
              <p className="font-mono text-[9px] leading-normal text-zinc-500">
                Soporta tanto backlog regular de tareas como el JSON de Ingesta
                (Reverse Engineering) que recupera el stack, contexto y diseño
                del proyecto en curso.
              </p>
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='Pega el JSON aquí (ej: { "contexto": {...}, "epicas": [], "historias": [] })'
              className="h-[140px] w-full rounded-xl border border-[#2A2A2E] bg-zinc-950 p-4 font-mono text-[10px] text-zinc-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />

            <Button onClick={handleImportarJSON} className="w-full">
              Importar Proyecto / Backlog JSON
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="font-mono text-xs font-bold text-zinc-200">
                Sincronizador Universal (Retorno de IDE)
              </h4>
              <p className="font-mono text-[9px] leading-normal text-zinc-500">
                Pega el bloque de código de lenguaje `json-app-sync` devuelto
                por tu agente de IA para actualizar de forma bidireccional las
                dependencias y tablas del sistema.
              </p>
            </div>

            <textarea
              value={syncJsonText}
              onChange={(e) => setSyncJsonText(e.target.value)}
              placeholder="Pega el bloque json-app-sync aquí..."
              className="h-[140px] w-full rounded-xl border border-[#2A2A2E] bg-zinc-950 p-4 font-mono text-[10px] text-zinc-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />

            <Button onClick={handleSincronizarEstado} className="w-full">
              Procesar y Sincronizar Cambios
            </Button>
          </div>
        )}

        {/* Technical Memory Area */}
        {technicalState && (
          <div className="mt-1 flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
            <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              🧠 Memoria Técnica Sincronizada (Autocompletado):
            </span>
            <div className="flex max-h-[100px] flex-col gap-2 overflow-y-auto pr-1">
              {/* Dependencies */}
              {Array.isArray(technicalState.dependencias) &&
                technicalState.dependencias.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="mr-1 font-mono text-[8px] font-bold text-zinc-500 uppercase">
                      Librerías:
                    </span>
                    {technicalState.dependencias.map((dep: any) => (
                      <span
                        key={dep}
                        className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[8px] text-zinc-300"
                      >
                        📦 {dep}
                      </span>
                    ))}
                  </div>
                )}
              {/* Database Schema */}
              {technicalState.esquemaDb &&
                Object.keys(technicalState.esquemaDb).length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                      Esquemas DB Activos:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.keys(technicalState.esquemaDb).map((tableKey) => {
                        const tableObj: any = (technicalState.esquemaDb as any)[
                          tableKey
                        ];
                        return (
                          <div
                            key={tableKey}
                            className="rounded border border-zinc-800/80 bg-zinc-950 p-1.5 font-mono text-[8px]"
                          >
                            <span className="font-bold text-emerald-400">
                              🗂️ {tableKey}
                            </span>
                            <p className="mt-0.5 text-[7px] leading-tight text-zinc-500">
                              {tableObj.descripcion}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-0.5">
                              {(tableObj.campos || []).map((c: string) => (
                                <span
                                  key={c}
                                  className="rounded bg-zinc-900 px-1 text-[6px] text-zinc-400"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
