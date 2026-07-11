"use client";

import React, { useState, useEffect } from "react";
import { Card } from "../card";
import { Button } from "../button";
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
      setStack({
        ...stack,
        [category]: [...current, clean],
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
    setStack({
      ...stack,
      [category]: updated,
    });
  };

  const handleSave = () => {
    onSave(stack);
  };

  return (
    <Card>
      <div className="mb-5 border-b border-[#2A2A2E] pb-3">
        <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
          Stack Tecnológico del Proyecto
        </h3>
        <p className="font-mono text-[10px] text-zinc-500">
          Configura las tecnologías organizadas por capa de desarrollo
        </p>
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
                      className="p-0.5 text-[8px] font-extrabold text-zinc-500 hover:text-zinc-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={inputVal[category]}
                    onChange={(e) =>
                      setInputVal({ ...inputVal, [category]: e.target.value })
                    }
                    placeholder="Escribe tecnología y presiona agregar..."
                  />

                  {inputVal[category].trim() && (
                    <div className="absolute top-10 right-0 left-0 z-20 flex max-h-[120px] flex-col overflow-y-auto rounded-xl border border-[#2A2A2E] bg-[#18181B] p-1.5">
                      {PRESETS[category]
                        .concat(sugerenciasInteligentes)
                        .filter(
                          (t, idx, self) =>
                            self.indexOf(t) === idx &&
                            t
                              .toLowerCase()
                              .includes(inputVal[category].toLowerCase())
                        )
                        .map((sug) => (
                          <button
                            key={sug}
                            onClick={() => addChip(category, sug)}
                            className="rounded-lg p-1.5 text-left font-mono text-[9px] text-zinc-300 hover:bg-zinc-800"
                          >
                            {sug}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => addChip(category, inputVal[category])}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 font-mono text-[10px] font-bold text-white transition-all select-none hover:bg-zinc-700"
                >
                  Agregar
                </button>
              </div>
            </div>
          )
        )}

        <div className="mt-2 flex justify-end border-t border-[#2A2A2E] pt-4">
          <Button onClick={handleSave}>Guardar Stack</Button>
        </div>
      </div>
    </Card>
  );
};
