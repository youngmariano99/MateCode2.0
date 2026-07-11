"use client";

import React, { useState, useEffect } from "react";
import { Card } from "../card";
import { useToast } from "../../hooks/useToast";
import { ArchivoService } from "../../services/archivo.service";

interface ArchivoAdjunto {
  nombre: string;
  tamanio: string;
  fecha: string;
}

interface VistaArchivosProps {
  proyectoId: string;
}

export const VistaArchivos: React.FC<VistaArchivosProps> = ({ proyectoId }) => {
  const { mostrarToast } = useToast();
  const [archivos, setArchivos] = useState<ArchivoAdjunto[]>([]);

  useEffect(() => {
    const list: ArchivoAdjunto[] = [
      { nombre: "Logo_Vector.png", tamanio: "450 KB", fecha: "10/07/2026" },
      { nombre: "Requerimientos.pdf", tamanio: "1.2 MB", fecha: "08/07/2026" },
    ];
    Promise.resolve().then(() => setArchivos(list));
  }, [proyectoId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      ArchivoService.validarImagen(file);
      const nuevo: ArchivoAdjunto = {
        nombre: file.name,
        tamanio: `${(file.size / 1024).toFixed(0)} KB`,
        fecha: "Hoy",
      };
      setArchivos((prev) => [...prev, nuevo]);
      mostrarToast("Archivo subido con éxito.", "exito");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      mostrarToast(msg || "Error al subir archivo.", "error");
    }
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between border-b border-[#2A2A2E] pb-4">
        <div>
          <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-100 uppercase">
            Archivos del Proyecto
          </h3>
          <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
            Logotipos, mockups, especificaciones y contratos
          </p>
        </div>
        <label className="cursor-pointer rounded-xl bg-emerald-500 px-3.5 py-2.5 font-mono text-xs font-bold text-zinc-950 select-none hover:bg-emerald-600">
          Subir Archivo
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        {archivos.length === 0 ? (
          <span className="py-6 text-center text-xs text-zinc-500 italic">
            Sin archivos adjuntos.
          </span>
        ) : (
          archivos.map((a, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3 font-mono text-xs transition-all hover:border-zinc-800"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-300">{a.nombre}</span>
                <span className="text-[10px] text-zinc-600">({a.tamanio})</span>
              </div>
              <span className="text-[10px] text-zinc-500">{a.fecha}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
