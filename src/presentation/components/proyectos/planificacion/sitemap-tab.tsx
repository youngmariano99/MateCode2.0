"use client";

import React from "react";

interface SitemapTabProps {
  sitemapMode: "landing" | "sistema";
  setSitemapMode: (mode: "landing" | "sistema") => void;
  sitemapSystemMarkdown: string;
  setSitemapSystemMarkdown: (val: string) => void;
  sitemapMarkup: string;
  setSitemapMarkup: (val: string) => void;
  seccionesSitemap: Array<{ id: string; nombre: string; descripcion: string }>;
  copiarPromptSitemapLanding: () => void;
  handleProcesarMarkup: () => void;
  handleAgregarSeccionManual: () => void;
  handleActualizarSeccion: (
    id: string,
    field: "nombre" | "descripcion",
    value: string
  ) => void;
  handleEliminarSeccion: (id: string, name: string) => void;
  mostrarToast: (msg: string, tipo: "exito" | "error" | "info") => void;
}

const PROMPT_SITEMAP_SISTEMA = `Actúa como un Arquitecto de Información y UX Senior.
Genera el mapa de navegación y estructura de rutas (SITEMAP.md) para un sistema web/SaaS a partir del relevamiento.

INSTRUCCIONES Y ESTRUCTURA REQUERIDA (SITEMAP.md):
Genera un documento Markdown detallando:
1. **Mapa de Rutas del Sistema**: Listado jerárquico de carpetas y archivos Next.js App Router (ej: /dashboard/settings/page.tsx).
2. **Roles y Accesos por Ruta**: Indica qué roles de usuario pueden acceder a cada ruta.
3. **Flujos Clave**: Breve descripción del flujo operativo en las vistas principales.

Por favor, devuelve únicamente el contenido Markdown sin introducciones ni comentarios.`;

export const SitemapTab: React.FC<SitemapTabProps> = ({
  sitemapMode,
  setSitemapMode,
  sitemapSystemMarkdown,
  setSitemapSystemMarkdown,
  sitemapMarkup,
  setSitemapMarkup,
  seccionesSitemap,
  copiarPromptSitemapLanding,
  handleProcesarMarkup,
  handleAgregarSeccionManual,
  handleActualizarSeccion,
  handleEliminarSeccion,
  mostrarToast,
}) => {
  return (
    <div className="flex flex-col gap-5">
      {/* Sitemap Mode Selector */}
      <div className="flex gap-2 rounded-xl border border-zinc-900 bg-zinc-950/40 p-2">
        <button
          type="button"
          onClick={() => setSitemapMode("sistema")}
          className={`flex-1 rounded py-1.5 font-mono text-[9px] font-bold uppercase transition-all ${
            sitemapMode === "sistema"
              ? "bg-sky-500 font-black text-zinc-950 shadow"
              : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Estructura de Rutas del Sistema (Next.js SaaS)
        </button>
        <button
          type="button"
          onClick={() => setSitemapMode("landing")}
          className={`flex-1 rounded py-1.5 font-mono text-[9px] font-bold uppercase transition-all ${
            sitemapMode === "landing"
              ? "bg-sky-500 font-black text-zinc-950 shadow"
              : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Secciones Visuales Landing Page
        </button>
      </div>

      {sitemapMode === "sistema" ? (
        <div className="flex flex-col gap-4">
          {/* Prompt Generator Banner for System Sitemap */}
          <div className="flex items-start justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-3">
            <div>
              <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                Generador de Sitemap del Sistema / SaaS (Rutas & Navegación)
              </span>
              <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
                Copia el prompt estructurado para que la IA diseñe el sitemap
                completo de rutas del software, mapeo de roles y accesos por
                ruta.
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(PROMPT_SITEMAP_SISTEMA);
                mostrarToast("Prompt de Sitemap del Sistema copiado.", "exito");
              }}
              className="shrink-0 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
            >
              📋 Copiar Prompt IA
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              Especificación de Rutas del Sistema (SITEMAP.md)
            </label>
            <textarea
              value={sitemapSystemMarkdown}
              onChange={(e) => setSitemapSystemMarkdown(e.target.value)}
              placeholder="Pega aquí la especificación Markdown del sitemap del sistema (rutas Next.js App Router)..."
              rows={15}
              className="border-zinc-850 w-full rounded border bg-zinc-950 p-3 font-mono text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Prompt Generator Banner */}
          <div className="flex items-start justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-3">
            <div>
              <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                Generador de Sitemap por Secciones con IA ({"{{SECCION}}"})
              </span>
              <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
                Copia el prompt estructurado para pasarle a la IA el
                Relevamiento + Copywriting de Marca + Inspiración Visual. La IA
                te devolverá los bloques etiquetados con{" "}
                {"{{NOMBRE}} ... {{/NOMBRE}}"}.
              </p>
            </div>
            <button
              onClick={copiarPromptSitemapLanding}
              className="shrink-0 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
            >
              📋 Copiar Prompt IA Sitemap
            </button>
          </div>

          {/* Tag Parser Area */}
          <div className="flex flex-col gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] font-bold text-sky-400 uppercase">
                Marcado Rápido con Etiquetas ({"{{HERO}}"})
              </span>
              <span className="font-mono text-[8px] text-zinc-500">
                Formato: {"{{SECCION}} Descripción de la sección {{/SECCION}}"}
              </span>
            </div>
            <textarea
              value={sitemapMarkup}
              onChange={(e) => setSitemapMarkup(e.target.value)}
              placeholder={`Ejemplo:\n{{HERO}}\nTítulo de alto impacto, CTA de contacto y video de fondo.\n{{/HERO}}\n\n{{SERVICIOS}}\nTarjetas con los 4 servicios principales.\n{{/SERVICIOS}}`}
              rows={5}
              className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-300 outline-none"
            />
            <button
              type="button"
              onClick={handleProcesarMarkup}
              className="self-end rounded bg-sky-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-sky-400"
            >
              ⚡ Procesar Marcado {"{{SECCION}}"}
            </button>
          </div>

          {/* Dynamic Section Cards List */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                Estructura de Secciones ({seccionesSitemap.length})
              </span>
              <button
                onClick={handleAgregarSeccionManual}
                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
              >
                + Agregar Sección Manual
              </button>
            </div>

            {seccionesSitemap.length === 0 ? (
              <div className="border-zinc-850 rounded-xl border border-dashed bg-zinc-950/40 p-8 text-center">
                <p className="font-mono text-[10px] text-zinc-500">
                  No hay secciones definidas aún. Copia el prompt para la IA,
                  pega el marcado con etiquetas o presiona &quot;+ Agregar
                  Sección Manual&quot;.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {seccionesSitemap.map((sec) => (
                  <div
                    key={sec.id}
                    className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-zinc-950/60 p-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-zinc-900 pb-2">
                      <div className="flex flex-1 items-center gap-2">
                        <span className="font-mono text-[9px] font-bold text-emerald-400 uppercase">
                          {"{{"}
                        </span>
                        <input
                          type="text"
                          value={sec.nombre}
                          onChange={(e) =>
                            handleActualizarSeccion(
                              sec.id,
                              "nombre",
                              e.target.value.toUpperCase()
                            )
                          }
                          className="max-w-[280px] flex-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[10px] font-bold text-zinc-100 outline-none"
                        />
                        <span className="font-mono text-[9px] font-bold text-emerald-400 uppercase">
                          {"}}"}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          handleEliminarSeccion(sec.id, sec.nombre)
                        }
                        className="font-mono text-[9px] text-red-400 underline hover:text-red-300"
                      >
                        × Eliminar Sección
                      </button>
                    </div>

                    <textarea
                      value={sec.descripcion}
                      onChange={(e) =>
                        handleActualizarSeccion(
                          sec.id,
                          "descripcion",
                          e.target.value
                        )
                      }
                      placeholder="Descripción detallada e indicaciones de lo que incluye esta sección..."
                      rows={3}
                      className="border-zinc-850 w-full rounded border bg-zinc-900 p-2 font-mono text-[10px] text-zinc-300 outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
