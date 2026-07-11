"use client";

import React, { useState, useEffect } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { useToast } from "../../hooks/useToast";

interface VistaDocumentosProps {
  proyectoId: string;
}

export const VistaDocumentos: React.FC<VistaDocumentosProps> = ({
  proyectoId,
}) => {
  const { mostrarToast } = useToast();
  const [docText, setDocText] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(`matecode_proj_doc_${proyectoId}`);
    if (saved) {
      Promise.resolve().then(() => setDocText(saved));
    } else {
      Promise.resolve().then(() =>
        setDocText(
          `# Documentación del Proyecto\n\n- **Objetivo:** Definir alcances técnicos.\n- **Plataforma:** Next.js & Dexie Offline.`
        )
      );
    }
  }, [proyectoId]);

  const guardarDocumentacion = () => {
    localStorage.setItem(`matecode_proj_doc_${proyectoId}`, docText);
    mostrarToast("Documentación técnica guardada localmente.", "exito");
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between border-b border-[#2A2A2E] pb-4">
        <div>
          <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-100 uppercase">
            Documentación Técnica (Design.md / Spec)
          </h3>
          <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
            Editor Markdown permanente del proyecto
          </p>
        </div>
        <Button onClick={guardarDocumentacion}>Guardar Documento</Button>
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          rows={12}
          value={docText}
          onChange={(e) => setDocText(e.target.value)}
          className="w-full resize-none rounded-xl border border-[#2A2A2E] bg-[#18181B] p-3.5 font-mono text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
        />
        <span className="text-[10px] text-zinc-500">
          Usa markdown estándar. Los cambios se guardan localmente offline.
        </span>
      </div>
    </Card>
  );
};
