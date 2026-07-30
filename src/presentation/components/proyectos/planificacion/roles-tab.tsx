"use client";

import React from "react";
interface RolesTabProps {
  rolesMarkdown: string;
  setRolesMarkdown: (val: string) => void;
  copiarPromptRoles: () => void;
}

export const RolesTab: React.FC<RolesTabProps> = ({
  rolesMarkdown,
  setRolesMarkdown,
  copiarPromptRoles,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-3">
        <div>
          <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
            Definición de Roles de Usuario y Seguridad (ROLES.md)
          </span>
          <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
            Diseña y estructura los roles del sistema, accesos por módulo y
            políticas Supabase RLS.
          </p>
        </div>
        <button
          onClick={copiarPromptRoles}
          className="shrink-0 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
        >
          📋 Copiar Prompt IA Roles
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
          Roles y Reglas de Seguridad (ROLES.md)
        </label>
        <textarea
          value={rolesMarkdown}
          onChange={(e) => setRolesMarkdown(e.target.value)}
          placeholder="Pega aquí la especificación de roles y permisos devuelta por la IA..."
          rows={15}
          className="border-zinc-850 w-full rounded border bg-zinc-950 p-3 font-mono text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
    </div>
  );
};
