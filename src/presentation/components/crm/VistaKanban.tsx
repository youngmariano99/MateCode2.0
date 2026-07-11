"use client";

import React from "react";
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

interface VistaKanbanProps {
  clientes: ClienteCRM[];
  estados: string[];
  onEdicion: (c: ClienteCRM) => void;
  onEliminar: (id: string) => void;
  onAlternarFavorito: (c: ClienteCRM) => void;
}

export const VistaKanban: React.FC<VistaKanbanProps> = ({
  clientes,
  estados,
  onEdicion,
  onEliminar,
  onAlternarFavorito,
}) => {
  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-5">
      {estados.map((colName) => {
        const enColumna = clientes.filter((c) => c.estado === colName);
        return (
          <div
            key={colName}
            className="flex min-h-[400px] flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4"
          >
            <div className="mb-1 flex items-center justify-between border-b border-[#2A2A2E] pb-2">
              <span className="block font-mono text-[10px] font-extrabold tracking-wider text-zinc-300 uppercase">
                {colName}
              </span>
              <span className="rounded border border-[#2A2A2E] bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-500">
                {enColumna.length}
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {enColumna.length === 0 ? (
                <span className="py-4 text-center font-mono text-[10px] text-zinc-600 italic">
                  Sin contactos
                </span>
              ) : (
                enColumna.map((c) => (
                  <div
                    key={c.id}
                    className="group flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3 transition-all hover:border-zinc-700"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        onClick={() => onEdicion(c)}
                        className="cursor-pointer text-xs font-bold text-zinc-200 transition-all group-hover:text-emerald-400"
                      >
                        {c.nombre}
                      </span>
                      <button
                        onClick={() => onAlternarFavorito(c)}
                        className={`text-xs ${
                          c.favorito
                            ? "text-amber-400"
                            : "text-zinc-600 hover:text-zinc-400"
                        }`}
                      >
                        ★
                      </button>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {c.empresa || "Sin compañía"}
                    </span>

                    {c.etiquetas && c.etiquetas.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.etiquetas.map((t) => (
                          <span
                            key={t}
                            className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-400"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-1 flex justify-end gap-2 border-t border-[#2A2A2E]/50 pt-2">
                      {c.telefono && (
                        <a
                          href={`tel:${c.telefono}`}
                          className="p-1 text-zinc-500 hover:text-emerald-400"
                        >
                          <Icono.Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {c.correo && (
                        <a
                          href={`mailto:${c.correo}`}
                          className="p-1 text-zinc-500 hover:text-emerald-400"
                        >
                          <Icono.Mail className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => onEdicion(c)}
                        className="p-1 text-zinc-500 hover:text-emerald-400"
                      >
                        <Icono.Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onEliminar(c.id)}
                        className="p-1 text-zinc-500 hover:text-red-400"
                      >
                        <Icono.Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
