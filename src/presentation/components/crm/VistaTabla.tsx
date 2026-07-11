"use client";

import React from "react";
import { Card } from "../card";
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

interface VistaTablaProps {
  clientes: ClienteCRM[];
  seleccionados: string[];
  onToggleSeleccion: (id: string) => void;
  onToggleTodos: () => void;
  onEdicion: (c: ClienteCRM) => void;
  onEliminar: (id: string) => void;
}

export const VistaTabla: React.FC<VistaTablaProps> = ({
  clientes,
  seleccionados,
  onToggleSeleccion,
  onToggleTodos,
  onEdicion,
  onEliminar,
}) => {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-[#2A2A2E] text-zinc-500">
              <th className="py-2.5 pl-3">
                <input
                  type="checkbox"
                  checked={
                    clientes.length > 0 &&
                    seleccionados.length === clientes.length
                  }
                  onChange={onToggleTodos}
                  className="rounded border-[#2A2A2E] bg-zinc-950"
                />
              </th>
              <th className="py-2.5">Nombre</th>
              <th className="py-2.5">Empresa</th>
              <th className="py-2.5">Email</th>
              <th className="py-2.5">Teléfono</th>
              <th className="py-2.5">Responsable</th>
              <th className="py-2.5">Estado</th>
              <th className="py-2.5 pr-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-6 text-center text-zinc-500 italic"
                >
                  No se encontraron clientes para mostrar.
                </td>
              </tr>
            ) : (
              clientes.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[#2A2A2E]/50 transition-all last:border-0 hover:bg-[#18181B]"
                >
                  <td className="py-3 pl-3">
                    <input
                      type="checkbox"
                      checked={seleccionados.includes(c.id)}
                      onChange={() => onToggleSeleccion(c.id)}
                      className="rounded border-[#2A2A2E] bg-zinc-950"
                    />
                  </td>
                  <td className="py-3 font-bold text-zinc-300">{c.nombre}</td>
                  <td className="py-3 text-zinc-400">{c.empresa || "-"}</td>
                  <td className="py-3 text-zinc-400">{c.correo}</td>
                  <td className="py-3 text-zinc-400">{c.telefono || "-"}</td>
                  <td className="py-3 text-zinc-400">{c.responsable || "-"}</td>
                  <td className="py-3">
                    <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      {c.estado}
                    </span>
                  </td>
                  <td className="flex justify-end gap-2.5 py-3 pr-3 text-right">
                    <button
                      onClick={() => onEdicion(c)}
                      className="text-zinc-500 hover:text-emerald-400"
                    >
                      <Icono.Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEliminar(c.id)}
                      className="text-zinc-500 hover:text-red-400"
                    >
                      <Icono.Trash className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
