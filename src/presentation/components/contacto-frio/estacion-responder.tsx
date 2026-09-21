"use client";

import React, { useState } from "react";
import { Select } from "../select";
import { PanelRespuesta } from "./panel-respuesta";
import { CierreLead } from "./cierre-lead";
import { EstacionVacia } from "./piezas-cinta";
import {
  textoRelativoDias,
  type ResumenProspecto,
} from "../../../domain/entidades/contacto-frio-cinta.entity";
import type { PotencialCliente } from "../../../domain/entidades/contacto-frio.entity";
import { ahoraMs } from "./utilidades-cinta";

/**
 * ① RESPONDER — lo primero de la cinta: los que ya me escribieron y todavía
 * no contesté. Si no hay ninguno, se pasa a ②. Como a veces me responden
 * fuera de la app, también se puede cargar «me escribió X» de cualquiera.
 */
export const EstacionResponder: React.FC<{
  pendientes: ResumenProspecto[];
  candidatos: PotencialCliente[];
  irA: (n: 2 | 3) => void;
}> = ({ pendientes, candidatos, irA }) => {
  const [elegidoId, setElegidoId] = useState<string | null>(null);
  const [otroId, setOtroId] = useState("");

  const activoPendiente =
    pendientes.find((p) => p.prospecto.id === elegidoId)?.prospecto ??
    pendientes[0]?.prospecto;
  const otro = candidatos.find((c) => c.id === otroId);
  const activo = otro ?? activoPendiente;

  const listo = () => {
    setElegidoId(null);
    setOtroId("");
  };

  return (
    <div className="flex flex-col gap-4">
      {pendientes.length === 0 && !otro && (
        <EstacionVacia
          mensaje="Nada para responder."
          siguiente={{ etiqueta: "Pasar a ② Seguir", ir: () => irA(2) }}
        />
      )}

      {pendientes.length > 0 && !otro && (
        <div className="flex flex-wrap gap-2">
          {pendientes.map((r) => (
            <button
              key={r.prospecto.id}
              onClick={() => setElegidoId(r.prospecto.id)}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                activoPendiente?.id === r.prospecto.id
                  ? "border-emerald-500/50 bg-emerald-500/10 font-bold text-emerald-300"
                  : "border-[#2A2A2E] text-zinc-300 hover:bg-[#18181B]"
              }`}
            >
              {r.prospecto.nombre}
              {r.ultimaRecepcionEn !== undefined && (
                <span className="ml-2 text-xs font-normal text-zinc-500">
                  escribió {textoRelativoDias(r.ultimaRecepcionEn, ahoraMs())}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="max-w-sm">
        <Select
          label={
            pendientes.length > 0
              ? "¿Te escribió otro? (fuera de la app)"
              : "¿Te escribió alguien? (fuera de la app)"
          }
          value={otroId}
          onChange={setOtroId}
          options={[
            { value: "", label: "— elegir —" },
            ...candidatos.map((c) => ({ value: c.id, label: c.nombre })),
          ]}
        />
      </div>

      {activo && (
        <div className="flex flex-col gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6">
          <h3 className="text-lg font-bold text-zinc-100">{activo.nombre}</h3>
          <PanelRespuesta key={activo.id} prospecto={activo} onListo={listo} />
          <CierreLead prospecto={activo} onCerrado={listo} />
        </div>
      )}
    </div>
  );
};
