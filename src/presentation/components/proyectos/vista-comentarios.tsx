"use client";

import React, { useState } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { Input } from "../input";
import { useToast } from "../../hooks/useToast";
import { db } from "../../../offline/dexie/db";
import { useLiveQuery } from "dexie-react-hooks";

interface ComentarioProyecto {
  id: string;
  proyectoId: string;
  autor: string;
  texto: string;
  fecha: string;
  creadoEn: number;
}

interface VistaComentariosProps {
  proyectoId: string;
}

export const VistaComentarios: React.FC<VistaComentariosProps> = ({
  proyectoId,
}) => {
  const { mostrarToast } = useToast();
  const [nuevoText, setNuevoText] = useState("");

  const comentariosRaw =
    useLiveQuery(() =>
      db.comentarios_proyecto
        .where("proyectoId")
        .equals(proyectoId)
        .sortBy("creadoEn")
    ) || [];

  const comentarios = comentariosRaw as unknown as ComentarioProyecto[];

  const agregarComentario = async () => {
    if (!nuevoText.trim()) return;

    try {
      const now = new Date();
      const formatFecha =
        now.toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }) +
        " " +
        now.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        });

      const item: ComentarioProyecto = {
        id: `comm_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        proyectoId,
        autor: "Mariano", // Logged in developer/preventista
        texto: nuevoText.trim(),
        fecha: formatFecha,
        creadoEn: Date.now(),
      };

      await db.comentarios_proyecto.add(
        item as unknown as Record<string, unknown>
      );
      setNuevoText("");
      mostrarToast("Comentario publicado offline.", "exito");
    } catch {
      mostrarToast("Error al publicar comentario.", "error");
    }
  };

  const eliminarComentario = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este comentario?")) {
      try {
        await db.comentarios_proyecto.delete(id);
        mostrarToast("Comentario eliminado.", "info");
      } catch {
        mostrarToast("Error al eliminar comentario.", "error");
      }
    }
  };

  return (
    <Card>
      <div className="mb-4 border-b border-[#2A2A2E] pb-4">
        <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
          Notas Operativas & Bitácora
        </h3>
        <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
          Comentarios, anotaciones técnicas y registro de avance del desarrollo
        </p>
      </div>

      <div className="mb-4 flex max-h-[300px] flex-col gap-3 overflow-y-auto pr-1">
        {comentarios.length === 0 ? (
          <span className="rounded-xl border border-dashed border-[#2A2A2E] py-12 text-center font-mono text-xs text-zinc-500 italic">
            Sin notas registradas. Comienza escribiendo una anotación sobre el
            proyecto.
          </span>
        ) : (
          comentarios.map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-1 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3.5 font-mono text-xs"
            >
              <div className="flex items-center justify-between text-[9px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-400">{c.autor}</span>
                  <span className="text-zinc-600">• {c.fecha}</span>
                </div>
                <button
                  onClick={() => eliminarComentario(c.id)}
                  className="font-bold text-zinc-600 hover:text-red-400"
                  title="Eliminar comentario"
                >
                  Borrar
                </button>
              </div>
              <p className="mt-1 leading-relaxed whitespace-pre-line text-zinc-300">
                {c.texto}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="flex items-end gap-2.5">
        <div className="flex-1">
          <Input
            value={nuevoText}
            onChange={(e) => setNuevoText(e.target.value)}
            placeholder="Añade una anotación técnica, release note o feedback..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void agregarComentario();
              }
            }}
          />
        </div>
        <Button onClick={agregarComentario}>Publicar</Button>
      </div>
    </Card>
  );
};
