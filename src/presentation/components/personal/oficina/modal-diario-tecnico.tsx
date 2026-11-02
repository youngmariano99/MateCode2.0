"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "../../dialog";
import { Icono } from "../../icons";
import { Badge } from "../../badge";
import { Button } from "../../button";
import type { NoticiaNormalizada } from "../../../../app/api/noticias/route";

interface ModalDiarioTecnicoProps {
  abierto: boolean;
  onCerrar: () => void;
}

type RangoTiempo = "hoy" | "semana" | "mes" | "ano";
type CategoriaNoticia =
  "Todas" | "Programación e IA" | "Tecnología" | "Ciencia";

export const ModalDiarioTecnico: React.FC<ModalDiarioTecnicoProps> = ({
  abierto,
  onCerrar,
}) => {
  const [noticias, setNoticias] = useState<NoticiaNormalizada[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modoAhorro, setModoAhorro] = useState(true);
  const [rangoTiempo, setRangoTiempo] = useState<RangoTiempo>("hoy");
  const [categoria, setCategoria] = useState<CategoriaNoticia>("Todas");
  const [tagSeleccionado, setTagSeleccionado] = useState<string | null>(null);
  const [busquedaTexto, setBusquedaTexto] = useState("");
  const [avisoModo, setAvisoModo] = useState<string | null>(null);
  const [ahora] = useState(() => Date.now());

  const cargarNoticias = async (ahorro: boolean) => {
    setCargando(true);
    setAvisoModo(null);
    try {
      const res = await fetch("/api/noticias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modoAhorro: ahorro }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.noticias)) {
        setNoticias(data.noticias);
        if (data.aviso) setAvisoModo(data.aviso);
      }
    } catch {
      // Fallback silencioso si no hay conexión
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!abierto || noticias.length > 0) return;
    const timer = setTimeout(() => {
      void cargarNoticias(modoAhorro);
    }, 0);
    return () => clearTimeout(timer);
  }, [abierto, modoAhorro, noticias.length]);

  if (!abierto) return null;

  // Filtrado temporal
  const msPorHora = 3600000;
  const msPorDia = msPorHora * 24;

  const noticiasFiltradasPorTiempo = noticias.filter((n) => {
    const tiempoNoticia = new Date(n.publishedAt).getTime();
    const diferencia = ahora - tiempoNoticia;
    if (rangoTiempo === "hoy") return diferencia <= msPorDia * 1.5;
    if (rangoTiempo === "semana") return diferencia <= msPorDia * 7;
    if (rangoTiempo === "mes") return diferencia <= msPorDia * 30;
    return true;
  });

  // Filtrado por categoría, tag y texto
  const noticiasVisibles = noticiasFiltradasPorTiempo.filter((n) => {
    const coincideCat = categoria === "Todas" || n.category === categoria;
    const coincideTag = !tagSeleccionado || n.tags.includes(tagSeleccionado);
    const coincideTexto =
      !busquedaTexto.trim() ||
      n.title.toLowerCase().includes(busquedaTexto.toLowerCase()) ||
      n.aiSummary.toLowerCase().includes(busquedaTexto.toLowerCase());
    return coincideCat && coincideTag && coincideTexto;
  });

  // Tags disponibles en la vista actual
  const tagsDisponibles = Array.from(
    new Set(noticiasFiltradasPorTiempo.flatMap((n) => n.tags))
  );

  return (
    <Dialog
      abierto={abierto}
      onClose={onCerrar}
      titulo="Diario Técnico & Intelligence Feed"
      maxWidth="xl"
    >
      <div className="flex flex-col gap-4">
        {/* Barra superior de controles: Modo Ahorro y Actualizar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2A2A2E] pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const nuevoModo = !modoAhorro;
                setModoAhorro(nuevoModo);
                void cargarNoticias(nuevoModo);
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                modoAhorro
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-purple-500/30 bg-purple-500/10 text-purple-300"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  modoAhorro ? "bg-emerald-400" : "bg-purple-400"
                }`}
              />
              {modoAhorro ? "Modo Ahorro (0 Tokens)" : "Modo IA (Gemini 2.5)"}
            </button>
            <span className="hidden text-[11px] text-zinc-500 sm:inline">
              {modoAhorro
                ? "Resumen básico local instantáneo"
                : "Resúmenes técnicos ejecutivos con IA"}
            </span>
          </div>

          <Button
            variant="outline"
            onClick={() => void cargarNoticias(modoAhorro)}
            cargando={cargando}
            className="px-2.5 py-1 text-xs"
          >
            <Icono.Repeat className="mr-1 h-3.5 w-3.5" />
            Actualizar Feed
          </Button>
        </div>

        {avisoModo && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-400">
            {avisoModo}
          </div>
        )}

        {/* Selector de Rango Temporal */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Periodo:
          </span>
          {(
            [
              { id: "hoy", label: "🟢 Hoy (24h)" },
              { id: "semana", label: "🔵 Esta Semana" },
              { id: "mes", label: "🟡 Este Mes" },
              { id: "ano", label: "⚪ Todo el Año" },
            ] as const
          ).map((r) => (
            <button
              key={r.id}
              onClick={() => setRangoTiempo(r.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                rangoTiempo === r.id
                  ? "border border-zinc-700 bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Categorías Principales */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-[#2A2A2E] pt-2">
          {(
            [
              "Todas",
              "Programación e IA",
              "Tecnología",
              "Ciencia",
            ] as CategoriaNoticia[]
          ).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoria(cat)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                categoria === cat
                  ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Badges de Tags y Buscador */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {tagSeleccionado && (
              <button
                onClick={() => setTagSeleccionado(null)}
                className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400 uppercase"
              >
                Limpiar #{tagSeleccionado} ×
              </button>
            )}
            {tagsDisponibles.slice(0, 10).map((t) => (
              <button
                key={t}
                onClick={() =>
                  setTagSeleccionado(t === tagSeleccionado ? null : t)
                }
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                  tagSeleccionado === t
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                #{t}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Filtrar por palabra clave..."
            value={busquedaTexto}
            onChange={(e) => setBusquedaTexto(e.target.value)}
            className="w-44 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Listado de Tarjetas de Noticias */}
        <div className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
          {cargando && noticias.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              Cargando últimas noticias técnicas...
            </div>
          ) : noticiasVisibles.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No hay noticias que coincidan con los filtros seleccionados.
            </div>
          ) : (
            noticiasVisibles.map((noticia) => (
              <div
                key={noticia.id}
                className="flex flex-col gap-2 rounded-2xl border border-[#2A2A2E] bg-[#0D0D0F] p-4 transition-all hover:border-zinc-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-zinc-400 uppercase">
                      {noticia.source}
                    </span>
                    <Badge color="sky">{noticia.category}</Badge>
                    {noticia.score !== undefined && (
                      <span className="text-[10px] text-zinc-500">
                        ⭐ {noticia.score} pts
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-600">
                    {new Date(noticia.publishedAt).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>

                <a
                  href={noticia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-zinc-100 hover:text-emerald-400"
                >
                  {noticia.title}
                </a>

                <p className="text-xs leading-relaxed text-zinc-400">
                  {noticia.aiSummary}
                </p>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap gap-1">
                    {noticia.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-zinc-900 px-1.5 py-0.5 text-[9px] text-zinc-500"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <a
                    href={noticia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
                  >
                    Leer original ↗
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
};
