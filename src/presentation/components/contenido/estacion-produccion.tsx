"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Input } from "../input";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Badge } from "../badge";
import { Icono } from "../icons";
import { GestionarContenidoUseCase } from "../../../application/use-cases/contenido/gestionar-contenido.use-case";

const useCase = new GestionarContenidoUseCase();
const SIN_CONTENIDOS: never[] = [];

interface EstacionProduccionProps {
  cicloId: string;
}

/** Estación 3: grabación + edición fusionadas. Guion a la vista, checklist con extras. */
export const EstacionProduccion: React.FC<EstacionProduccionProps> = ({
  cicloId,
}) => {
  const [activoId, setActivoId] = useState<string | null>(null);
  const [nuevaTarea, setNuevaTarea] = useState("");

  const contenidos =
    useLiveQuery(
      () => db.contenido.where({ cicloId, estado: "Producción" }).toArray(),
      [cicloId]
    ) || SIN_CONTENIDOS;
  const activo = useLiveQuery(
    () => (activoId ? db.contenido.get(activoId) : undefined),
    [activoId]
  );

  const agregarTarea = async () => {
    if (!activoId || !nuevaTarea.trim()) return;
    await useCase.agregarTareaPendiente(activoId, nuevaTarea);
    setNuevaTarea("");
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <div className="flex flex-col gap-1">
        {contenidos.map((c) => (
          <button
            key={c.id}
            onClick={() => setActivoId(c.id)}
            className={`rounded-xl px-3 py-2 text-left text-sm transition-all ${
              activoId === c.id
                ? "bg-emerald-500/10 font-bold text-emerald-400"
                : "text-zinc-300 hover:bg-[#18181B]"
            }`}
          >
            {c.titulo}
          </button>
        ))}
        {contenidos.length === 0 && (
          <span className="px-1 py-4 text-sm text-zinc-600">
            Nada en producción todavía.
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6">
        {!activo ? (
          <span className="text-sm text-zinc-600">
            Elegí un contenido de la lista.
          </span>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-zinc-100">
                {activo.titulo}
              </h3>
              <Badge color="sky">{activo.tipoContenido}</Badge>
            </div>

            <section className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] p-4">
              <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
                Guion (referencia)
              </span>
              {Object.entries(activo.guion)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <p key={k} className="text-sm text-zinc-400">
                    <span className="font-semibold text-zinc-300">{k}:</span>{" "}
                    {v}
                  </p>
                ))}
            </section>

            <section className="flex flex-col gap-2">
              <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
                Checklist
              </span>
              {activo.tareasPendientes.map((t) => (
                <Checkbox
                  key={t.id}
                  label={t.texto}
                  checked={t.hecha}
                  onChange={(e) =>
                    useCase.marcarTarea(activo.id, t.id, e.target.checked)
                  }
                />
              ))}
              <div className="flex gap-2">
                <Input
                  value={nuevaTarea}
                  onChange={(e) => setNuevaTarea(e.target.value)}
                  placeholder="Ej: hacer video con IA para el gancho visual"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={agregarTarea}
                  icono={<Icono.Plus className="h-4 w-4" />}
                >
                  Agregar
                </Button>
              </div>
            </section>
            <span className="text-xs text-zinc-500">
              Cuando esté listo, pasalo a publicado desde la estación
              &quot;Publicado&quot;.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
