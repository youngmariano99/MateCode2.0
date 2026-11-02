"use client";

import React, { useState, useEffect, useMemo } from "react";
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

const TAGS_INICIALES_DEFAULT = [
  "IA",
  "Python",
  "React",
  "Rust",
  "Cloud",
  "Seguridad",
];

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

  // Gestión de etiquetas personalizadas del usuario (persistidas en localStorage)
  const [misTags, setMisTags] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const guardados = localStorage.getItem(
          "matecode_diario_tags_favoritos"
        );
        if (guardados) return JSON.parse(guardados);
      } catch {
        // Fallback a default
      }
    }
    return TAGS_INICIALES_DEFAULT;
  });

  const [nuevoTagInput, setNuevoTagInput] = useState("");
  const [mostrarGestorTags, setMostrarGestorTags] = useState(false);

  // Noticia en modo de edición manual de tags
  const [editandoNoticiaId, setEditandoNoticiaId] = useState<string | null>(
    null
  );
  const [tagParaAgregarNoticia, setTagParaAgregarNoticia] = useState("");

  const guardarMisTags = (nuevos: string[]) => {
    setMisTags(nuevos);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "matecode_diario_tags_favoritos",
        JSON.stringify(nuevos)
      );
    }
  };

  const agregarTagPersonalizado = () => {
    const limpio = nuevoTagInput.trim().replace(/^#/, "");
    if (!limpio) return;
    if (!misTags.includes(limpio)) {
      const actualizados = [...misTags, limpio];
      guardarMisTags(actualizados);
    }
    setNuevoTagInput("");
  };

  const eliminarTagPersonalizado = (tagAEliminar: string) => {
    const actualizados = misTags.filter((t) => t !== tagAEliminar);
    guardarMisTags(actualizados);
    if (tagSeleccionado === tagAEliminar) {
      setTagSeleccionado(null);
    }
  };

  const agregarTagANoticia = (noticiaId: string) => {
    const tagLimpio = tagParaAgregarNoticia.trim().replace(/^#/, "");
    if (!tagLimpio) return;
    setNoticias((prev) =>
      prev.map((n) => {
        if (n.id === noticiaId && !n.tags.includes(tagLimpio)) {
          return { ...n, tags: [...n.tags, tagLimpio] };
        }
        return n;
      })
    );
    setTagParaAgregarNoticia("");
  };

  const removerTagDeNoticia = (noticiaId: string, tagParaQuitar: string) => {
    setNoticias((prev) =>
      prev.map((n) => {
        if (n.id === noticiaId) {
          return { ...n, tags: n.tags.filter((t) => t !== tagParaQuitar) };
        }
        return n;
      })
    );
  };

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
      // Fallback silencioso
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

  // Filtrado temporal
  const msPorHora = 3600000;
  const msPorDia = msPorHora * 24;

  const noticiasFiltradasPorTiempo = useMemo(() => {
    return noticias.filter((n) => {
      const tiempoNoticia = new Date(n.publishedAt).getTime();
      const diferencia = ahora - tiempoNoticia;
      if (rangoTiempo === "hoy") return diferencia <= msPorDia * 1.5;
      if (rangoTiempo === "semana") return diferencia <= msPorDia * 7;
      if (rangoTiempo === "mes") return diferencia <= msPorDia * 30;
      return true;
    });
  }, [noticias, rangoTiempo, ahora, msPorDia]);

  // Filtrado por categoría, tag y texto
  const noticiasVisibles = useMemo(() => {
    return noticiasFiltradasPorTiempo.filter((n) => {
      const coincideCat = categoria === "Todas" || n.category === categoria;
      const coincideTag = !tagSeleccionado || n.tags.includes(tagSeleccionado);
      const coincideTexto =
        !busquedaTexto.trim() ||
        n.title.toLowerCase().includes(busquedaTexto.toLowerCase()) ||
        n.aiSummary.toLowerCase().includes(busquedaTexto.toLowerCase());
      return coincideCat && coincideTag && coincideTexto;
    });
  }, [noticiasFiltradasPorTiempo, categoria, tagSeleccionado, busquedaTexto]);

  // Tags detectados en las noticias actuales
  const tagsDetectadosEnNoticias = useMemo(() => {
    return Array.from(
      new Set(noticiasFiltradasPorTiempo.flatMap((n) => n.tags))
    );
  }, [noticiasFiltradasPorTiempo]);

  // Separación por Secciones Periodísticas
  const noticiaDePortada = useMemo(() => {
    if (noticiasVisibles.length === 0) return null;
    // La noticia con mayor score o la primera de la lista
    return [...noticiasVisibles].sort(
      (a, b) => (b.score || 0) - (a.score || 0)
    )[0];
  }, [noticiasVisibles]);

  const noticiasSecundarias = useMemo(() => {
    if (!noticiaDePortada) return [];
    return noticiasVisibles.filter((n) => n.id !== noticiaDePortada.id);
  }, [noticiasVisibles, noticiaDePortada]);

  const seccionProgramacion = useMemo(() => {
    return noticiasSecundarias.filter(
      (n) => n.category === "Programación e IA"
    );
  }, [noticiasSecundarias]);

  const seccionTecnologia = useMemo(() => {
    return noticiasSecundarias.filter((n) => n.category === "Tecnología");
  }, [noticiasSecundarias]);

  const seccionCiencia = useMemo(() => {
    return noticiasSecundarias.filter((n) => n.category === "Ciencia");
  }, [noticiasSecundarias]);

  if (!abierto) return null;

  const fechaEditorial = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Dialog abierto={abierto} onClose={onCerrar} maxWidth="6xl">
      <div className="flex flex-col gap-5 p-1 sm:p-2">
        {/* ============================================================ */}
        {/* 📰 CABECERA CLÁSICA DE PRENSA / NEWSPAPER MASTHEAD */}
        {/* ============================================================ */}
        <header className="flex flex-col items-center text-center">
          <div className="flex w-full items-center justify-between border-b border-zinc-800 pb-1.5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
            <span>The MateCode Chronicle • Edición Especial</span>
            <span className="hidden sm:inline">
              Tecnología, Algoritmos & Fronteras
            </span>
            <span>Vol. 2.0 • Año 2026</span>
          </div>

          <div className="py-3">
            <h1 className="font-serif text-3xl font-black tracking-tight text-zinc-100 sm:text-5xl">
              EL DIARIO TÉCNICO
            </h1>
            <p className="mt-1 font-mono text-[11px] tracking-widest text-zinc-400 uppercase">
              Inteligencia Diaria • Software Engineering • Redacción Ejecutiva
            </p>
          </div>

          {/* Cintillo de metadatos y fecha tipo rotativo */}
          <div className="flex w-full flex-wrap items-center justify-between gap-2 border-y-2 border-double border-zinc-700 py-2 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-300 capitalize">
                📅 {fechaEditorial}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="font-medium text-emerald-400">
                ● Edición Continua
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const nuevoModo = !modoAhorro;
                  setModoAhorro(nuevoModo);
                  void cargarNoticias(nuevoModo);
                }}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all ${
                  modoAhorro
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-purple-500/30 bg-purple-500/10 text-purple-300"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    modoAhorro
                      ? "bg-emerald-400"
                      : "animate-pulse bg-purple-400"
                  }`}
                />
                {modoAhorro
                  ? "Modo Ahorro (0 Tokens)"
                  : "Modo IA (Gemini Flash)"}
              </button>

              <Button
                variant="outline"
                onClick={() => void cargarNoticias(modoAhorro)}
                cargando={cargando}
                className="px-2.5 py-1 text-xs"
              >
                <Icono.Repeat className="mr-1.5 h-3.5 w-3.5" />
                Actualizar Edición
              </Button>
            </div>
          </div>
        </header>

        {avisoModo && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-400">
            {avisoModo}
          </div>
        )}

        {/* ============================================================ */}
        {/* 🎛️ BARRA DE FILTROS EDITORIALES & SECCIONES */}
        {/* ============================================================ */}
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-[#121214] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Secciones temáticas del diario */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                Sección:
              </span>
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
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                    categoria === cat
                      ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-sm"
                      : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                  }`}
                >
                  {cat === "Todas" ? "📰 Todo el Diario" : cat}
                </button>
              ))}
            </div>

            {/* Rango temporal */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                Edición:
              </span>
              {(
                [
                  { id: "hoy", label: "Hoy (24h)" },
                  { id: "semana", label: "Semanal" },
                  { id: "mes", label: "Mensual" },
                  { id: "ano", label: "Histórico" },
                ] as const
              ).map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRangoTiempo(r.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    rangoTiempo === r.id
                      ? "border border-zinc-700 bg-zinc-800 font-semibold text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* ============================================================ */}
          {/* 🏷️ SISTEMA DE ETIQUETAS: FAVORITAS + EDICIÓN + BÚSQUEDA */}
          {/* ============================================================ */}
          <div className="flex flex-col gap-2 border-t border-zinc-800/80 pt-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                  Temas de Interés:
                </span>

                {tagSeleccionado && (
                  <button
                    onClick={() => setTagSeleccionado(null)}
                    className="flex items-center gap-1 rounded-md bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-300 transition-colors hover:bg-rose-500/30"
                  >
                    Filtrando por #{tagSeleccionado}
                    <span className="text-xs">×</span>
                  </button>
                )}

                {/* Tags favoritos del usuario */}
                {misTags.map((tag) => {
                  const estaActivo = tagSeleccionado === tag;
                  return (
                    <div
                      key={tag}
                      className={`group flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-all ${
                        estaActivo
                          ? "border border-emerald-500/40 bg-emerald-500/20 font-bold text-emerald-300"
                          : "border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      <button
                        onClick={() =>
                          setTagSeleccionado(estaActivo ? null : tag)
                        }
                      >
                        #{tag}
                      </button>
                      <button
                        title={`Eliminar #${tag} de mis temas`}
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarTagPersonalizado(tag);
                        }}
                        className="text-zinc-600 opacity-60 group-hover:opacity-100 hover:text-rose-400"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}

                <button
                  onClick={() => setMostrarGestorTags(!mostrarGestorTags)}
                  className="rounded-md border border-dashed border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                >
                  {mostrarGestorTags
                    ? "Cerrar panel tags"
                    : "+ Gestionar temas"}
                </button>
              </div>

              {/* Buscador libre */}
              <div className="relative w-full sm:w-56">
                <Icono.Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar en el diario..."
                  value={busquedaTexto}
                  onChange={(e) => setBusquedaTexto(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-1 pr-3 pl-8 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            {/* Panel desplegable para agregar nuevas etiquetas y explorar detectadas */}
            {mostrarGestorTags && (
              <div className="mt-1.5 flex flex-col gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-zinc-300">
                    Añadir nuevo tema de interés:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Ej: Docker, Next.js, Rust..."
                      value={nuevoTagInput}
                      onChange={(e) => setNuevoTagInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && agregarTagPersonalizado()
                      }
                      className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-500"
                    />
                    <Button
                      variant="primary"
                      onClick={agregarTagPersonalizado}
                      className="px-2.5 py-1 text-xs"
                    >
                      Agregar
                    </Button>
                  </div>
                </div>

                {tagsDetectadosEnNoticias.length > 0 && (
                  <div className="flex flex-col gap-1 border-t border-zinc-800/60 pt-2">
                    <span className="text-[11px] text-zinc-500">
                      Temas sugeridos detectados en los artículos de hoy (clic
                      para sumar a tus favoritos):
                    </span>
                    <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                      {tagsDetectadosEnNoticias.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            if (!misTags.includes(tag)) {
                              guardarMisTags([...misTags, tag]);
                            }
                            setTagSeleccionado(tag);
                          }}
                          className="rounded bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-emerald-400"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 📰 CUERPO DEL DIARIO ORGANIZADO EN SECCIONES */}
        {/* ============================================================ */}
        <div className="flex max-h-[62vh] flex-col gap-6 overflow-y-auto pr-1">
          {cargando && noticias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Icono.Repeat className="h-7 w-7 animate-spin text-emerald-400" />
              <p className="mt-3 text-sm text-zinc-400">
                Imprimiendo la edición del día con las últimas fuentes
                técnicas...
              </p>
            </div>
          ) : noticiasVisibles.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 py-12 text-center text-sm text-zinc-500">
              No hay noticias que coincidan con los filtros de esta sección.
            </div>
          ) : (
            <>
              {/* 🌟 1. NOTICIA DE PORTADA / LEAD STORY */}
              {noticiaDePortada && (
                <article className="relative overflow-hidden rounded-2xl border-2 border-zinc-800 bg-gradient-to-b from-[#141417] to-[#0D0D0F] p-5 shadow-xl transition-all hover:border-zinc-700">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-black tracking-wider text-rose-300 uppercase">
                        ★ Noticia de Portada
                      </span>
                      <Badge color="violet">{noticiaDePortada.category}</Badge>
                      <span className="text-[11px] text-zinc-500">
                        Fuente: {noticiaDePortada.source}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      {noticiaDePortada.score !== undefined && (
                        <span className="font-semibold text-amber-400">
                          ⭐ {noticiaDePortada.score} puntos HN
                        </span>
                      )}
                      <span>
                        {new Date(
                          noticiaDePortada.publishedAt
                        ).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <div className="lg:col-span-7">
                      <a
                        href={noticiaDePortada.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-block"
                      >
                        <h2 className="font-serif text-xl leading-snug font-bold text-zinc-100 transition-colors group-hover:text-emerald-400 sm:text-2xl">
                          {noticiaDePortada.title}
                        </h2>
                      </a>

                      <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                        {noticiaDePortada.aiSummary}
                      </p>
                    </div>

                    <div className="flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 lg:col-span-5">
                      <div>
                        <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                          Desglose Temático:
                        </span>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {noticiaDePortada.tags.map((t) => (
                            <button
                              key={t}
                              onClick={() => setTagSeleccionado(t)}
                              className="rounded bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-emerald-400/90 hover:bg-emerald-500/20"
                            >
                              #{t}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3">
                        <span className="text-[11px] text-zinc-500">
                          Lectura recomendada
                        </span>
                        <a
                          href={noticiaDePortada.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 transition-colors hover:text-emerald-300 hover:underline"
                        >
                          Leer artículo original
                          <span className="text-sm">↗</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </article>
              )}

              {/* 🏛️ 2. SECCIÓN: PROGRAMACIÓN E INTELIGENCIA ARTIFICIAL */}
              {seccionProgramacion.length > 0 &&
                (categoria === "Todas" ||
                  categoria === "Programación e IA") && (
                  <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-1.5">
                      <h3 className="font-serif text-lg font-bold tracking-tight text-zinc-100">
                        § SECCIÓN I: INGENIERÍA DE SOFTWARE & MODELOS DE IA
                      </h3>
                      <span className="font-mono text-[11px] text-zinc-500 uppercase">
                        {seccionProgramacion.length} Artículos
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {seccionProgramacion.map((item) => (
                        <TarjetaArticuloDiario
                          key={item.id}
                          noticia={item}
                          onFiltrarTag={(t) => setTagSeleccionado(t)}
                          editandoTags={editandoNoticiaId === item.id}
                          onToggleEditarTags={() =>
                            setEditandoNoticiaId(
                              editandoNoticiaId === item.id ? null : item.id
                            )
                          }
                          tagInput={tagParaAgregarNoticia}
                          onChangeTagInput={setTagParaAgregarNoticia}
                          onAgregarTag={() => agregarTagANoticia(item.id)}
                          onRemoverTag={(t) => removerTagDeNoticia(item.id, t)}
                        />
                      ))}
                    </div>
                  </section>
                )}

              {/* 💻 3. SECCIÓN: SISTEMAS & TECNOLOGÍA */}
              {seccionTecnologia.length > 0 &&
                (categoria === "Todas" || categoria === "Tecnología") && (
                  <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-1.5">
                      <h3 className="font-serif text-lg font-bold tracking-tight text-zinc-100">
                        § SECCIÓN II: INFRAESTRUCTURA, SISTEMAS & CLOUD
                      </h3>
                      <span className="font-mono text-[11px] text-zinc-500 uppercase">
                        {seccionTecnologia.length} Artículos
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {seccionTecnologia.map((item) => (
                        <TarjetaArticuloDiario
                          key={item.id}
                          noticia={item}
                          onFiltrarTag={(t) => setTagSeleccionado(t)}
                          editandoTags={editandoNoticiaId === item.id}
                          onToggleEditarTags={() =>
                            setEditandoNoticiaId(
                              editandoNoticiaId === item.id ? null : item.id
                            )
                          }
                          tagInput={tagParaAgregarNoticia}
                          onChangeTagInput={setTagParaAgregarNoticia}
                          onAgregarTag={() => agregarTagANoticia(item.id)}
                          onRemoverTag={(t) => removerTagDeNoticia(item.id, t)}
                        />
                      ))}
                    </div>
                  </section>
                )}

              {/* 🔬 4. SECCIÓN: CIENCIA & INVESTIGACIÓN */}
              {seccionCiencia.length > 0 &&
                (categoria === "Todas" || categoria === "Ciencia") && (
                  <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-1.5">
                      <h3 className="font-serif text-lg font-bold tracking-tight text-zinc-100">
                        § SECCIÓN III: CIENCIA & FRONTERAS TECNOLÓGICAS
                      </h3>
                      <span className="font-mono text-[11px] text-zinc-500 uppercase">
                        {seccionCiencia.length} Artículos
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {seccionCiencia.map((item) => (
                        <TarjetaArticuloDiario
                          key={item.id}
                          noticia={item}
                          onFiltrarTag={(t) => setTagSeleccionado(t)}
                          editandoTags={editandoNoticiaId === item.id}
                          onToggleEditarTags={() =>
                            setEditandoNoticiaId(
                              editandoNoticiaId === item.id ? null : item.id
                            )
                          }
                          tagInput={tagParaAgregarNoticia}
                          onChangeTagInput={setTagParaAgregarNoticia}
                          onAgregarTag={() => agregarTagANoticia(item.id)}
                          onRemoverTag={(t) => removerTagDeNoticia(item.id, t)}
                        />
                      ))}
                    </div>
                  </section>
                )}
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
};

// ====================================================================
// 🗞️ SUBCOMPONENTE: TARJETA DE ARTÍCULO EN COLUMNA PERIODÍSTICA
// ====================================================================
interface TarjetaArticuloProps {
  noticia: NoticiaNormalizada;
  onFiltrarTag: (tag: string) => void;
  editandoTags: boolean;
  onToggleEditarTags: () => void;
  tagInput: string;
  onChangeTagInput: (val: string) => void;
  onAgregarTag: () => void;
  onRemoverTag: (tag: string) => void;
}

const TarjetaArticuloDiario: React.FC<TarjetaArticuloProps> = ({
  noticia,
  onFiltrarTag,
  editandoTags,
  onToggleEditarTags,
  tagInput,
  onChangeTagInput,
  onAgregarTag,
  onRemoverTag,
}) => {
  return (
    <article className="flex flex-col justify-between rounded-xl border border-zinc-800/90 bg-[#101012] p-4 transition-all hover:border-zinc-700 hover:shadow-lg">
      <div className="flex flex-col gap-2">
        {/* Metadatos superiores */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <span className="font-semibold tracking-wider text-zinc-400 uppercase">
            {noticia.source}
          </span>
          <div className="flex items-center gap-2">
            {noticia.score !== undefined && (
              <span className="font-medium text-amber-400/90">
                ⭐ {noticia.score}
              </span>
            )}
            <span>
              {new Date(noticia.publishedAt).toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          </div>
        </div>

        {/* Titular */}
        <a
          href={noticia.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          <h4 className="font-serif text-base leading-snug font-bold text-zinc-100 transition-colors group-hover:text-emerald-400">
            {noticia.title}
          </h4>
        </a>

        {/* Resumen */}
        <p className="text-xs leading-relaxed text-zinc-400">
          {noticia.aiSummary}
        </p>
      </div>

      {/* Pie de artículo con tags y link */}
      <div className="mt-4 flex flex-col gap-2 border-t border-zinc-800/70 pt-2.5">
        <div className="flex flex-wrap items-center justify-between gap-1">
          {/* Tags interactivos */}
          <div className="flex flex-wrap items-center gap-1">
            {noticia.tags.map((tag) => (
              <span
                key={tag}
                className="group/tag inline-flex items-center gap-0.5 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-emerald-400"
              >
                <button onClick={() => onFiltrarTag(tag)}>#{tag}</button>
                {editandoTags && (
                  <button
                    onClick={() => onRemoverTag(tag)}
                    className="ml-0.5 text-zinc-600 hover:text-rose-400"
                    title={`Quitar #${tag}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}

            <button
              onClick={onToggleEditarTags}
              title="Editar etiquetas de este artículo"
              className="ml-1 text-[10px] text-zinc-600 hover:text-zinc-300"
            >
              {editandoTags ? "✓ Listo" : "✎"}
            </button>
          </div>

          <a
            href={noticia.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-emerald-400 hover:underline"
          >
            Leer nota ↗
          </a>
        </div>

        {/* Input para agregar tag si está en modo edición */}
        {editandoTags && (
          <div className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              placeholder="Nueva etiqueta..."
              value={tagInput}
              onChange={(e) => onChangeTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAgregarTag()}
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-200 outline-none"
            />
            <button
              onClick={onAgregarTag}
              className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300"
            >
              +
            </button>
          </div>
        )}
      </div>
    </article>
  );
};
