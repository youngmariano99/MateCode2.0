"use client";

import React from "react";
import { Card } from "../card";
import { useToast } from "../../hooks/useToast";
import { db } from "../../../offline/dexie/db";
import { useLiveQuery } from "dexie-react-hooks";

interface ArchivoAdjunto {
  id: string;
  proyectoId: string;
  nombre: string;
  tamanio: string;
  fecha: string;
  contenidoBase64: string;
  tipoMime: string;
  creadoEn: number;
}

interface VistaArchivosProps {
  proyectoId: string;
}

export const VistaArchivos: React.FC<VistaArchivosProps> = ({ proyectoId }) => {
  const { mostrarToast } = useToast();

  const archivosRaw =
    useLiveQuery(() =>
      db.archivos_proyecto
        .where("proyectoId")
        .equals(proyectoId)
        .sortBy("creadoEn")
    ) || [];

  const archivos = archivosRaw as unknown as ArchivoAdjunto[];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      mostrarToast(
        "El archivo excede el tamaño máximo permitido de 2 MB.",
        "error"
      );
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const nuevo: ArchivoAdjunto = {
          id: `file_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          proyectoId,
          nombre: file.name,
          tamanio: `${(file.size / 1024).toFixed(0)} KB`,
          fecha: new Date().toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          contenidoBase64: base64Data,
          tipoMime: file.type,
          creadoEn: Date.now(),
        };

        await db.archivos_proyecto.add(
          nuevo as unknown as Record<string, unknown>
        );
        mostrarToast(
          "Archivo subido e indexado en IndexedDB con éxito.",
          "exito"
        );
      };
      reader.readAsDataURL(file);
    } catch {
      mostrarToast("Error al subir archivo.", "error");
    }
  };

  const handleDownloadFile = (a: ArchivoAdjunto) => {
    try {
      const link = document.createElement("a");
      link.href = a.contenidoBase64;
      link.download = a.nombre;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      mostrarToast("Archivo descargado.", "exito");
    } catch {
      mostrarToast("Error al descargar archivo.", "error");
    }
  };

  const handleEliminarFile = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este archivo adjunto?")) {
      try {
        await db.archivos_proyecto.delete(id);
        mostrarToast("Archivo eliminado de la base de datos.", "info");
      } catch {
        mostrarToast("Error al eliminar archivo.", "error");
      }
    }
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between border-b border-[#2A2A2E] pb-4">
        <div>
          <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            Archivos del Proyecto
          </h3>
          <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
            Adjunta requerimientos, logotipos o contratos en formato PDF o
            Imagen (Máx. 2MB)
          </p>
        </div>
        <label className="cursor-pointer rounded-xl bg-emerald-500 px-3.5 py-2 font-mono text-xs font-bold text-zinc-950 transition-all select-none hover:bg-emerald-600 active:scale-95">
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
          <span className="rounded-xl border border-dashed border-[#2A2A2E] py-12 text-center font-mono text-xs text-zinc-500 italic">
            Sin archivos adjuntos. Sube archivos reales de tu computadora.
          </span>
        ) : (
          archivos.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3 font-mono text-xs transition-all hover:border-zinc-800"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-200">{a.nombre}</span>
                  <span className="text-[9px] text-zinc-500">
                    ({a.tamanio})
                  </span>
                </div>
                <span className="text-[9px] text-zinc-600">
                  Subido el: {a.fecha}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadFile(a)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] font-bold text-emerald-400 hover:border-zinc-700"
                >
                  Descargar ↗
                </button>
                <button
                  onClick={() => handleEliminarFile(a.id)}
                  className="rounded-lg border border-red-900/30 bg-red-950/20 px-2.5 py-1 text-[10px] text-red-400 hover:bg-red-900 hover:text-white"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
