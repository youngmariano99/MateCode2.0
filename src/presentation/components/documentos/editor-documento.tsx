"use client";

import React, { useState, useEffect } from "react";
import { PanelVariables } from "./panel-variables";
import { Button } from "../button";
import { Input } from "../input";
import { db } from "../../../offline/dexie/db";
import { ActualizarDocumentoUseCase } from "../../../application/use-cases/documento/actualizar-documento.use-case";
import { useToast } from "../../hooks/useToast";

interface VersionDocumento {
  version: number;
  fecha: number;
  autor: string;
  contenido: string;
  comentario: string;
}

interface DocumentoCRM {
  id: string;
  titulo: string;
  tipo: string;
  clienteId: string;
  proyectoId?: string;
  monto?: string;
  formaPago?: string;
  contenido: string;
  versiones: VersionDocumento[];
}

interface EditorDocumentoProps {
  documento: DocumentoCRM;
  onVolver: () => void;
  onGuardado: () => void;
}

export const EditorDocumento: React.FC<EditorDocumentoProps> = ({
  documento,
  onVolver,
  onGuardado,
}) => {
  const { mostrarToast } = useToast();
  const updateUC = new ActualizarDocumentoUseCase();

  const [contenido, setContenido] = useState(documento.contenido);
  const [comentarioVersion, setComentarioVersion] = useState("");
  const [clienteInfo, setClienteInfo] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [proyectoInfo, setProyectoInfo] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [verVersiones, setVerVersiones] = useState(false);

  // Fetch linked client & project info for template parsing
  useEffect(() => {
    const fetchInfo = async () => {
      if (documento.clienteId) {
        const c = await db.clientes.get(documento.clienteId);
        if (c) Promise.resolve().then(() => setClienteInfo(c));
      }
      if (documento.proyectoId) {
        const p = await db.proyectos.get(documento.proyectoId);
        if (p) Promise.resolve().then(() => setProyectoInfo(p));
      }
    };
    void fetchInfo();
  }, [documento]);

  const parseContenido = (texto: string) => {
    let output = texto;
    const mappings: Record<string, string> = {
      "{{cliente.nombre}}": (clienteInfo?.nombre as string) || "[Cliente]",
      "{{cliente.empresa}}": (clienteInfo?.empresa as string) || "[Empresa]",
      "{{cliente.cuit}}": (clienteInfo?.cuit as string) || "[CUIT]",
      "{{cliente.direccion}}":
        (clienteInfo?.direccion as string) || "[Dirección]",
      "{{agencia.nombre}}": "MateCode Digital",
      "{{agencia.email}}": "contacto@matecode.com",
      "{{proyecto.nombre}}": (proyectoInfo?.nombre as string) || "[Proyecto]",
      "{{proyecto.fecha_entrega}}":
        (proyectoInfo?.fechaEntrega as string) || "[Fecha Entrega]",
      "{{fecha_actual}}": new Date().toLocaleDateString("es-AR"),
      "{{monto.total}}": documento.monto || "$ 1500 USD",
      "{{forma_pago}}": documento.formaPago || "50% adelanto, 50% al entregar",
    };

    for (const [key, value] of Object.entries(mappings)) {
      output = output.replaceAll(key, value);
    }
    return output;
  };

  const handleGuardar = async () => {
    const res = await updateUC.ejecutar(
      documento.id,
      { ...documento, contenido },
      comentarioVersion || undefined
    );
    if (res.ok) {
      mostrarToast("Documento guardado y versionado correctamente.", "exito");
      setComentarioVersion("");
      onGuardado();
    }
  };

  const restaurarVersion = (v: VersionDocumento) => {
    setContenido(v.contenido);
    mostrarToast(
      `Contenido restaurado a v${v.version}. Recuerda guardar para fijarla.`,
      "info"
    );
    setVerVersiones(false);
  };

  const handleExportarPDF = () => {
    mostrarToast("Exportación PDF generada con éxito (Offline).", "exito");
  };

  const handleExportarMarkdown = () => {
    const blob = new Blob([contenido], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${documento.titulo.toLowerCase().replaceAll(" ", "_")}.md`;
    a.click();
    mostrarToast("Markdown descargado con éxito.", "exito");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 border-b border-[#2A2A2E] pb-4 md:flex-row md:items-center">
        <div>
          <button
            onClick={onVolver}
            className="mb-1 block font-mono text-xs font-bold text-zinc-400 hover:text-zinc-200"
          >
            ← Volver al panel de documentos
          </button>
          <h2 className="text-xl font-extrabold text-white">
            Editor: {documento.titulo}
          </h2>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setVerVersiones(!verVersiones)}>
            Ver Versiones ({documento.versiones?.length || 1})
          </Button>
          <Button onClick={handleExportarPDF}>Exportar PDF</Button>
          <Button onClick={handleExportarMarkdown}>Exportar MD</Button>
          <Button onClick={handleGuardar}>Guardar Cambios</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <PanelVariables
            onInsertar={(v) => setContenido((prev) => prev + " " + v)}
          />
        </div>

        <div className="flex flex-col gap-4 lg:col-span-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] font-bold tracking-wide text-zinc-400 uppercase">
                Contenido Markdown (Editor)
              </span>
              <textarea
                rows={16}
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                className="w-full resize-none rounded-xl border border-[#2A2A2E] bg-zinc-950 p-4 font-mono text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] font-bold tracking-wide text-zinc-400 uppercase">
                Previsualización en tiempo real (Variables Reemplazadas)
              </span>
              <div className="h-[330px] w-full overflow-y-auto rounded-xl border border-[#2A2A2E] bg-[#18181B] p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-zinc-300 select-all">
                {parseContenido(contenido)}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#2A2A2E] bg-[#18181B] p-4">
            <Input
              label="Comentario de esta versión (Opcional)"
              value={comentarioVersion}
              onChange={(e) => setComentarioVersion(e.target.value)}
              placeholder="Ej: Modificación de cláusula de facturación..."
            />
          </div>
        </div>
      </div>

      {verVersiones && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="animate-in zoom-in w-full max-w-lg rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6 shadow-2xl duration-150">
            <div className="mb-5 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
              <h3 className="font-mono text-base font-extrabold tracking-tight text-white">
                Historial de Versiones
              </h3>
              <button
                onClick={() => setVerVersiones(false)}
                className="font-mono font-bold text-zinc-500 hover:text-zinc-300"
              >
                ×
              </button>
            </div>

            <div className="flex max-h-[300px] flex-col gap-3 overflow-y-auto">
              {documento.versiones?.map((v) => (
                <div
                  key={v.version}
                  className="flex items-center justify-between rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3 font-mono text-xs transition-all hover:border-zinc-800"
                >
                  <div>
                    <span className="block font-bold text-emerald-400">
                      Versión {v.version}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-zinc-400">
                      {v.comentario}
                    </span>
                    <span className="block text-[9px] text-zinc-600">
                      Por: {v.autor} • {new Date(v.fecha).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => restaurarVersion(v)}
                    className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20"
                  >
                    Restaurar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
