"use client";

import React, { useState } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { Input } from "../input";
import { Select } from "../select";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { GestionarBacklogUseCase } from "../../../application/use-cases/proyecto/gestionar-backlog.use-case";
import { useToast } from "../../hooks/useToast";

interface BacklogBoardProps {
  proyectoId: string;
}

interface EpicaCRM {
  id: string;
  nombre: string;
  descripcion?: string;
}

interface HistoriaCRM {
  id: string;
  epicaId?: string;
  titulo: string;
  descripcion?: string;
  prioridad: string;
  estimacion: number;
  estado: string;
}

export const BacklogBoard: React.FC<BacklogBoardProps> = ({ proyectoId }) => {
  const { mostrarToast } = useToast();
  const backlogUC = new GestionarBacklogUseCase();

  const [nombreEpica, setNombreEpica] = useState("");
  const [descEpica, setDescEpica] = useState("");

  const [tituloHistoria, setTituloHistoria] = useState("");
  const [descHistoria, setDescHistoria] = useState("");
  const [epicaSel, setEpicaSel] = useState("");
  const [prioridad, setPrioridad] = useState("Media");
  const [estimacion, setEstimacion] = useState(3);

  const [mostrarFormEpica, setMostrarFormEpica] = useState(false);
  const [mostrarFormHistoria, setMostrarFormHistoria] = useState(false);

  const epicas =
    ((useLiveQuery(() =>
      db.epicas.where("proyectoId").equals(proyectoId).toArray()
    ) || []) as unknown as EpicaCRM[]) || [];
  const historias =
    ((useLiveQuery(() =>
      db.historias.where("proyectoId").equals(proyectoId).toArray()
    ) || []) as unknown as HistoriaCRM[]) || [];

  const handleCrearEpica = async () => {
    if (!nombreEpica.trim()) {
      mostrarToast("El nombre de la épica es obligatorio.", "error");
      return;
    }
    const res = await backlogUC.crearEpica(proyectoId, {
      nombre: nombreEpica,
      descripcion: descEpica,
    });
    if (res.ok) {
      mostrarToast("Épica creada correctamente.", "exito");
      setNombreEpica("");
      setDescEpica("");
      setMostrarFormEpica(false);
    }
  };

  const handleCrearHistoria = async () => {
    if (!tituloHistoria.trim()) {
      mostrarToast("El título de la historia es obligatorio.", "error");
      return;
    }
    const res = await backlogUC.crearHistoriaUsuario(proyectoId, {
      titulo: tituloHistoria,
      descripcion: descHistoria,
      epicaId: epicaSel,
      prioridad,
      estimacion,
      estado: "backlog",
    });
    if (res.ok) {
      mostrarToast("Historia de usuario agregada al backlog.", "exito");
      setTituloHistoria("");
      setDescHistoria("");
      setMostrarFormHistoria(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="mb-4 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
          <div>
            <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
              Épicas del Proyecto
            </h3>
            <p className="font-mono text-[10px] text-zinc-500">
              Agrupadores de alto nivel funcional
            </p>
          </div>
          <Button onClick={() => setMostrarFormEpica(!mostrarFormEpica)}>
            {mostrarFormEpica ? "Cerrar" : "Nueva Épica"}
          </Button>
        </div>

        {mostrarFormEpica && (
          <div className="mb-4 flex flex-col gap-4 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-4">
            <Input
              label="Nombre de la Épica"
              value={nombreEpica}
              onChange={(e) => setNombreEpica(e.target.value)}
              placeholder="Módulo de checkout..."
            />
            <Input
              label="Descripción"
              value={descEpica}
              onChange={(e) => setDescEpica(e.target.value)}
              placeholder="Flujo completo de pagos y selección de tarjeta..."
            />
            <div className="flex justify-end gap-2">
              <Button onClick={handleCrearEpica}>Crear Épica</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {epicas.length === 0 ? (
            <span className="font-mono text-[10px] text-zinc-500 italic">
              Ninguna épica registrada.
            </span>
          ) : (
            epicas.map((ep) => {
              const historiasCount = historias.filter(
                (h) => h.epicaId === ep.id
              ).length;
              return (
                <div
                  key={ep.id}
                  className="rounded-xl border border-[#2A2A2E] bg-zinc-950 p-4 font-mono text-xs"
                >
                  <span className="block font-bold text-zinc-200">
                    {ep.nombre}
                  </span>
                  <span className="mt-1 block text-[10px] text-zinc-500">
                    {ep.descripcion || "Sin descripción"}
                  </span>
                  <span className="mt-3 inline-block rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[9px] font-bold text-zinc-400">
                    {historiasCount} Historias
                  </span>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
          <div>
            <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
              Historias de Usuario (Backlog)
            </h3>
            <p className="font-mono text-[10px] text-zinc-500">
              Historias sin planificar en ningún sprint activo
            </p>
          </div>
          <Button onClick={() => setMostrarFormHistoria(!mostrarFormHistoria)}>
            {mostrarFormHistoria ? "Cerrar" : "Nueva Historia"}
          </Button>
        </div>

        {mostrarFormHistoria && (
          <div className="mb-4 flex flex-col gap-4 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-4">
            <Input
              label="Título de la historia"
              value={tituloHistoria}
              onChange={(e) => setTituloHistoria(e.target.value)}
              placeholder="Integrar botón de MercadoPago..."
            />
            <Input
              label="Descripción (Criterios de aceptación)"
              value={descHistoria}
              onChange={(e) => setDescHistoria(e.target.value)}
              placeholder="Como comprador, quiero pagar con tarjeta de crédito para..."
            />
            <Select
              label="Asociar Épica"
              options={[{ value: "", label: "Sin Épica" }].concat(
                epicas.map((ep) => ({ value: ep.id, label: ep.nombre }))
              )}
              value={epicaSel}
              onChange={(val) => setEpicaSel(val)}
            />
            <Select
              label="Prioridad"
              options={[
                { value: "Alta", label: "Alta" },
                { value: "Media", label: "Media" },
                { value: "Baja", label: "Baja" },
              ]}
              value={prioridad}
              onChange={(val) => setPrioridad(val)}
            />
            <Input
              label="Estimación (Puntos)"
              type="number"
              value={estimacion}
              onChange={(e) => setEstimacion(Number(e.target.value))}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={handleCrearHistoria}>Agregar Historia</Button>
            </div>
          </div>
        )}

        <div className="flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-1">
          {historias.filter((h) => !h.estado || h.estado === "backlog")
            .length === 0 ? (
            <span className="block py-6 text-center font-mono text-xs text-zinc-500 italic">
              El Backlog está vacío. Registra o importa historias de usuario.
            </span>
          ) : (
            historias
              .filter((h) => !h.estado || h.estado === "backlog")
              .map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3.5 font-mono text-xs transition-all hover:border-zinc-800"
                >
                  <div>
                    <span className="block font-bold text-zinc-200">
                      {h.titulo}
                    </span>
                    <span className="mt-1 block text-[10px] text-zinc-500">
                      {h.descripcion}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] text-zinc-400">
                      Est: {h.estimacion} pts
                    </span>
                    <span
                      className={`rounded-lg px-2 py-1 text-[9px] font-bold ${
                        h.prioridad === "Alta"
                          ? "border border-red-500/20 bg-red-500/10 text-red-400"
                          : h.prioridad === "Media"
                            ? "border border-amber-500/20 bg-amber-500/10 text-amber-400"
                            : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {h.prioridad}
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>
      </Card>
    </div>
  );
};
