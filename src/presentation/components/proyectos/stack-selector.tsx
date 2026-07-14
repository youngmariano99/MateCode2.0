"use client";

import React, { useState, useEffect } from "react";
import { Card } from "../card";
import { Input } from "../input";
import { db } from "../../../offline/dexie/db";

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

const TEMPLATE_STACKS = {
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

export const StackSelector: React.FC<StackSelectorProps> = ({
  proyectoId,
  initialStack = {},
  onSave,
}) => {
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
    const current = stack[category];
    if (!current.includes(clean)) {
      setStack((prev) => {
        const next = {
          ...prev,
          [category]: [...current, clean],
        };
        onSave(next);
        return next;
      });
    }
    setInputVal({
      ...inputVal,
      [category]: "",
    });
  };

  const removeChip = (category: keyof typeof PRESETS, index: number) => {
    const current = stack[category];
    const updated = [...current];
    updated.splice(index, 1);
    setStack((prev) => {
      const next = {
        ...prev,
        [category]: updated,
      };
      onSave(next);
      return next;
    });
  };

  const cargarPlantillaStack = (tipo: keyof typeof TEMPLATE_STACKS) => {
    const template = TEMPLATE_STACKS[tipo].stack;
    setStack((prev) => {
      const next = {
        frontend: [...new Set([...prev.frontend, ...template.frontend])],
        backend: [...new Set([...prev.backend, ...template.backend])],
        baseDatos: [...new Set([...prev.baseDatos, ...template.baseDatos])],
        infraestructura: [
          ...new Set([...prev.infraestructura, ...template.infraestructura]),
        ],
        seguridad: [...new Set([...prev.seguridad, ...template.seguridad])],
        integraciones: [
          ...new Set([...prev.integraciones, ...template.integraciones]),
        ],
      };
      onSave(next);
      return next;
    });
  };

  return (
    <Card>
      <div className="mb-5 border-b border-[#2A2A2E] pb-3">
        <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
          Stack Tecnológico del Proyecto
        </h3>
        <p className="font-mono text-[9px] text-zinc-500">
          Define las tecnologías organizadas por capa o carga una plantilla
          predeterminada
        </p>
      </div>

      {/* Preset Stack Templates */}
      <div className="mb-5 flex flex-wrap gap-2 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-2">
        <span className="w-full px-1 font-mono text-[8px] font-bold tracking-wide text-zinc-500 uppercase">
          Cargar Configuración de Tecnologías:
        </span>
        <button
          onClick={() => cargarPlantillaStack("landing")}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-[10px] text-zinc-300 transition-all hover:border-zinc-700 hover:bg-zinc-800"
        >
          Landing Page
        </button>
        <button
          onClick={() => cargarPlantillaStack("ecommerce")}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-[10px] text-zinc-300 transition-all hover:border-zinc-700 hover:bg-zinc-800"
        >
          E-commerce
        </button>
        <button
          onClick={() => cargarPlantillaStack("saas")}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-[10px] text-zinc-300 transition-all hover:border-zinc-700 hover:bg-zinc-800"
        >
          SaaS / Backend
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(
          (category) => (
            <div key={category} className="flex flex-col gap-2">
              <span className="font-mono text-[10px] font-bold text-zinc-400 capitalize">
                {category === "baseDatos" ? "Base de Datos" : category}
              </span>

              <div className="mb-1 flex flex-wrap gap-1.5">
                {stack[category].map((tech, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#2A2A2E] py-1 pr-1.5 pl-2 font-mono text-[9px] font-bold text-zinc-200"
                  >
                    {tech}
                    <button
                      onClick={() => removeChip(category, idx)}
                      className="animate-in fade-in p-0.5 text-[8px] font-extrabold text-zinc-500 hover:text-zinc-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={inputVal[category]}
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

              {/* Suggestions Chips */}
              <div className="mt-1 flex flex-wrap gap-1">
                {PRESETS[category]
                  .filter((p) => !stack[category].includes(p))
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
                      !stack[category].includes(s) &&
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
