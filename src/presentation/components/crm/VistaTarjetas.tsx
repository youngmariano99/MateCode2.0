"use client";

import React from "react";
import { Card } from "../card";
import { Button } from "../button";
import { Icono } from "../icons";

interface ClienteCRM {
  id: string;
  nombre: string;
  correo: string;
  empresa?: string;
  cargo?: string;
  telefono?: string;
  whatsapp?: string;
  redes?: string;
  direccion?: string;
  observaciones?: string;
  origenContacto?: string;
  estado: string;
  responsable?: string;
  etiquetas?: string[];
  favorito?: boolean;
}

interface VistaTarjetasProps {
  clientes: ClienteCRM[];
  onEdicion: (c: ClienteCRM) => void;
  onEliminar: (id: string) => void;
}

export const VistaTarjetas: React.FC<VistaTarjetasProps> = ({
  clientes,
  onEdicion,
  onEliminar,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clientes.length === 0 ? (
        <div className="col-span-full py-6 text-center text-zinc-500 italic">
          No se encontraron clientes para mostrar.
        </div>
      ) : (
        clientes.map((c) => (
          <Card key={c.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="block text-xs font-bold text-zinc-200">
                  {c.nombre}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] text-zinc-500">
                  {c.empresa || "Sin compañía"} • {c.cargo || "Sin cargo"}
                </span>
              </div>
              <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400">
                {c.estado}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-1.5 border-t border-[#2A2A2E]/60 pt-3 font-mono text-xs text-zinc-400">
              <span>✉ {c.correo}</span>
              <span>☏ {c.telefono || "Sin teléfono"}</span>
              {c.responsable && <span>👤 Asignado: {c.responsable}</span>}
            </div>

            <div className="mt-4 flex justify-end gap-3 border-t border-[#2A2A2E]/60 pt-2.5">
              <Button onClick={() => onEdicion(c)}>Gestionar</Button>
              <button
                onClick={() => onEliminar(c.id)}
                className="rounded-xl border border-[#2A2A2E] p-2 text-zinc-400 transition-all hover:border-red-500/20 hover:bg-red-500/5 hover:text-red-400"
              >
                <Icono.Trash className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};
