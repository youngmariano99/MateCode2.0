"use client";

import React from "react";
import { Input } from "../input";
import { Select } from "../select";
import {
  DESCRIPCION_PILAR,
  ETAPAS_CINTA,
  ETIQUETA_ETAPA,
  PERSONAS_CONTENIDO,
  PILARES_CONTENIDO,
  type FichaContenido,
  type PersonaContenido,
  type PilarContenido,
  type PlanPieza,
} from "../../../domain/entidades/contenido.entity";

/** Campo de fecha simple (YYYY-MM-DD), mismo estilo que los demás inputs. */
export const CampoFecha: React.FC<{
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}> = ({ label, value, onChange }) => (
  <Input
    label={label}
    type="date"
    value={value ?? ""}
    onChange={(e) => onChange(e.target.value || undefined)}
  />
);

/**
 * Ficha técnica del SOP (pilar, persona, serie, módulo, keyword) y el día de
 * cada etapa de esta pieza. Los días son por pieza: se puede hacer todo el
 * mismo día, varias piezas juntas o cada etapa en un día distinto.
 */
export const FichaPlanPieza: React.FC<{
  ficha: FichaContenido;
  onFicha: (f: FichaContenido) => void;
  plan: PlanPieza;
  onPlan: (p: PlanPieza) => void;
}> = ({ ficha, onFicha, plan, onPlan }) => (
  <div className="flex flex-col gap-3 border-t border-[#2A2A2E] pt-3">
    <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
      Ficha técnica
    </span>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Select
        label="Pilar"
        value={ficha.pilar ?? ""}
        onChange={(v) =>
          onFicha({
            ...ficha,
            pilar: (v || undefined) as PilarContenido | undefined,
          })
        }
        options={[
          { value: "", label: "—" },
          ...PILARES_CONTENIDO.map((p) => ({
            value: p,
            label: `${p} — ${DESCRIPCION_PILAR[p]}`,
          })),
        ]}
      />
      <Select
        label="Buyer persona"
        value={ficha.persona ?? ""}
        onChange={(v) =>
          onFicha({
            ...ficha,
            persona: (v || undefined) as PersonaContenido | undefined,
          })
        }
        options={[
          { value: "", label: "—" },
          ...PERSONAS_CONTENIDO.map((p) => ({ value: p, label: p })),
        ]}
      />
      <Input
        label="Serie asociada"
        value={ficha.serie ?? ""}
        onChange={(e) =>
          onFicha({ ...ficha, serie: e.target.value || undefined })
        }
      />
      <Input
        label="Módulo de Nodexa que promociona"
        value={ficha.modulo ?? ""}
        onChange={(e) =>
          onFicha({ ...ficha, modulo: e.target.value || undefined })
        }
      />
      <Input
        label="Keyword principal (SEO y CTA)"
        value={ficha.keyword ?? ""}
        onChange={(e) =>
          onFicha({ ...ficha, keyword: e.target.value || undefined })
        }
      />
    </div>
    <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
      Cuándo se hace cada etapa
    </span>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ETAPAS_CINTA.map((etapa) => (
        <CampoFecha
          key={etapa}
          label={ETIQUETA_ETAPA[etapa]}
          value={plan[etapa]}
          onChange={(v) => onPlan({ ...plan, [etapa]: v })}
        />
      ))}
    </div>
  </div>
);
