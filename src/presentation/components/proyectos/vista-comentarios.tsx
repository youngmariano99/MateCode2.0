"use client";

import React, { useState, useEffect } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { Input } from "../input";
import { useToast } from "../../hooks/useToast";

interface ComentarioProyecto {
  autor: string;
  texto: string;
  fecha: string;
}

interface VistaComentariosProps {
  proyectoId: string;
}

export const VistaComentarios: React.FC<VistaComentariosProps> = ({
  proyectoId,
}) => {
  const { mostrarToast } = useToast();
  const [comentarios, setComentarios] = useState<ComentarioProyecto[]>([]);
  const [nuevoText, setNuevoText] = useState("");

  useEffect(() => {
    const list: ComentarioProyecto[] = [
      {
        autor: "Mateo Gomez",
        texto: "Rediseño completo de paletas esmeralda subido.",
        fecha: "10/07/2026 15:30",
      },
      {
        autor: "Mariano",
        texto: "Pruebas de sincronización offline validadas con éxito.",
        fecha: "10/07/2026 18:22",
      },
    ];
    Promise.resolve().then(() => setComentarios(list));
  }, [proyectoId]);

  const agregarComentario = () => {
    if (!nuevoText.trim()) return;
    const item: ComentarioProyecto = {
      autor: "Mariano",
      texto: nuevoText,
      fecha: "Ahora mismo",
    };
    setComentarios((prev) => [...prev, item]);
    setNuevoText("");
    mostrarToast("Comentario agregado.", "exito");
  };

  return (
    <Card>
      <div className="mb-4 border-b border-[#2A2A2E] pb-4">
        <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-100 uppercase">
          Comentarios y Conversaciones
        </h3>
        <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
          Mensajería interna del equipo de desarrollo
        </p>
      </div>

      <div className="mb-4 flex max-h-[300px] flex-col gap-4 overflow-y-auto pr-1">
        {comentarios.map((c, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-1 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3.5 font-mono text-xs"
          >
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-emerald-400">{c.autor}</span>
              <span className="text-zinc-500">{c.fecha}</span>
            </div>
            <p className="mt-1 leading-relaxed text-zinc-300">{c.texto}</p>
          </div>
        ))}
      </div>

      <div className="flex items-end gap-2.5">
        <div className="flex-1">
          <Input
            value={nuevoText}
            onChange={(e) => setNuevoText(e.target.value)}
            placeholder="Escribe una observación, sugerencia, deploy release note..."
          />
        </div>
        <Button onClick={agregarComentario}>Enviar</Button>
      </div>
    </Card>
  );
};
