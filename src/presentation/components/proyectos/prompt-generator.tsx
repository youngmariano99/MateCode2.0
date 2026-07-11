"use client";

import React, { useState } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { GestionarIngenieriaUseCase } from "../../../application/use-cases/proyecto/gestionar-ingenieria.use-case";
import { useToast } from "../../hooks/useToast";

interface PromptGeneratorProps {
  proyectoId: string;
}

export const PromptGenerator: React.FC<PromptGeneratorProps> = ({
  proyectoId,
}) => {
  const { mostrarToast } = useToast();
  const uc = new GestionarIngenieriaUseCase();

  const [promptText, setPromptText] = useState("");
  const [jsonText, setJsonText] = useState("");

  const handleGenerarPrompt = async () => {
    const res = await uc.generarPrompt(proyectoId);
    if (res.ok) {
      setPromptText(res.valor);
      mostrarToast("Prompt generado correctamente.", "exito");
    }
  };

  const handleCopiarPrompt = () => {
    if (!promptText) return;
    navigator.clipboard.writeText(promptText);
    mostrarToast("Prompt copiado al portapapeles.", "exito");
  };

  const handleImportarJSON = async () => {
    if (!jsonText.trim()) {
      mostrarToast(
        "Por favor pega el JSON del backlog antes de importar.",
        "error"
      );
      return;
    }
    const res = await uc.importarBacklogJSON(proyectoId, jsonText);
    if (res.ok) {
      mostrarToast("Backlog importado y creado con éxito.", "exito");
      setJsonText("");
    } else {
      mostrarToast(
        res.error?.mensaje || "Error al importar el backlog",
        "error"
      );
    }
  };

  const handleExportarMarkdown = async () => {
    const res = await uc.exportarContextoMarkdown(proyectoId);
    if (res.ok) {
      const blob = new Blob([res.valor], {
        type: "text/markdown;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `proyecto-contexto-${proyectoId}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      mostrarToast("Archivo Markdown descargado localmente.", "exito");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <div className="mb-4 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
          <div>
            <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
              Generador de Prompt de Ingeniería
            </h3>
            <p className="font-mono text-[10px] text-zinc-500">
              Genera prompts de Prompt Engineering para modelos de IA
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button onClick={handleGenerarPrompt} className="flex-1">
              Generar Prompt IA
            </Button>
            <button
              onClick={handleExportarMarkdown}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-[10px] font-bold text-white transition-all select-none hover:bg-zinc-700"
            >
              Exportar Markdown
            </button>
          </div>

          <textarea
            readOnly
            value={promptText}
            placeholder="Haz clic en Generar Prompt para iniciar..."
            className="h-[180px] w-full rounded-xl border border-[#2A2A2E] bg-zinc-950 p-4 font-mono text-[10px] text-zinc-400 focus:outline-none"
          />

          {promptText && (
            <Button onClick={handleCopiarPrompt} className="w-full">
              Copiar Prompt al Portapapeles
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-4 border-b border-[#2A2A2E] pb-3">
          <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            Importar Backlog Generado por IA
          </h3>
          <p className="font-mono text-[10px] text-zinc-500">
            Pega el JSON devuelto por la IA para poblar épicas e historias
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='Pega el JSON aquí (ej: { "epicas": [], "historias": [] })'
            className="h-[218px] w-full rounded-xl border border-[#2A2A2E] bg-zinc-950 p-4 font-mono text-[10px] text-zinc-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />

          <Button onClick={handleImportarJSON} className="w-full">
            Importar Backlog JSON
          </Button>
        </div>
      </Card>
    </div>
  );
};
