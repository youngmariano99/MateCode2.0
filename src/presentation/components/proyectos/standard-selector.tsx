"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import React, { useState, useEffect } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { Input } from "../input";
import { db } from "../../../offline/dexie/db";
import { useToast } from "../../hooks/useToast";
import { useLiveQuery } from "dexie-react-hooks";

interface StandardSelectorProps {
  proyectoId: string;
  initialEstandares?: {
    seguridad?: string[];
    escalabilidad?: string[];
    dx?: string[];
    testing?: string[];
    trazabilidad?: string[];
    robustez?: string[];
    devops?: string[];
    coberturaMinima?: number;
    // Backward compatibility & custom keys
    [key: string]: any;
  };
  onSave: (estandares: Record<string, unknown>) => void;
}

const CATEGORIES: Record<string, string> = {
  seguridad: "Seguridad Total (Anti-ataques y fugas)",
  escalabilidad: "Escalabilidad y Modularidad",
  dx: "Experiencia del Desarrollador (DX)",
  testing: "AutoTesteable (Testing Continuo)",
  trazabilidad: "Trazabilidad y Auditoría",
  robustez: "Anti-Errores y Robustez",
  devops: "Buenas Prácticas y DevOps (CI/CD)",
};

const DEFAULT_PRESETS: Record<string, string[]> = {
  seguridad: [
    "OWASP (Open Worldwide Application Security Project)",
    "Autenticación y Autorización",
    "Anti-Inyección (SQL/NoSQL)",
    "Cifrado (Criptografía)",
  ],
  escalabilidad: [
    "Arquitectura Limpia (Clean Architecture) o Hexagonal",
    "Diseño Guiado por el Dominio (DDD - Domain Driven Design)",
    "Inyección de Dependencias (DI)",
    "3 Formas formales",
  ],
  dx: [
    "Tipado Estático Fuerte",
    "Principios SOLID",
    "Documentación Automatizada (OpenAPI (Swagger))",
  ],
  testing: [
    "La Pirámide de Testing: Unitarios (70%), Integración (20%), End-to-End / E2E (10%)",
    "TDD (Test-Driven Development)",
  ],
  trazabilidad: [
    "OpenTelemetry",
    "Structured Logging (Logs Estructurados)",
    "Soft Deletes (Borrado Lógico) y Tablas de Auditoría",
  ],
  robustez: [
    "Validación de Esquemas en la Puerta",
    "DTOs (Data Transfer Objects)",
    "Fail-Fast (Fallo Rápido)",
  ],
  devops: [
    "Contenedorización",
    "Infraestructura como Código (IaC)",
    "Pipelines de CI/CD (Integración y Despliegue Continuo)",
  ],
};

const JSON_TEMPLATE = `{
  "seguridad": [
    "OWASP (Open Worldwide Application Security Project)",
    "Autenticación y Autorización"
  ],
  "escalabilidad": [
    "Arquitectura Limpia (Clean Architecture) o Hexagonal"
  ],
  "dx": [
    "Tipado Estático Fuerte",
    "Principios SOLID"
  ],
  "testing": [
    "TDD (Test-Driven Development)"
  ],
  "trazabilidad": [
    "Structured Logging (Logs Estructurados)"
  ],
  "robustez": [
    "DTOs (Data Transfer Objects)"
  ],
  "devops": [
    "Contenedorización"
  ],
  "coberturaMinima": 80
}`;

export const StandardSelector: React.FC<StandardSelectorProps> = ({
  proyectoId,
  initialEstandares = {},
  onSave,
}) => {
  const { mostrarToast } = useToast();

  // Load custom presets from DB
  const customPresets =
    (useLiveQuery(() =>
      db.agencia_config
        .filter((item: any) => item.tipo === "preset_estandar")
        .toArray()
    ) as any[] | undefined) || [];

  const safeInitial = initialEstandares || {};

  const [customCategories, setCustomCategories] = useState<
    Record<string, string>
  >({});

  const [estandares, setEstandares] = useState<Record<string, string[]>>({
    seguridad: safeInitial.seguridad || [],
    escalabilidad: safeInitial.escalabilidad || [],
    dx: safeInitial.dx || [],
    testing: safeInitial.testing || [],
    trazabilidad: safeInitial.trazabilidad || [],
    robustez: safeInitial.robustez || [],
    devops: safeInitial.devops || [],
  });

  const [coberturaMinima, setCoberturaMinima] = useState(
    safeInitial.coberturaMinima || 80
  );

  // Sync effect when initialEstandares prop loads or updates
  useEffect(() => {
    if (initialEstandares) {
      const defaultKeys = [
        "seguridad",
        "escalabilidad",
        "dx",
        "testing",
        "trazabilidad",
        "robustez",
        "devops",
        "coberturaMinima",
        "arquitectura",
        "patrones",
        "buenasPracticas",
        "principios",
      ];
      const extraCats: Record<string, string> = {};
      const nextEst: Record<string, string[]> = {};

      Object.entries(initialEstandares).forEach(([key, val]) => {
        if (!defaultKeys.includes(key) && Array.isArray(val)) {
          const formattedLabel = key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());
          extraCats[key] = formattedLabel;
          nextEst[key] = val;
        }
      });

      setCustomCategories((prev) => ({ ...prev, ...extraCats }));
      setEstandares({
        seguridad: initialEstandares.seguridad || [],
        escalabilidad: initialEstandares.escalabilidad || [],
        dx: initialEstandares.dx || [],
        testing: initialEstandares.testing || [],
        trazabilidad: initialEstandares.trazabilidad || [],
        robustez: initialEstandares.robustez || [],
        devops: initialEstandares.devops || [],
        ...nextEst,
      });
      if (typeof initialEstandares.coberturaMinima === "number") {
        setCoberturaMinima(initialEstandares.coberturaMinima);
      }
    }
  }, [initialEstandares]);

  // State to hold manual entries input value for each category
  const [manualInputs, setManualInputs] = useState<Record<string, string>>({});

  // Dynamic presets options
  const [dinamicosPresets, setDinamicosPresets] = useState<
    Record<string, string[]>
  >({});

  // Load custom added standards to select list
  useEffect(() => {
    const loaded: Record<string, string[]> = {};

    Object.keys({ ...CATEGORIES, ...customCategories }).forEach((cat) => {
      const selected = estandares[cat] || [];
      const defaults = DEFAULT_PRESETS[cat] || [];
      const extra = selected.filter((s) => !defaults.includes(s));
      loaded[cat] = extra;
    });

    setDinamicosPresets(loaded);
  }, [estandares, customCategories]);

  // Preset name & JSON paste state
  const [nombrePreset, setNombrePreset] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [showJsonArea, setShowJsonArea] = useState(false);

  // Modal / Form state for creating a new custom category
  const [showNuevaCatModal, setShowNuevaCatModal] = useState(false);
  const [nuevaCatNombre, setNuevaCatNombre] = useState("");

  const handleCrearCategoria = () => {
    const cleanNombre = nuevaCatNombre.trim();
    if (!cleanNombre) {
      mostrarToast("Escribe un nombre para la categoría.", "error");
      return;
    }

    const key = cleanNombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_");

    if (CATEGORIES[key] || customCategories[key]) {
      mostrarToast("Ya existe una categoría con ese nombre.", "error");
      return;
    }

    setCustomCategories((prev) => ({ ...prev, [key]: cleanNombre }));
    setEstandares((prev) => ({ ...prev, [key]: [] }));
    setManualInputs((prev) => ({ ...prev, [key]: "" }));
    setNuevaCatNombre("");
    setShowNuevaCatModal(false);
    mostrarToast(`Categoría "${cleanNombre}" creada exitosamente.`, "exito");
  };

  const handleEliminarCategoria = (key: string) => {
    const catLabel = customCategories[key] || key;
    setCustomCategories((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setEstandares((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    mostrarToast(`Categoría "${catLabel}" eliminada.`, "info");
  };

  const togglePreset = (category: string, val: string) => {
    const current = estandares[category] || [];
    if (current.includes(val)) {
      setEstandares({
        ...estandares,
        [category]: current.filter((v) => v !== val),
      });
    } else {
      setEstandares({
        ...estandares,
        [category]: [...current, val],
      });
    }
  };

  const handleAddManual = (category: string) => {
    const val = manualInputs[category]?.trim();
    if (!val) return;

    const current = estandares[category] || [];
    if (!current.includes(val)) {
      setEstandares({
        ...estandares,
        [category]: [...current, val],
      });
    }

    setManualInputs({
      ...manualInputs,
      [category]: "",
    });
  };

  const removeSelected = (category: string, itemVal: string) => {
    const current = estandares[category] || [];
    setEstandares({
      ...estandares,
      [category]: current.filter((v) => v !== itemVal),
    });
  };

  const handleSavePreset = async () => {
    if (!nombrePreset.trim()) {
      mostrarToast(
        "Por favor escribe un nombre para la plantilla de la agencia.",
        "error"
      );
      return;
    }
    const id = `preset_estandar_${Date.now()}`;
    await db.agencia_config.put({
      id,
      nombre: nombrePreset,
      tipo: "preset_estandar",
      data: {
        estandares,
        customCategories,
        coberturaMinima,
      },
    });
    setNombrePreset("");
    mostrarToast("Configuración de estándares guardada con éxito.", "exito");
  };

  const handleLoadPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = customPresets.find((p) => p.id === presetId);
    if (found && found.data) {
      if (found.data.customCategories) {
        setCustomCategories(found.data.customCategories);
      }
      setEstandares(found.data.estandares || {});
      setCoberturaMinima(found.data.coberturaMinima || 80);
      mostrarToast(`Configuración "${found.nombre}" cargada.`, "exito");
    }
  };

  const copiarPlantillaJSON = () => {
    navigator.clipboard.writeText(JSON_TEMPLATE);
    mostrarToast(
      "Plantilla JSON de estándares copiada al portapapeles.",
      "exito"
    );
  };

  const importarJSON = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const newCustoms: Record<string, string> = {};
      const importedEstandares: Record<string, string[]> = { ...estandares };

      Object.entries(parsed).forEach(([k, v]) => {
        if (k === "coberturaMinima" && typeof v === "number") {
          setCoberturaMinima(v);
        } else if (Array.isArray(v)) {
          if (!CATEGORIES[k]) {
            const label = k
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase());
            newCustoms[k] = label;
          }
          importedEstandares[k] = v as string[];
        }
      });

      setCustomCategories((prev) => ({ ...prev, ...newCustoms }));
      setEstandares(importedEstandares);
      setJsonText("");
      setShowJsonArea(false);
      mostrarToast("JSON importado y estándares actualizados.", "exito");
    } catch (err: any) {
      mostrarToast(`JSON Inválido: ${err.message}`, "error");
    }
  };

  const descargarEspecificacionCompleta = async () => {
    try {
      const proj = await db.proyectos.get(proyectoId);
      const stackData = proj?.stack as any;

      let md = `# Especificación Técnica del Proyecto: ${
        proj?.nombre || "Detalles del Sistema"
      }\n\n`;
      md += `*   **Tipo de Proyecto:** ${proj?.tipo || "No especificado"}\n`;
      md += `*   **Fecha de Documentación:** ${new Date().toLocaleDateString()}\n\n`;
      md += `## 1. Stack Tecnológico Seleccionado\n\n`;

      if (stackData) {
        Object.entries(stackData).forEach(([layer, list]: [string, any]) => {
          if (Array.isArray(list) && list.length > 0) {
            md += `### ${layer.toUpperCase()}\n`;
            list.forEach((t) => {
              md += `- ${t}\n`;
            });
            md += `\n`;
          }
        });
      } else {
        md += `*No se ha configurado el stack tecnológico todavía.*\n\n`;
      }

      md += `## 2. Estándares de Ingeniería y Buenas Prácticas\n\n`;
      md += `*   **Cobertura Mínima de Testing requerida:** ${coberturaMinima}%\n\n`;

      let hasStandards = false;
      const allCatMap = { ...CATEGORIES, ...customCategories };
      Object.entries(estandares).forEach(([category, list]) => {
        if (Array.isArray(list) && list.length > 0) {
          hasStandards = true;
          const catLabel = allCatMap[category] || category;
          md += `### ${catLabel}\n`;
          list.forEach((std) => {
            md += `- ${std}\n`;
          });
          md += `\n`;
        }
      });

      if (!hasStandards) {
        md += `*No se han seleccionado estándares específicos de desarrollo.*\n`;
      }

      const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `especificacion_tecnica_${proyectoId}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      mostrarToast("Descargando especificación técnica .md...", "info");
    } catch (err: any) {
      mostrarToast(`Error al exportar: ${err.message}`, "error");
    }
  };

  const handleSave = () => {
    mostrarToast("Estándares guardados con éxito.", "exito");
    onSave({
      ...estandares,
      coberturaMinima,
    });
  };

  const allCategoriesMap = { ...CATEGORIES, ...customCategories };

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between border-b border-[#2A2A2E] pb-3">
        <div>
          <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            Estándares y Prácticas de Ingeniería
          </h3>
          <p className="text-zinc-550 mt-0.5 font-mono text-[10px]">
            Estandariza los procedimientos del equipo. Selecciona presets o crea
            nuevas categorías de ingeniería.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowNuevaCatModal(true)}
            className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[9px] font-bold text-emerald-400 uppercase transition-all hover:bg-emerald-500/20"
          >
            + Crear Nueva Categoría
          </button>
          <button
            type="button"
            onClick={descargarEspecificacionCompleta}
            className="rounded border border-sky-500/20 bg-sky-500/10 px-2 py-1 font-mono text-[9px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
          >
            📥 Exportar .md
          </button>
        </div>
      </div>

      {/* Preset selector bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-900 bg-zinc-950 p-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
            Plantillas Guardadas de la Agencia:
          </span>
          <select
            value={selectedPresetId}
            onChange={(e) => handleLoadPreset(e.target.value)}
            className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-200 outline-none"
          >
            <option value="">Cargar plantilla existente...</option>
            {customPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Nombre para guardar plantilla..."
            value={nombrePreset}
            onChange={(e) => setNombrePreset(e.target.value)}
            className="w-[180px] rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-200 outline-none"
          />
          <button
            type="button"
            onClick={handleSavePreset}
            className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
          >
            Guardar Plantilla
          </button>
        </div>
      </div>

      {/* JSON actions toggle */}
      <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-2">
        <span className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
          Importación Rápida por JSON / Prompt IA
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copiarPlantillaJSON}
            className="font-mono text-[9px] text-zinc-400 underline hover:text-zinc-200"
          >
            Copiar Estructura JSON para IA
          </button>
          <button
            type="button"
            onClick={() => setShowJsonArea(!showJsonArea)}
            className="font-mono text-[9px] font-bold text-sky-400 hover:text-sky-300"
          >
            {showJsonArea ? "Ocultar Input JSON" : "Pagar JSON de la IA"}
          </button>
        </div>
      </div>

      {showJsonArea && (
        <div className="mb-5 flex flex-col gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="Pega aquí la estructura JSON devuelta por la IA..."
            rows={4}
            className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[9px] text-zinc-300 outline-none"
          />
          <button
            type="button"
            onClick={importarJSON}
            className="self-end rounded bg-sky-500 px-3 py-1 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-sky-400"
          >
            Procesar e Importar Estándares
          </button>
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {Object.entries(allCategoriesMap).map(([category, label]) => {
          const defaults = DEFAULT_PRESETS[category] || [];
          const extras = dinamicosPresets[category] || [];
          const selected = estandares[category] || [];
          const isCustomCategory = !CATEGORIES[category];

          return (
            <div
              key={category}
              className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-zinc-950/40 p-3"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                <span className="font-mono text-[10px] font-bold text-zinc-200 uppercase">
                  {label}
                </span>
                {isCustomCategory && (
                  <button
                    type="button"
                    onClick={() => handleEliminarCategoria(category)}
                    className="font-mono text-[8px] text-red-400 underline hover:text-red-300"
                  >
                    × Eliminar Categoría
                  </button>
                )}
              </div>

              {/* Presets checkboxes */}
              <div className="my-1 flex flex-col gap-1.5">
                {[...defaults, ...extras].map((val) => {
                  const isChecked = selected.includes(val);
                  return (
                    <label
                      key={val}
                      className="flex cursor-pointer items-start gap-2 text-zinc-300 hover:text-white"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePreset(category, val)}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:ring-offset-0 focus:outline-none"
                      />
                      <span
                        className={`font-mono text-[10px] ${
                          isChecked
                            ? "font-bold text-emerald-400"
                            : "text-zinc-400"
                        }`}
                      >
                        {val}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Manual input for category */}
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Añadir regla o estándar..."
                  value={manualInputs[category] || ""}
                  onChange={(e) =>
                    setManualInputs({
                      ...manualInputs,
                      [category]: e.target.value,
                    })
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    (e.preventDefault(), handleAddManual(category))
                  }
                  className="border-zinc-850 flex-1 rounded border bg-zinc-950 px-2 py-1 font-mono text-[9px] text-zinc-200 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAddManual(category)}
                  className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[9px] font-bold text-zinc-300 hover:bg-zinc-800"
                >
                  +
                </button>
              </div>

              {/* Selected custom chips */}
              {selected.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1 border-t border-zinc-900/60 pt-1.5">
                  {selected.map((itemVal) => (
                    <span
                      key={itemVal}
                      className="inline-flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[8px] text-zinc-300"
                    >
                      <span className="max-w-[200px] truncate">{itemVal}</span>
                      <button
                        type="button"
                        onClick={() => removeSelected(category, itemVal)}
                        className="text-zinc-550 font-bold hover:text-red-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Coverage Slider */}
      <div className="mt-5 flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950 p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
            Pirámide de Testing & Cobertura Mínima
          </span>
          <span className="font-mono text-xs font-bold text-emerald-400">
            {coberturaMinima}%
          </span>
        </div>
        <input
          type="range"
          min="50"
          max="100"
          value={coberturaMinima}
          onChange={(e) => setCoberturaMinima(Number(e.target.value))}
          className="cursor-pointer accent-emerald-500"
        />
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-[#2A2A2E] pt-4">
        <Button onClick={handleSave}>Guardar Estándares</Button>
      </div>

      {/* Modal for creating a new custom category */}
      {showNuevaCatModal && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="border-zinc-850 w-[420px] rounded-xl border bg-zinc-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-3">
              <span className="font-mono text-xs font-bold text-emerald-400 uppercase">
                + Crear Nueva Categoría de Estándares
              </span>
              <button
                onClick={() => setShowNuevaCatModal(false)}
                className="font-mono text-[10px] text-zinc-500 uppercase hover:text-zinc-300"
              >
                Cerrar
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                  Título de la Categoría
                </label>
                <input
                  type="text"
                  value={nuevaCatNombre}
                  onChange={(e) => setNuevaCatNombre(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    (e.preventDefault(), handleCrearCategoria())
                  }
                  placeholder="Ej: Usabilidad & Accesibilidad, Rendimiento & Caching..."
                  className="border-zinc-850 rounded border bg-zinc-900 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                />
              </div>

              <button
                onClick={handleCrearCategoria}
                className="mt-1 w-full rounded bg-emerald-500 py-2 text-[10px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-600"
              >
                Crear Categoría
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
