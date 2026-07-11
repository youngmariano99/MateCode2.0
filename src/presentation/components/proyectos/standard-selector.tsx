"use client";

import React, { useState } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { Input } from "../input";

interface StandardSelectorProps {
  initialEstandares?: {
    arquitectura?: string[];
    patrones?: string[];
    buenasPracticas?: string[];
    principios?: string[];
    testing?: string[];
    devops?: string[];
    coberturaMinima?: number;
  };
  onSave: (estandares: Record<string, unknown>) => void;
}

const PRESETS = {
  arquitectura: [
    "Clean Architecture",
    "Hexagonal",
    "DDD",
    "MVC",
    "Vertical Slice",
    "Feature First",
  ],
  patrones: [
    "Repository",
    "Adapter",
    "Strategy",
    "Factory",
    "Builder",
    "Singleton",
    "Facade",
    "Observer",
    "Command",
  ],
  buenasPracticas: [
    "SOLID",
    "DRY",
    "KISS",
    "YAGNI",
    "Clean Code",
    "No any",
    "Max 500 lines per file",
  ],
  principios: ["SRP", "OCP", "LSP", "ISP", "DIP"],
  testing: ["Unitarios", "Integración", "E2E", "Vitest", "Playwright", "Jest"],
  devops: [
    "CI/CD",
    "Lint",
    "Prettier",
    "Husky",
    "Semantic Versioning",
    "Conventional Commits",
    "Docker",
  ],
};

export const StandardSelector: React.FC<StandardSelectorProps> = ({
  initialEstandares = {},
  onSave,
}) => {
  const [estandares, setEstandares] = useState({
    arquitectura: initialEstandares.arquitectura || [],
    patrones: initialEstandares.patrones || [],
    buenasPracticas: initialEstandares.buenasPracticas || [],
    principios: initialEstandares.principios || [],
    testing: initialEstandares.testing || [],
    devops: initialEstandares.devops || [],
  });

  const [coberturaMinima, setCoberturaMinima] = useState(
    initialEstandares.coberturaMinima || 80
  );

  const togglePreset = (category: keyof typeof PRESETS, val: string) => {
    const current = estandares[category];
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

  const handleSave = () => {
    onSave({
      ...estandares,
      coberturaMinima,
    });
  };

  return (
    <Card>
      <div className="mb-5 border-b border-[#2A2A2E] pb-3">
        <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
          Estándares de Ingeniería y Buenas Prácticas
        </h3>
        <p className="font-mono text-[10px] text-zinc-500">
          Elige los lineamientos técnicos que guiarán el desarrollo
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(
          (category) => (
            <div key={category} className="flex flex-col gap-2">
              <span className="font-mono text-[10px] font-bold text-zinc-400 capitalize">
                {category === "buenasPracticas"
                  ? "Buenas Prácticas"
                  : category === "principios"
                    ? "Principios OO"
                    : category}
              </span>

              <div className="flex flex-wrap gap-2">
                {PRESETS[category].map((preset) => {
                  const active = estandares[category].includes(preset);
                  return (
                    <button
                      key={preset}
                      onClick={() => togglePreset(category, preset)}
                      className={`rounded-lg border px-2.5 py-1.5 font-mono text-[9px] transition-all ${
                        active
                          ? "border-emerald-500/20 bg-emerald-500/10 font-bold text-emerald-400"
                          : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>
          )
        )}

        <div className="flex flex-col gap-2">
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

        <div className="mt-2 flex justify-end border-t border-[#2A2A2E] pt-4">
          <Button onClick={handleSave}>Guardar Estándares</Button>
        </div>
      </div>
    </Card>
  );
};
