"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Icono } from "../../icons";
import { useToast } from "../../../hooks/useToast";
import { GestionarRecursosOficinaUseCase } from "../../../../application/use-cases/personal/gestionar-recursos-oficina.use-case";

const ACCESOS_APP = [
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

const recursosUseCase = new GestionarRecursosOficinaUseCase();

/**
 * Accesos directos: Principales de la app + Personalizados creados por el usuario.
 * Todos abren en pestaña nueva (target="_blank") para no perder el contexto de la Oficina ni pausar el cronómetro.
 */
export const AccesosRapidos: React.FC = () => {
  const { mostrarToast } = useToast();
  const [agregando, setAgregando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaUrl, setNuevaUrl] = useState("");

  const accesosPersonalizados =
    useLiveQuery(
      () =>
        db.recurso_oficina
          .where("tipo")
          .equals("acceso_directo")
          .sortBy("orden"),
      []
    ) ?? [];

  const handleCrearAcceso = async () => {
    if (!nuevoNombre.trim() || !nuevaUrl.trim()) {
      mostrarToast("Nombre y URL son obligatorios.", "error");
      return;
    }

    let urlFinal = nuevaUrl.trim();
    if (!urlFinal.startsWith("http://") && !urlFinal.startsWith("https://")) {
      urlFinal = `https://${urlFinal}`;
    }

    const res = await recursosUseCase.crearRecurso({
      tipo: "acceso_directo",
      titulo: nuevoNombre.trim(),
      url: urlFinal,
      etiquetas: ["acceso_directo"],
    });

    if (res.ok) {
      mostrarToast("Acceso personalizado añadido.", "exito");
      setNuevoNombre("");
      setNuevaUrl("");
      setAgregando(false);
    } else {
      mostrarToast(res.error?.mensaje || "Error al crear acceso.", "error");
    }
  };

  const handleEliminar = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await recursosUseCase.eliminarRecurso(id);
    mostrarToast("Acceso eliminado.", "info");
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icono.ArrowRight className="h-4 w-4 text-zinc-500" />
          <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Accesos rápidos (abren en nueva pestaña)
          </h3>
        </div>
        <button
          onClick={() => setAgregando(!agregando)}
          className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/10"
        >
          <Icono.Plus className="h-3 w-3" />
          {agregando ? "Cancelar" : "Añadir web"}
        </button>
      </div>

      {/* Formulario rápido para nuevo acceso personalizado */}
      {agregando && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5">
          <input
            type="text"
            placeholder="Nombre (ej: GitHub, Odoo)"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            className="min-w-32 flex-1 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
          />
          <input
            type="text"
            placeholder="URL (ej: github.com)"
            value={nuevaUrl}
            onChange={(e) => setNuevaUrl(e.target.value)}
            className="min-w-44 flex-1 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
          />
          <button
            onClick={handleCrearAcceso}
            className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-bold text-zinc-950 hover:bg-emerald-400"
          >
            Guardar
          </button>
        </div>
      )}

      {/* Lista de accesos */}
      <div className="flex flex-wrap gap-2">
        {/* 1. Módulos clave de la app */}
        {ACCESOS_APP.map((a) => {
          const Icon = a.icono;
          return (
            <a
              key={a.href}
              href={a.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-emerald-500/40 hover:text-zinc-100"
            >
              <Icon className="h-3.5 w-3.5 text-emerald-400" />
              {a.label}
              <span className="text-[10px] text-zinc-600">↗</span>
            </a>
          );
        })}

        {/* 2. Accesos personalizados del usuario */}
        {accesosPersonalizados.map((p) => (
          <div key={p.id} className="group relative flex items-center">
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#0D0D0F] px-3 py-2 pr-7 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
            >
              <Icono.Globe className="h-3.5 w-3.5 text-zinc-500" />
              {p.titulo}
              <span className="text-[10px] text-zinc-600">↗</span>
            </a>
            <button
              onClick={(e) => void handleEliminar(p.id, e)}
              title="Eliminar acceso"
              className="absolute right-1.5 hidden p-0.5 text-zinc-500 group-hover:block hover:text-red-400"
            >
              <Icono.Close className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
