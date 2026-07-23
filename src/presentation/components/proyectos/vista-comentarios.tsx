"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { useToast } from "../../hooks/useToast";
import { db } from "../../../offline/dexie/db";
import { useLiveQuery } from "dexie-react-hooks";

interface GarantiaItem {
  id: string;
  proyectoId: string;
  autor: string;
  titulo: string;
  texto: string; // Markdown description
  fecha: string;
  creadoEn: number;
  completado: boolean;
  fechaCompletado: string | null;
}

interface VistaComentariosProps {
  proyectoId: string;
}

// Simple offline custom Markdown-to-HTML parser
function parseMarkdown(text: string): string {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers
  html = html.replace(
    /^### (.*$)/gim,
    '<h4 class="text-xs font-mono font-bold text-emerald-400 mt-3 mb-1.5 uppercase">$1</h4>'
  );
  html = html.replace(
    /^## (.*$)/gim,
    '<h3 class="text-sm font-mono font-bold text-emerald-300 mt-4 mb-2 uppercase">$1</h3>'
  );
  html = html.replace(
    /^# (.*$)/gim,
    '<h2 class="text-base font-mono font-bold text-zinc-100 mt-5 mb-3">$1</h2>'
  );

  // Bold
  html = html.replace(
    /\*\*(.*?)\*\*/g,
    '<strong class="font-bold text-zinc-100">$1</strong>'
  );
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-zinc-300">$1</em>');
  html = html.replace(/_(.*?)_/g, '<em class="italic text-zinc-300">$1</em>');

  // Checklist items
  html = html.replace(
    /^\s*-\s*\[\s*\]\s*(.*$)/gim,
    '<div class="flex items-center gap-2 my-1.5"><span class="h-3 w-3 rounded border border-zinc-700 bg-zinc-950 flex-shrink-0"></span><span class="text-zinc-300 text-xs">$1</span></div>'
  );
  html = html.replace(
    /^\s*-\s*\[x\]\s*(.*$)/gim,
    '<div class="flex items-center gap-2 my-1.5"><span class="h-3 w-3 rounded border border-emerald-500 bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 text-[8px] font-bold">✓</span><span class="text-zinc-500 text-xs line-through">$1</span></div>'
  );

  // Unordered list items
  html = html.replace(
    /^\s*-\s*(?!\[ \]|\[x\])(.*$)/gim,
    '<li class="list-disc list-inside ml-2 my-1 text-zinc-300 text-xs">$1</li>'
  );

  // Code block
  html = html.replace(
    /`(.*?)`/g,
    '<code class="bg-zinc-900 border border-zinc-800 rounded px-1 py-0.5 font-mono text-[10px] text-pink-400">$1</code>'
  );

  // Paragraph blocks
  html = html
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed === "") return '<div class="h-2"></div>';
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<div") ||
        trimmed.startsWith("<li")
      )
        return line;
      return `<p class="my-1.5 text-zinc-300 text-xs leading-relaxed">${line}</p>`;
    })
    .join("\n");

  return html;
}

export const VistaComentarios: React.FC<VistaComentariosProps> = ({
  proyectoId,
}) => {
  const { mostrarToast } = useToast();

  const [activeFilter, setActiveFilter] = useState<
    "todos" | "pendientes" | "completados"
  >("pendientes");
  const [formAbierto, setFormAbierto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form states
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rawItems =
    useLiveQuery(() =>
      db.comentarios_proyecto
        .where("proyectoId")
        .equals(proyectoId)
        .sortBy("creadoEn")
    ) || [];

  const items = (rawItems as any[]).map((item) => ({
    id: item.id,
    proyectoId: item.proyectoId,
    autor: item.autor || "Mariano",
    titulo: item.titulo || "Mejora sin título",
    texto: item.texto || "",
    fecha: item.fecha || "",
    creadoEn: item.creadoEn || 0,
    completado: !!item.completado,
    fechaCompletado: item.fechaCompletado || null,
  })) as GarantiaItem[];

  const totalPendientes = items.filter((i) => !i.completado).length;
  const totalCompletados = items.filter((i) => i.completado).length;

  const filteredItems = items.filter((item) => {
    if (activeFilter === "pendientes") return !item.completado;
    if (activeFilter === "completados") return item.completado;
    return true;
  });

  const handleSave = async () => {
    if (!titulo.trim() || !texto.trim()) {
      mostrarToast("Completa el título y la descripción.", "error");
      return;
    }

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

      if (editId) {
        // Edit mode
        await db.comentarios_proyecto.update(editId, {
          titulo: titulo.trim(),
          texto: texto.trim(),
        });
        mostrarToast("Garantía/Mejora actualizada con éxito.", "exito");
      } else {
        // Add mode
        const item = {
          id: `gm_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          proyectoId,
          autor: "Mariano",
          titulo: titulo.trim(),
          texto: texto.trim(),
          fecha: formatFecha,
          creadoEn: Date.now(),
          completado: false,
          fechaCompletado: null,
        };
        await db.comentarios_proyecto.add(item);
        mostrarToast("Garantía/Mejora registrada con éxito.", "exito");
      }

      setFormAbierto(false);
      setEditId(null);
      setTitulo("");
      setTexto("");
    } catch (err: any) {
      mostrarToast(`Error al guardar: ${err.message}`, "error");
    }
  };

  const handleEdit = (item: GarantiaItem) => {
    setEditId(item.id);
    setTitulo(item.titulo);
    setTexto(item.texto);
    setFormAbierto(true);
  };

  const handleToggleCompletado = async (item: GarantiaItem) => {
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

      const nextStatus = !item.completado;
      await db.comentarios_proyecto.update(item.id, {
        completado: nextStatus,
        fechaCompletado: nextStatus ? formatFecha : null,
      });

      mostrarToast(
        nextStatus ? "Mejora completada con éxito." : "Mejora reabierta.",
        "exito"
      );
    } catch (err: any) {
      mostrarToast(err.message, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (
      confirm(
        "¿Estás seguro de que deseas eliminar este ítem de Garantía/Mejora?"
      )
    ) {
      try {
        await db.comentarios_proyecto.delete(id);
        mostrarToast("Ítem eliminado.", "info");
      } catch (err: any) {
        mostrarToast(err.message, "error");
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header card info */}
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2A2E] pb-3">
          <div>
            <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
              Garantías y Control de Mejoras Post-Entrega
            </h3>
            <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
              Registra ajustes, errores post-venta o solicitudes de mejora en
              formato Markdown.
            </p>
          </div>
          {!formAbierto && (
            <button
              onClick={() => {
                setFormAbierto(true);
                setEditId(null);
                setTitulo("");
                setTexto("");
              }}
              className="hover:bg-emerald-450 rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase"
            >
              + Agregar Garantía
            </button>
          )}
        </div>

        {/* Filter controls */}
        {!formAbierto && (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-900 pb-2">
            <div className="flex gap-1.5">
              <button
                onClick={() => setActiveFilter("pendientes")}
                className={`rounded px-2.5 py-1 font-mono text-[9px] font-bold uppercase transition-all ${
                  activeFilter === "pendientes"
                    ? "bg-zinc-800 text-emerald-400"
                    : "text-zinc-400 hover:bg-zinc-900"
                }`}
              >
                Pendientes ({totalPendientes})
              </button>
              <button
                onClick={() => setActiveFilter("completados")}
                className={`rounded px-2.5 py-1 font-mono text-[9px] font-bold uppercase transition-all ${
                  activeFilter === "completados"
                    ? "bg-zinc-800 text-emerald-400"
                    : "text-zinc-400 hover:bg-zinc-900"
                }`}
              >
                Completadas ({totalCompletados})
              </button>
              <button
                onClick={() => setActiveFilter("todos")}
                className={`rounded px-2.5 py-1 font-mono text-[9px] font-bold uppercase transition-all ${
                  activeFilter === "todos"
                    ? "bg-zinc-800 text-emerald-400"
                    : "text-zinc-400 hover:bg-zinc-900"
                }`}
              >
                Todas ({items.length})
              </button>
            </div>
          </div>
        )}

        {/* Form view */}
        {formAbierto && (
          <div className="grid grid-cols-1 gap-4 border-t border-zinc-900 pt-4 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
                {editId
                  ? "✍️ Editar Ítem de Garantía"
                  : "📝 Registrar Ajuste / Garantía"}
              </span>

              <div className="flex flex-col gap-1">
                <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                  Título del Ajuste
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Corregir redirección del botón de checkout"
                  className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                  Descripción (Markdown soportado)
                </label>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder={`Ej:
### Contexto
El botón de checkout no redirige al webhook de éxito.

### Tareas
- [ ] Validar variables de entorno en producción.
- [ ] Probar callback de pasarela.`}
                  rows={8}
                  className="border-zinc-850 w-full resize-none rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex-1 rounded bg-emerald-500 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-emerald-400"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setFormAbierto(false)}
                  className="flex-1 rounded border border-zinc-800 bg-zinc-900 py-1.5 font-mono text-[9px] font-bold text-zinc-400 uppercase hover:text-zinc-200"
                >
                  Cancelar
                </button>
              </div>
            </div>

            {/* Markdown Live Preview column */}
            <div className="flex max-h-[350px] flex-col gap-2 overflow-y-auto rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
              <span className="border-b border-zinc-900 pb-1 font-mono text-[8px] font-bold text-zinc-500 uppercase">
                🖥️ Vista Previa (Renderizado Live)
              </span>
              {texto.trim() ? (
                <div
                  className="prose prose-invert font-mono text-xs"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(texto) }}
                />
              ) : (
                <p className="text-zinc-650 py-12 text-center font-mono text-[8px] italic">
                  Escribe en el panel izquierdo para previsualizar el render de
                  Markdown.
                </p>
              )}
            </div>
          </div>
        )}

        {/* List view items */}
        {!formAbierto && (
          <div className="mt-3 flex flex-col gap-2">
            {filteredItems.length === 0 ? (
              <p className="text-zinc-550 py-12 text-center font-mono text-[9px]">
                No hay ítems registrados en este filtro.
              </p>
            ) : (
              filteredItems.map((item) => {
                const isExpanded = expandedId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`flex flex-col rounded-xl border bg-zinc-950/20 transition-all ${
                      item.completado
                        ? "border-zinc-900 bg-zinc-950/10 opacity-70"
                        : "border-zinc-850 hover:border-zinc-800"
                    }`}
                  >
                    {/* Collapsed top bar */}
                    <div className="flex items-center justify-between gap-3 p-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={item.completado}
                          onChange={() => handleToggleCompletado(item)}
                          className="h-3.5 w-3.5 cursor-pointer rounded border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-0"
                        />
                        <span
                          className={`truncate font-mono text-[10px] font-bold ${
                            item.completado
                              ? "text-zinc-500 line-through"
                              : "text-zinc-200"
                          }`}
                        >
                          {item.titulo}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-zinc-550 font-mono text-[8px]">
                          {item.fecha}
                        </span>
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : item.id)
                          }
                          className="shrink-0 font-mono text-[8px] text-emerald-400 hover:underline"
                        >
                          {isExpanded ? "[Ocultar]" : "[Detalles]"}
                        </button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="flex flex-col gap-3 border-t border-zinc-900 bg-zinc-950/40 p-3.5 font-mono text-[10px]">
                        <div
                          className="prose prose-invert border-b border-zinc-900 pb-3"
                          dangerouslySetInnerHTML={{
                            __html: parseMarkdown(item.texto),
                          }}
                        />
                        <div className="text-zinc-550 flex flex-wrap items-center justify-between gap-2 text-[8px]">
                          <div>
                            <span>Registrado por: </span>
                            <span className="font-bold text-emerald-400">
                              {item.autor}
                            </span>
                            {item.completado && item.fechaCompletado && (
                              <span className="ml-2 text-emerald-400">
                                ✓ Completado el {item.fechaCompletado}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="font-bold text-sky-400 hover:text-sky-300"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="font-bold text-red-400 hover:text-red-300"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
