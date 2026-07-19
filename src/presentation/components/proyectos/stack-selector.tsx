"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from "react";
import { Card } from "../card";
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
      db.agencia_config.where("tipo").equals("preset_stack").toArray()
    ) as any[] | undefined) || [];

  const [stack, setStack] = useState({
    frontend: initialStack.frontend || [],
    backend: initialStack.backend || [],
    baseDatos: initialStack.baseDatos || [],
    infraestructura: initialStack.infraestructura || [],
    seguridad: initialStack.seguridad || [],
    integraciones: initialStack.integraciones || [],
  });

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
      onSave(next);
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
    onSave(next);
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
    onSave(next);
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
      onSave(next);
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
      onSave(importedStack);
      setJsonText("");
      setShowJsonArea(false);
      mostrarToast("JSON importado y stack tecnológico actualizado.", "exito");
    } catch (err: any) {
      mostrarToast(`JSON Inválido: ${err.message}`, "error");
    }
  };

  return (
    <Card>
      <div className="mb-4 border-b border-[#2A2A2E] pb-3">
        <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
          Stack Tecnológico del Proyecto
        </h3>
        <p className="text-zinc-550 mt-0.5 font-mono text-[9px]">
          Define las tecnologías organizadas por capa, importa desde JSON o
          carga configuraciones guardadas
        </p>
      </div>

      {/* Preset Custom Configuration Loader */}
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-zinc-900 bg-zinc-950/40 p-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
            Cargar Stack Guardado
          </label>
          <select
            value={selectedPresetId}
            onChange={(e) => handleLoadPreset(e.target.value)}
            className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
          >
            <option value="">Selecciona preset...</option>
            {customPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-mono text-[9px] font-bold text-zinc-500 uppercase">
            Guardar Stack Actual
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

      {/* Default Templates Loader */}
      <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-zinc-900 bg-zinc-950 p-2">
        <span className="w-full px-1 font-mono text-[8px] font-bold tracking-wide text-zinc-500 uppercase">
          Plantillas Predeterminadas:
        </span>
        <button
          onClick={() => cargarPlantillaStack("landing")}
          className="border-zinc-850 rounded border bg-zinc-900 px-2 py-0.5 font-mono text-[9px] text-zinc-300 hover:bg-zinc-800"
        >
          Landing Page
        </button>
        <button
          onClick={() => cargarPlantillaStack("ecommerce")}
          className="border-zinc-850 rounded border bg-zinc-900 px-2 py-0.5 font-mono text-[9px] text-zinc-300 hover:bg-zinc-800"
        >
          E-commerce
        </button>
        <button
          onClick={() => cargarPlantillaStack("saas")}
          className="border-zinc-850 rounded border bg-zinc-900 px-2 py-0.5 font-mono text-[9px] text-zinc-300 hover:bg-zinc-800"
        >
          SaaS / Backend
        </button>
      </div>

      {/* JSON Import/Export Actions */}
      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950/20 p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
            📦 Importar con JSON
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
              placeholder="Pega aquí tu JSON de stack..."
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

      {/* Categories listing */}
      <div className="flex max-h-[50vh] flex-col gap-5 overflow-y-auto pr-1">
        {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(
          (category) => (
            <div
              key={category}
              className="flex flex-col gap-2 border-b border-zinc-900 pb-3"
            >
              <span className="font-mono text-[10px] font-bold text-zinc-300 capitalize">
                {category === "baseDatos" ? "Base de Datos" : category}
              </span>

              <div className="mb-1 flex flex-wrap gap-1.5">
                {(stack[category] || []).map((tech, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#2A2A2E] py-1 pr-1.5 pl-2 font-mono text-[9px] font-bold text-zinc-200"
                  >
                    {tech}
                    <button
                      onClick={() => removeChip(category, idx)}
                      className="hover:text-zinc-350 p-0.5 text-[8px] font-extrabold text-zinc-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={inputVal[category] || ""}
                    onChange={(e) =>
                      setInputVal({ ...inputVal, [category]: e.target.value })
                    }
                    placeholder={`Agregar ${category === "baseDatos" ? "Base de datos" : category}...`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addChip(category, inputVal[category]);
                      }
                    }}
                  />
                </div>
                <button
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
    </Card>
  );
};
