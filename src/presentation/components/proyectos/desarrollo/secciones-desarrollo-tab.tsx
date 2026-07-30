"use client";

import React from "react";
import { Card } from "../../card";

interface SeccionesDesarrolloTabProps {
  seccionesDisponibles: string[];
  seccionNombre: string;
  handleSeleccionarSeccion: (name: string) => void;
  seccionNombreCustom: string;
  setSeccionNombreCustom: (name: string) => void;
  seccionDescripcion: string;
  setSeccionDescripcion: (desc: string) => void;
  ticketMiembro: string;
  setTicketMiembro: (name: string) => void;
  selectedRole: string;
  setSelectedRole: (role: string) => void;
  iniciarSeccionLandingTicket: () => void;
}

const ROLES = [
  { key: "desarrollador", label: "Desarrollador Fullstack" },
  { key: "arquitecto", label: "Arquitecto de Software" },
  { key: "ciberseguridad", label: "Ingeniero de Ciberseguridad" },
  { key: "disenador_ui", label: "Diseñador UI/UX & Frontend" },
  { key: "custom", label: "Rol Personalizado" },
];

export const SeccionesDesarrolloTab: React.FC<SeccionesDesarrolloTabProps> = ({
  seccionesDisponibles,
  seccionNombre,
  handleSeleccionarSeccion,
  seccionNombreCustom,
  setSeccionNombreCustom,
  seccionDescripcion,
  setSeccionDescripcion,
  ticketMiembro,
  setTicketMiembro,
  selectedRole,
  setSelectedRole,
  iniciarSeccionLandingTicket,
}) => {
  return (
    <Card>
      <div className="mb-4 border-b border-zinc-900 pb-3">
        <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
          Desarrollo Seccional del Sitio
        </h3>
        <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
          Selecciona la sección a maquetar o refinar para generar el ticket y
          prompt visual
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
            Sección a Trabajar
          </label>
          <select
            value={seccionNombre}
            onChange={(e) => handleSeleccionarSeccion(e.target.value)}
            className="border-zinc-850 rounded border bg-zinc-900 p-2 font-mono text-[10px] text-zinc-200 outline-none"
          >
            {seccionesDisponibles.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>

        {seccionNombre === "Sección Personalizada" && (
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
              Nombre de Sección Personalizada
            </label>
            <input
              type="text"
              value={seccionNombreCustom}
              onChange={(e) => setSeccionNombreCustom(e.target.value)}
              placeholder="Ej: Calculadora de Tarifas..."
              className="border-zinc-850 rounded border bg-zinc-900 p-2 text-[10px] text-zinc-200 outline-none"
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
            Descripción & Indicaciones Específicas
          </label>
          <textarea
            value={seccionDescripcion}
            onChange={(e) => setSeccionDescripcion(e.target.value)}
            placeholder="Escribe cómo deseas que sea esta sección (ej: fondo oscuro con degradado, botón verde esmeralda centrado)..."
            rows={3}
            className="border-zinc-850 rounded border bg-zinc-900 p-2 font-mono text-[10px] text-zinc-200 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
              Encargado
            </label>
            <input
              type="text"
              value={ticketMiembro}
              onChange={(e) => setTicketMiembro(e.target.value)}
              className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
              Rol IA
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
            >
              {ROLES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={iniciarSeccionLandingTicket}
          className="mt-2 w-full rounded-lg bg-emerald-500 py-2.5 text-[10px] font-bold text-zinc-950 uppercase shadow transition-all hover:bg-emerald-600"
        >
          🚀 Iniciar Ticket de Sección
        </button>
      </div>
    </Card>
  );
};
