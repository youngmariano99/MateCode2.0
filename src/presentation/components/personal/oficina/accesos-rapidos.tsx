"use client";

import React from "react";
import Link from "next/link";
import { Icono } from "../../icons";

const ACCESOS = [
  {
    label: "Contacto en Frío",
    href: "/dashboard/contacto-frio",
    icono: Icono.Contactos,
  },
  {
    label: "Contenido",
    href: "/dashboard/planificador-contenido",
    icono: Icono.Calendario,
  },
  {
    label: "Desarrollo",
    href: "/dashboard/proyectos",
    icono: Icono.Proyectos,
  },
] as const;

/** Accesos directos a los otros módulos — cruzan el switcher Profesional/Personal a propósito. */
export const AccesosRapidos: React.FC = () => (
  <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
    <div className="flex items-center gap-2">
      <Icono.ArrowRight className="h-4 w-4 text-zinc-500" />
      <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
        Accesos rápidos
      </h3>
    </div>
    <div className="flex flex-col gap-2 sm:flex-row">
      {ACCESOS.map((a) => {
        const Icon = a.icono;
        return (
          <Link
            key={a.href}
            href={a.href}
            className="flex flex-1 items-center gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3 text-sm text-zinc-300 hover:border-emerald-500/40 hover:text-zinc-100"
          >
            <Icon className="h-4 w-4 text-zinc-500" />
            {a.label}
          </Link>
        );
      })}
    </div>
  </div>
);
