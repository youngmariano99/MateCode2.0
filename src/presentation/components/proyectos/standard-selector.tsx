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
    // Backward compatibility keys
    arquitectura?: string[];
    patrones?: string[];
    buenasPracticas?: string[];
    principios?: string[];
  };
  onSave: (estandares: Record<string, unknown>) => void;
}

const CATEGORIES = {
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
      db.agencia_config.where("tipo").equals("preset_estandar").toArray()
    ) as any[] | undefined) || [];

  const safeInitial = initialEstandares || {};

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

  useEffect(() => {
    if (initialEstandares) {
      setEstandares({
        seguridad: initialEstandares.seguridad || [],
        escalabilidad: initialEstandares.escalabilidad || [],
        dx: initialEstandares.dx || [],
        testing: initialEstandares.testing || [],
        trazabilidad: initialEstandares.trazabilidad || [],
        robustez: initialEstandares.robustez || [],
        devops: initialEstandares.devops || [],
      });
      if (typeof initialEstandares.coberturaMinima === "number") {
        setCoberturaMinima(initialEstandares.coberturaMinima);
      }
    }
  }, [initialEstandares]);

  // State to hold manual entries input value for each category
  const [manualInputs, setManualInputs] = useState<Record<string, string>>({
    seguridad: "",
    escalabilidad: "",
    dx: "",
    testing: "",
    trazabilidad: "",
    robustez: "",
    devops: "",
  });

  // Dynamic presets options
  const [dinamicosPresets, setDinamicosPresets] = useState<
    Record<string, string[]>
  >({
    seguridad: [],
    escalabilidad: [],
    dx: [],
    testing: [],
    trazabilidad: [],
    robustez: [],
    devops: [],
  });

  // Load custom added standards to select list
  useEffect(() => {
    const loaded: Record<string, string[]> = {
      seguridad: [],
      escalabilidad: [],
      dx: [],
      testing: [],
      trazabilidad: [],
      robustez: [],
      devops: [],
    };

    // Load any custom entries that are selected but not in default list
    (Object.keys(loaded) as Array<keyof typeof loaded>).forEach((cat) => {
      const selected = estandares[cat] || [];
      const defaults = DEFAULT_PRESETS[cat] || [];
      const extra = selected.filter((s) => !defaults.includes(s));
      loaded[cat] = extra;
    });

    setDinamicosPresets(loaded);
  }, [estandares]);

  // Preset name state
  const [nombrePreset, setNombrePreset] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");

  // JSON Paste state
  const [jsonText, setJsonText] = useState("");
  const [showJsonArea, setShowJsonArea] = useState(false);

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

    // Add to selected list directly
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

  const handleSavePreset = async () => {
    if (!nombrePreset.trim()) {
      mostrarToast(
        "Escribe un nombre para guardar esta configuración.",
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
      const importedEstandares: Record<string, string[]> = {
        seguridad: Array.isArray(parsed.seguridad) ? parsed.seguridad : [],
        escalabilidad: Array.isArray(parsed.escalabilidad)
          ? parsed.escalabilidad
          : [],
        dx: Array.isArray(parsed.dx) ? parsed.dx : [],
        testing: Array.isArray(parsed.testing) ? parsed.testing : [],
        trazabilidad: Array.isArray(parsed.trazabilidad)
          ? parsed.trazabilidad
          : [],
        robustez: Array.isArray(parsed.robustez) ? parsed.robustez : [],
        devops: Array.isArray(parsed.devops) ? parsed.devops : [],
      };

      setEstandares(importedEstandares);
      if (typeof parsed.coberturaMinima === "number") {
        setCoberturaMinima(parsed.coberturaMinima);
      }
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

      let md = `# Especificación Técnica del Proyecto: ${proj?.nombre || "Detalles del Sistema"}\n\n`;
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
      Object.entries(estandares).forEach(([category, list]) => {
        if (list.length > 0) {
          hasStandards = true;
          const catLabel =
            CATEGORIES[category as keyof typeof CATEGORIES] || category;
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
    onSave({
      ...estandares,
      coberturaMinima,
    });
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
        <div>
          <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            Estándares de Ingeniería y Buenas Prácticas
          </h3>
          <p className="text-zinc-550 mt-0.5 font-mono text-[9px]">
            Elige los lineamientos técnicos para guiar el desarrollo de prompts
            y código
          </p>
        </div>
        <button
          type="button"
          onClick={descargarEspecificacionCompleta}
          className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[9px] font-bold text-sky-400 hover:text-sky-300"
        >
          📥 Descargar Especificación (.md)
        </button>
      </div>

      {/* Preset Custom Configuration Loader */}
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-zinc-900 bg-zinc-950/40 p-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
            Cargar Configuración Guardada
          </label>
          <select
            value={selectedPresetId}
            onChange={(e) => handleLoadPreset(e.target.value)}
            className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
          >
            <option value="">Selecciona plantilla...</option>
            {customPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
            Guardar Configuración Actual
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={nombrePreset}
              onChange={(e) => setNombrePreset(e.target.value)}
              placeholder="Nombre del preset..."
              className="border-zinc-850 flex-1 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleSavePreset}
              className="shrink-0 rounded bg-emerald-500 px-3 py-1 text-[10px] font-bold text-zinc-950 uppercase"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>

      {/* JSON Import/Export Actions */}
      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950/20 p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
            📦 Importar / Exportar con JSON
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copiarPlantillaJSON}
              className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300"
            >
              📋 Copiar Plantilla JSON
            </button>
            <button
              type="button"
              onClick={() => setShowJsonArea(!showJsonArea)}
              className="text-[9px] font-bold text-zinc-400 hover:text-zinc-200"
            >
              {showJsonArea ? "Ocultar" : "Mostrar Caja JSON"}
            </button>
          </div>
        </div>

        {showJsonArea && (
          <div className="animate-in slide-in-from-top-1 mt-1 flex flex-col gap-2">
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="Pega aquí tu JSON de estándares..."
              rows={4}
              className="border-zinc-850 rounded border bg-zinc-950 p-2 font-mono text-[9px] text-zinc-300 outline-none focus:border-emerald-500"
            />
            <button
              onClick={importarJSON}
              className="self-end rounded bg-emerald-500 px-4 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-600"
            >
              Cargar desde JSON
            </button>
          </div>
        )}
      </div>

      {/* Main Categories Selection */}
      <div className="flex max-h-[50vh] flex-col gap-5 overflow-y-auto pr-1">
        {(
          Object.entries(CATEGORIES) as Array<[keyof typeof CATEGORIES, string]>
        ).map(([category, catLabel]) => {
          const list = estandares[category] || [];
          const defaults = DEFAULT_PRESETS[category] || [];
          const customList = dinamicosPresets[category] || [];
          const allOptions = [...new Set([...defaults, ...customList])];

          return (
            <div
              key={category}
              className="flex flex-col gap-2 border-b border-zinc-900 pb-4"
            >
              <span className="font-mono text-[10px] font-bold text-zinc-300">
                {catLabel}
              </span>

              <div className="mt-1 flex flex-wrap gap-1.5">
                {allOptions.map((preset) => {
                  const active = list.includes(preset);
                  return (
                    <button
                      key={preset}
                      onClick={() => togglePreset(category, preset)}
                      className={`rounded-lg border px-2.5 py-1.5 font-mono text-[9px] transition-all ${
                        active
                          ? "border-emerald-500/20 bg-emerald-500/10 font-bold text-emerald-400"
                          : "border-zinc-850 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Standard inline */}
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={manualInputs[category] || ""}
                  onChange={(e) =>
                    setManualInputs({
                      ...manualInputs,
                      [category]: e.target.value,
                    })
                  }
                  placeholder={`Agregar estándar personalizado en esta categoría...`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddManual(category);
                    }
                  }}
                  className="border-zinc-850 flex-1 rounded border bg-zinc-900 px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => handleAddManual(category)}
                  className="hover:bg-zinc-750 rounded border border-zinc-700 bg-zinc-800 px-3 text-[10px] font-bold text-zinc-300"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}

        <div className="mt-2 flex flex-col gap-1.5">
          <span className="font-mono text-[10px] font-bold text-zinc-400">
            Cobertura Mínima de Tests (%)
          </span>
          <Input
            type="number"
            value={coberturaMinima}
            onChange={(e) => setCoberturaMinima(Number(e.target.value))}
            placeholder="80"
          />
        </div>

        <div className="mt-2 flex shrink-0 justify-end border-t border-[#2A2A2E] pt-4">
          <Button onClick={handleSave}>Guardar Estándares</Button>
        </div>
      </div>
    </Card>
  );
};
