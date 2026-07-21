"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import React, { useState, useEffect } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { Input } from "../input";
import { db } from "../../../offline/dexie/db";
import { useToast } from "../../hooks/useToast";
import { useLiveQuery } from "dexie-react-hooks";

interface StackSelectorProps {
  proyectoId: string;
  initialStack?: {
    frontend?: string[];
    backend?: string[];
    baseDatos?: string[];
    infraestructura?: string[];
    seguridad?: string[];
    integraciones?: string[];
  };
  onSave: (stack: Record<string, string[]>) => void;
}

const PRESETS = {
  frontend: [
    "Next.js",
    "React",
    "Vue",
    "Angular",
    "Astro",
    "Svelte",
    "HTML",
    "Tailwind",
    "Bootstrap",
  ],
  backend: [
    "NestJS",
    "Node.js",
    "Express",
    "Fastify",
    "Laravel",
    "Spring Boot",
    "Django",
    "ASP.NET Core",
    "Go",
  ],
  baseDatos: [
    "PostgreSQL",
    "MySQL",
    "MariaDB",
    "SQL Server",
    "MongoDB",
    "SQLite",
    "Firebase",
    "Supabase",
  ],
  infraestructura: [
    "Docker",
    "Vercel",
    "Netlify",
    "AWS",
    "Azure",
    "Cloudflare",
    "GitHub Actions",
    "Coolify",
    "Nginx",
  ],
  seguridad: [
    "JWT",
    "OAuth",
    "Supabase Auth",
    "Clerk",
    "Firebase Auth",
    "RBAC",
    "Rate Limiting",
    "CORS",
    "Helmet",
  ],
  integraciones: [
    "Stripe",
    "Mercado Pago",
    "Twilio",
    "OpenAI",
    "Claude",
    "Gemini",
    "WhatsApp",
    "Google Maps",
    "Resend",
    "SMTP",
  ],
};

const DEFAULT_STACKS_TEMPLATES = {
  landing: {
    nombre: "Landing Page (Maquetado & Deploy)",
    stack: {
      frontend: ["HTML", "Tailwind"],
      backend: [],
      baseDatos: [],
      infraestructura: ["Vercel", "Cloudflare"],
      seguridad: ["CORS"],
      integraciones: ["Resend", "Google Maps"],
    },
  },
  ecommerce: {
    nombre: "E-commerce Completo (Next.js/Supabase/Stripe)",
    stack: {
      frontend: ["Next.js", "Tailwind"],
      backend: ["Node.js"],
      baseDatos: ["Supabase"],
      infraestructura: ["Vercel", "GitHub Actions"],
      seguridad: ["Supabase Auth", "CORS"],
      integraciones: ["Stripe", "Mercado Pago", "Resend"],
    },
  },
  saas: {
    nombre: "Sistema Web / SaaS (React/Node/PostgreSQL)",
    stack: {
      frontend: ["React", "Tailwind"],
      backend: ["Express", "Node.js"],
      baseDatos: ["PostgreSQL"],
      infraestructura: ["Docker", "Nginx", "GitHub Actions"],
      seguridad: ["JWT", "CORS", "Rate Limiting"],
      integraciones: ["SMTP", "OpenAI"],
    },
  },
};

const JSON_TEMPLATE = `{
  "frontend": ["Next.js", "Tailwind"],
  "backend": ["Node.js", "Express"],
  "baseDatos": ["PostgreSQL"],
  "infraestructura": ["Docker", "Nginx"],
  "seguridad": ["JWT", "CORS"],
  "integraciones": ["Stripe", "OpenAI"]
}`;

export const StackSelector: React.FC<StackSelectorProps> = ({
  proyectoId,
  initialStack = {},
  onSave,
}) => {
  const { mostrarToast } = useToast();

  // Load custom stack presets from database
  const customPresets =
    (useLiveQuery(() =>
      db.agencia_config
        .filter((item: any) => item.tipo === "preset_stack")
        .toArray()
    ) as any[] | undefined) || [];

  const safeInitial = initialStack || {};

  const [stack, setStack] = useState({
    frontend: safeInitial.frontend || [],
    backend: safeInitial.backend || [],
    baseDatos: safeInitial.baseDatos || [],
    infraestructura: safeInitial.infraestructura || [],
    seguridad: safeInitial.seguridad || [],
    integraciones: safeInitial.integraciones || [],
  });

  useEffect(() => {
    if (initialStack) {
      setStack({
        frontend: initialStack.frontend || [],
        backend: initialStack.backend || [],
        baseDatos: initialStack.baseDatos || [],
        infraestructura: initialStack.infraestructura || [],
        seguridad: initialStack.seguridad || [],
        integraciones: initialStack.integraciones || [],
      });
    }
  }, [initialStack]);

  const [inputVal, setInputVal] = useState<Record<string, string>>({
    frontend: "",
    backend: "",
    baseDatos: "",
    infraestructura: "",
    seguridad: "",
    integraciones: "",
  });

  const [sugerenciasInteligentes, setSugerenciasInteligentes] = useState<
    string[]
  >([]);
  const [nombrePreset, setNombrePreset] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");

  const [jsonText, setJsonText] = useState("");
  const [showJsonArea, setShowJsonArea] = useState(false);

  useEffect(() => {
    const getSuggestions = async () => {
      const otros = await db.proyectos.toArray();
      const set = new Set<string>();
      for (const p of otros) {
        if (p.id !== proyectoId && p.stack) {
          const st = p.stack as Record<string, string[]>;
          Object.values(st).forEach((list) => {
            if (Array.isArray(list)) list.forEach((t) => set.add(t));
          });
        }
      }
      setSugerenciasInteligentes(Array.from(set));
    };
    void getSuggestions();
  }, [proyectoId]);

  const addChip = (category: keyof typeof PRESETS, val: string) => {
    const clean = val.trim();
    if (!clean) return;
    const current = stack[category] || [];
    if (!current.includes(clean)) {
      const next = {
        ...stack,
        [category]: [...current, clean],
      };
      setStack(next);
    }
    setInputVal({
      ...inputVal,
      [category]: "",
    });
  };

  const removeChip = (category: keyof typeof PRESETS, index: number) => {
    const current = stack[category] || [];
    const updated = [...current];
    updated.splice(index, 1);
    const next = {
      ...stack,
      [category]: updated,
    };
    setStack(next);
  };

  const cargarPlantillaStack = (
    tipo: keyof typeof DEFAULT_STACKS_TEMPLATES
  ) => {
    const template = DEFAULT_STACKS_TEMPLATES[tipo].stack;
    const next = {
      frontend: [...new Set([...stack.frontend, ...template.frontend])],
      backend: [...new Set([...stack.backend, ...template.backend])],
      baseDatos: [...new Set([...stack.baseDatos, ...template.baseDatos])],
      infraestructura: [
        ...new Set([...stack.infraestructura, ...template.infraestructura]),
      ],
      seguridad: [...new Set([...stack.seguridad, ...template.seguridad])],
      integraciones: [
        ...new Set([...stack.integraciones, ...template.integraciones]),
      ],
    };
    setStack(next);
    mostrarToast(
      `Plantilla "${DEFAULT_STACKS_TEMPLATES[tipo].nombre}" cargada.`,
      "exito"
    );
  };

  const handleSavePreset = async () => {
    if (!nombrePreset.trim()) {
      mostrarToast(
        "Escribe un nombre para guardar esta configuración de stack.",
        "error"
      );
      return;
    }
    const id = `preset_stack_${Date.now()}`;
    await db.agencia_config.put({
      id,
      nombre: nombrePreset,
      tipo: "preset_stack",
      data: {
        stack,
      },
    });
    setNombrePreset("");
    mostrarToast("Stack tecnológico guardado como plantilla.", "exito");
  };

  const handleLoadPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = customPresets.find((p) => p.id === presetId);
    if (found && found.data) {
      const next = found.data.stack || {};
      setStack({
        frontend: next.frontend || [],
        backend: next.backend || [],
        baseDatos: next.baseDatos || [],
        infraestructura: next.infraestructura || [],
        seguridad: next.seguridad || [],
        integraciones: next.integraciones || [],
      });
      mostrarToast(`Preset de stack "${found.nombre}" cargado.`, "exito");
    }
  };

  const copiarPlantillaJSON = () => {
    navigator.clipboard.writeText(JSON_TEMPLATE);
    mostrarToast("Plantilla JSON de stack copiada al portapapeles.", "exito");
  };

  const importarJSON = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const importedStack = {
        frontend: Array.isArray(parsed.frontend) ? parsed.frontend : [],
        backend: Array.isArray(parsed.backend) ? parsed.backend : [],
        baseDatos: Array.isArray(parsed.baseDatos) ? parsed.baseDatos : [],
        infraestructura: Array.isArray(parsed.infraestructura)
          ? parsed.infraestructura
          : [],
        seguridad: Array.isArray(parsed.seguridad) ? parsed.seguridad : [],
        integraciones: Array.isArray(parsed.integraciones)
          ? parsed.integraciones
          : [],
      };
      setStack(importedStack);
      setShowJsonArea(false);
      setJsonText("");
      mostrarToast("JSON importado y stack actualizado.", "exito");
    } catch (err: any) {
      mostrarToast(`JSON Inválido: ${err.message}`, "error");
    }
  };

  const handleSave = () => {
    mostrarToast("Stack tecnológico guardado con éxito.", "exito");
    onSave(stack);
  };

  return (
    <Card>
      <div className="mb-4 border-b border-[#2A2A2E] pb-3">
        <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
          Stack Tecnológico Seleccionado
        </h3>
        <p className="text-zinc-550 mt-0.5 font-mono text-[10px]">
          Define las tecnologías que componen el proyecto. Selecciona presets o
          añade tecnologías a medida.
        </p>
      </div>

      {/* Preset templates selector bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-900 bg-zinc-950 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
            Plantillas Rápidas:
          </span>
          {Object.entries(DEFAULT_STACKS_TEMPLATES).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                cargarPlantillaStack(
                  key as keyof typeof DEFAULT_STACKS_TEMPLATES
                )
              }
              className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/20"
            >
              + {item.nombre.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Custom Presets dropdown & Save Preset */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedPresetId}
            onChange={(e) => handleLoadPreset(e.target.value)}
            className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-200 outline-none"
          >
            <option value="">Cargar plantilla de la agencia...</option>
            {customPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Guardar como..."
            value={nombrePreset}
            onChange={(e) => setNombrePreset(e.target.value)}
            className="w-[120px] rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-200 outline-none"
          />
          <button
            type="button"
            onClick={handleSavePreset}
            className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
          >
            Guardar
          </button>
        </div>
      </div>

      {/* JSON Import/Export Bar */}
      <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-2">
        <span className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
          Importación Rápida por JSON / IA
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copiarPlantillaJSON}
            className="font-mono text-[9px] text-zinc-400 underline hover:text-zinc-200"
          >
            Copiar Estructura JSON
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
            placeholder="Pega aquí la estructura JSON de stack devuelta por la IA..."
            rows={4}
            className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[9px] text-zinc-300 outline-none"
          />
          <button
            type="button"
            onClick={importarJSON}
            className="self-end rounded bg-sky-500 px-3 py-1 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-sky-400"
          >
            Procesar e Importar Stack
          </button>
        </div>
      )}

      {/* Technology Layers Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(
          (category) => (
            <div
              key={category}
              className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-zinc-950/40 p-3"
            >
              <span className="border-b border-zinc-900 pb-1 font-mono text-[10px] font-bold text-zinc-400 uppercase">
                {category === "baseDatos"
                  ? "Base de Datos"
                  : category.toUpperCase()}
              </span>

              {/* Added chips list */}
              <div className="flex min-h-[32px] flex-wrap items-center gap-1">
                {(stack[category] || []).length === 0 ? (
                  <span className="font-mono text-[9px] text-zinc-600 italic">
                    Sin definir
                  </span>
                ) : (
                  (stack[category] || []).map((item, idx) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-[9px] text-zinc-200"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeChip(category, idx)}
                        className="font-bold text-zinc-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add custom technology input */}
              <div className="mt-1 flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Agregar tecnología..."
                    value={inputVal[category]}
                    onChange={(e) =>
                      setInputVal({
                        ...inputVal,
                        [category]: e.target.value,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addChip(category, inputVal[category]);
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => addChip(category, inputVal[category])}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-800"
                >
                  +
                </button>
              </div>

              {/* Default preset suggestions */}
              <div className="mt-1 flex flex-wrap gap-1">
                {PRESETS[category]
                  .filter((p) => !(stack[category] || []).includes(p))
                  .map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => addChip(category, preset)}
                      className="rounded border border-zinc-900/30 bg-zinc-950/40 px-1.5 py-0.5 font-mono text-[8px] font-bold text-zinc-500 transition-all hover:bg-zinc-900 hover:text-zinc-300"
                    >
                      {preset}
                    </button>
                  ))}

                {/* Suggestions from other projects */}
                {sugerenciasInteligentes
                  .filter(
                    (s) =>
                      !(stack[category] || []).includes(s) &&
                      !PRESETS[category].includes(s)
                  )
                  .map((otherTech) => (
                    <button
                      key={otherTech}
                      type="button"
                      onClick={() => addChip(category, otherTech)}
                      className="rounded border border-emerald-950/20 bg-emerald-950/10 px-1.5 py-0.5 font-mono text-[8px] font-bold text-emerald-500 transition-all hover:bg-emerald-900 hover:text-zinc-100"
                      title="Usado en otros proyectos"
                    >
                      ★ {otherTech}
                    </button>
                  ))}
              </div>
            </div>
          )
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-[#2A2A2E] pt-4">
        <Button onClick={handleSave}>Guardar Stack Tecnológico</Button>
      </div>
    </Card>
  );
};
