/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";

interface BugHotfixModalProps {
  isOpen: boolean;
  onClose: () => void;
  bugNombre: string;
  setBugNombre: (name: string) => void;
  bugType: "bugfix" | "hotfix";
  setBugType: (type: "bugfix" | "hotfix") => void;
  linkedTicketId: string;
  setLinkedTicketId: (id: string) => void;
  ticketExecutions: any[];
  bugLogs: string;
  setBugLogs: (logs: string) => void;
  iniciarBugTicket: () => void;
}

export const BugHotfixModal: React.FC<BugHotfixModalProps> = ({
  isOpen,
  onClose,
  bugNombre,
  setBugNombre,
  bugType,
  setBugType,
  linkedTicketId,
  setLinkedTicketId,
  ticketExecutions,
  bugLogs,
  setBugLogs,
  iniciarBugTicket,
}) => {
  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="border-zinc-850 w-[500px] rounded-xl border bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-3">
          <span className="font-mono text-xs font-bold text-red-400 uppercase">
            🐛 Registrar Bug / Hotfix
          </span>
          <button
            onClick={onClose}
            className="font-mono text-[10px] text-zinc-500 uppercase hover:text-zinc-300"
          >
            Cerrar
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
              Nombre / Título del Bug
            </label>
            <input
              type="text"
              value={bugNombre}
              onChange={(e) => setBugNombre(e.target.value)}
              placeholder="Ej: CRM-404 error filtro de clientes..."
              className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                Tipo de Bug
              </label>
              <select
                value={bugType}
                onChange={(e) => setBugType(e.target.value as any)}
                className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
              >
                <option value="bugfix">Bugfix (Normal - Staging)</option>
                <option value="hotfix">Hotfix (Urgente - Producción)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                Vincular a Ticket (Opcional)
              </label>
              <select
                value={linkedTicketId}
                onChange={(e) => setLinkedTicketId(e.target.value)}
                className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
              >
                <option value="">Ninguno...</option>
                {ticketExecutions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.titulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
              Logs / Detalles Técnicos
            </label>
            <textarea
              value={bugLogs}
              onChange={(e) => setBugLogs(e.target.value)}
              placeholder="Pega aquí los logs de consola o errores detectados..."
              rows={4}
              className="border-zinc-850 rounded border bg-zinc-900 p-1.5 font-mono text-[10px] text-zinc-200 outline-none"
            />
          </div>

          <button
            onClick={iniciarBugTicket}
            className="mt-2 w-full rounded bg-red-500 py-2 text-[10px] font-bold text-zinc-950 uppercase transition-all hover:bg-red-600"
          >
            Comenzar Solución
          </button>
        </div>
      </div>
    </div>
  );
};
