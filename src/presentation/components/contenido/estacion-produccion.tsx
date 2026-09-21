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
import {
  ordenarPorEtapa,
  pendienteDeEdicion,
} from "../../../domain/entidades/contenido-semana.entity";
import { TAREA_GRABAR } from "../../../domain/entidades/contenido-semana.entity";

const useCase = new GestionarContenidoUseCase();
const SIN_CONTENIDOS: never[] = [];

interface EstacionProduccionProps {
  cicloId: string;
}

/** Consejos de la sesión de edición del SOP (sección 4, bloque 3). */
const PASOS_EDICION = [
  "Importá los clips a CapCut y generá subtítulos automáticos (tipografía limpia, en la zona segura: debajo del mentón).",
  "Resaltá en verde Nodexa (#16D39A) palabras como WhatsApp, stock, caja, fiado, gratis, demo.",
  "Sonido sutil de swoosh en cada transición y efectos de notificación para los dolores de WhatsApp o mostrador lento.",
  "Programá la publicación entre las 18:00 y las 21:00 hs, cuando los comerciantes cierran caja.",
];

/**
 * Estación de edición y programación (la grabación es su propia estación):
 * las piezas ya grabadas —o que no se graban, como posts y carruseles—, con el
 * guion a la vista y el checklist de edición. Se edita y programa en lote.
 */
export const EstacionProduccion: React.FC<EstacionProduccionProps> = ({
  cicloId,
}) => {
  const [activoId, setActivoId] = useState<string | null>(null);
  const [nuevaTarea, setNuevaTarea] = useState("");

  const contenidos =
    useLiveQuery(
      async () =>
        ordenarPorEtapa(
          (
            await db.contenido
              .where({ cicloId, estado: "Producción" })
              .toArray()
          ).filter(pendienteDeEdicion),
          "edicion"
        ),
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
    <div className="flex flex-col gap-4">
      <details
        className="rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4"
        open
      >
        <summary className="cursor-pointer text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Edición y programación en lote
        </summary>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-zinc-400">
          {PASOS_EDICION.map((p) => (
            <li key={p}>• {p}</li>
          ))}
        </ul>
      </details>
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
              Nada para editar todavía — las piezas aparecen acá cuando las
              marcás como grabadas.
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
                {activo.tareasPendientes
                  .filter((t) => t.texto !== TAREA_GRABAR)
                  .map((t) => (
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
    </div>
  );
};
