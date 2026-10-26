"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { useToast } from "../../hooks/useToast";
import { GestionarProcedimientosUseCase } from "../../../application/use-cases/personal/gestionar-procedimientos.use-case";
import { EjecutarProcedimientoUseCase } from "../../../application/use-cases/personal/ejecutar-procedimiento.use-case";
import { GestionarActividadesUseCase } from "../../../application/use-cases/personal/gestionar-actividades.use-case";
import { generarPromptProcedimiento } from "../../../domain/prompts/generar-prompt-jerarquia-personal";
import {
  CATEGORIAS_PROCEDIMIENTO,
  type CategoriaProcedimiento,
  type Procedimiento,
} from "../../../domain/entidades/procedimiento.entity";

const procedimientosUseCase = new GestionarProcedimientosUseCase();
const ejecutarUseCase = new EjecutarProcedimientoUseCase();
const actividadesUseCase = new GestionarActividadesUseCase();

interface ModalCatalogoProcedimientosProps {
  abierto: boolean;
  onCerrar: () => void;
  clienteFiltroId?: string;
}

const CATEGORIA_LABELS: Record<CategoriaProcedimiento, string> = {
  contacto_frio: "Contacto en Frío",
  estudio: "Estudio & Aprendizaje",
  desarrollo: "Desarrollo de Software",
  servicio_cliente: "Servicio a Cliente",
  operaciones: "Operaciones",
  personal: "Personal",
  general: "General",
};

interface ClienteOpcion {
  id: string;
  nombre: string;
  empresa?: string;
}

export const ModalCatalogoProcedimientos: React.FC<
  ModalCatalogoProcedimientosProps
> = ({ abierto, onCerrar, clienteFiltroId }) => {
  const { mostrarToast } = useToast();

  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<
    CategoriaProcedimiento | "todas"
  >("todas");
  const [modoCreacion, setModoCreacion] = useState(false);
  const [modoIA, setModoIA] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // Formulario de creación
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [nuevaCategoria, setNuevaCategoria] =
    useState<CategoriaProcedimiento>("general");
  const [nuevoClienteId, setNuevoClienteId] = useState<string>(
    clienteFiltroId ?? ""
  );
  const [pasosNuevos, setPasosNuevos] = useState<
    {
      titulo: string;
      descripcion?: string;
      esObligatorio: boolean;
      duracionEstimadaMin?: number;
    }[]
  >([{ titulo: "", esObligatorio: true }]);

  // Modo IA
  const [temaIA, setTemaIA] = useState("");
  const [jsonImportar, setJsonImportar] = useState("");
  const [promptGenerado, setPromptGenerado] = useState("");

  // Clientes para dropdown
  const rawClientes = useLiveQuery(() => db.clientes.toArray(), []) ?? [];
  const clientes = rawClientes as unknown as ClienteOpcion[];

  // Consulta en vivo de procedimientos
  const procedimientos =
    useLiveQuery<Procedimiento[]>(async () => {
      return procedimientosUseCase.listar({
        categoria:
          categoriaSeleccionada === "todas" ? undefined : categoriaSeleccionada,
        clienteId: clienteFiltroId,
        busqueda: busqueda.trim() || undefined,
        soloActivos: false,
      });
    }, [categoriaSeleccionada, clienteFiltroId, busqueda]) ?? [];

  if (!abierto) return null;

  const agregarPasoVacio = () => {
    setPasosNuevos((prev) => [...prev, { titulo: "", esObligatorio: true }]);
  };

  const quitarPaso = (index: number) => {
    setPasosNuevos((prev) => prev.filter((_, i) => i !== index));
  };

  const actualizarPaso = (
    index: number,
    cambios: Partial<(typeof pasosNuevos)[0]>
  ) => {
    setPasosNuevos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...cambios } : p))
    );
  };

  const guardarNuevoProcedimiento = async () => {
    if (!nuevoTitulo.trim()) {
      mostrarToast("Ponele un título al procedimiento.", "error");
      return;
    }
    const pasosValidos = pasosNuevos.filter((p) => p.titulo.trim().length > 0);
    if (pasosValidos.length === 0) {
      mostrarToast("Agregá al menos un paso al procedimiento.", "error");
      return;
    }

    setProcesando(true);
    const res = await procedimientosUseCase.crearProcedimiento({
      titulo: nuevoTitulo.trim(),
      descripcion: nuevaDescripcion.trim() || undefined,
      categoria: nuevaCategoria,
      clienteId: nuevoClienteId || undefined,
      pasos: pasosValidos.map((p, idx) => ({
        orden: idx + 1,
        titulo: p.titulo.trim(),
        descripcion: p.descripcion?.trim() || undefined,
        esObligatorio: p.esObligatorio,
        duracionEstimadaMin: p.duracionEstimadaMin,
      })),
    });
    setProcesando(false);

    if (!res.ok) {
      mostrarToast(res.error!.mensaje, "error");
    } else {
      mostrarToast("Procedimiento guardado con éxito.", "exito");
      setModoCreacion(false);
      setNuevoTitulo("");
      setNuevaDescripcion("");
      setPasosNuevos([{ titulo: "", esObligatorio: true }]);
    }
  };

  const activarParaHoy = async (proc: Procedimiento) => {
    setProcesando(true);
    const hoy = new Date().toISOString().slice(0, 10);

    // 1. Crear actividad diaria en el Búnker
    const actRes = await actividadesUseCase.crearActividad({
      descripcion: `${proc.titulo}`,
      tipo: proc.categoria === "desarrollo" ? "enfoque" : "mantenimiento",
      diaTarea: hoy,
      procedimientoId: proc.id,
    });

    if (!actRes.ok) {
      setProcesando(false);
      mostrarToast(actRes.error!.mensaje, "error");
      return;
    }

    // 2. Iniciar la ejecución ligada a la actividad creada
    const ejecRes = await ejecutarUseCase.iniciarEjecucion({
      procedimientoId: proc.id,
      actividadId: actRes.valor!,
      clienteId: proc.clienteId,
      diaTarea: hoy,
    });
    setProcesando(false);

    if (!ejecRes.ok) {
      mostrarToast(ejecRes.error!.mensaje, "error");
    } else {
      mostrarToast(
        `Procedimiento "${proc.titulo}" activado en el Búnker de Hoy.`,
        "exito"
      );
      onCerrar();
    }
  };

  const eliminarProcedimiento = async (id: string) => {
    if (!confirm("¿Seguro que querés eliminar este procedimiento?")) return;
    setProcesando(true);
    const res = await procedimientosUseCase.eliminarProcedimiento(id);
    setProcesando(false);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
    else mostrarToast("Procedimiento eliminado.", "info");
  };

  const generarPromptIA = () => {
    if (!temaIA.trim()) {
      mostrarToast("Escribí el tema del procedimiento para la IA.", "error");
      return;
    }
    const prompt = generarPromptProcedimiento({
      tema: temaIA.trim(),
      categoria: nuevaCategoria,
      clienteNombre: clientes.find((c) => c.id === nuevoClienteId)?.nombre,
    });
    setPromptGenerado(prompt);
  };

  const procesarImportacionIA = async () => {
    if (!jsonImportar.trim()) {
      mostrarToast("Pegá el JSON devuelto por la IA.", "error");
      return;
    }
    try {
      const parsed = JSON.parse(jsonImportar);
      setProcesando(true);
      const res = await procedimientosUseCase.importarProcedimientos(parsed);
      setProcesando(false);
      if (!res.ok) {
        mostrarToast(res.error!.mensaje, "error");
      } else {
        mostrarToast(
          `Importación exitosa: ${res.valor!.creados} creados, ${
            res.valor!.omitidos
          } ya existían.`,
          "exito"
        );
        setModoIA(false);
        setJsonImportar("");
        setPromptGenerado("");
      }
    } catch {
      setProcesando(false);
      mostrarToast("El texto pegado no es un JSON válido.", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#2A2A2E] bg-[#0E0E11] shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-[#2A2A2E] bg-[#141418] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 font-bold text-emerald-400">
              📋
            </span>
            <div>
              <h2 className="text-base font-bold text-zinc-100">
                Catálogo de Procedimientos (SOPs)
              </h2>
              <p className="text-xs text-zinc-400">
                Plantillas de pasos repetibles para trabajo, estudio,
                prospección y servicios a clientes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!modoCreacion && !modoIA && (
              <>
                <button
                  type="button"
                  onClick={() => setModoIA(true)}
                  className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-300 transition-colors hover:bg-violet-500/20"
                >
                  ✨ Crear con IA
                </button>
                <button
                  type="button"
                  onClick={() => setModoCreacion(true)}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 transition-colors hover:bg-emerald-500/20"
                >
                  + Nuevo Procedimiento
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:text-zinc-200"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenido según modo */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* MODO CREACIÓN MANUAL */}
          {modoCreacion && (
            <div className="space-y-4 rounded-xl border border-[#2A2A2E] bg-[#141418] p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-emerald-400">
                  Nuevo Procedimiento Estandarizado
                </h3>
                <button
                  type="button"
                  onClick={() => setModoCreacion(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-zinc-400">
                    Título del Procedimiento *
                  </label>
                  <input
                    type="text"
                    value={nuevoTitulo}
                    onChange={(e) => setNuevoTitulo(e.target.value)}
                    placeholder="Ej: Contacto en Frío LinkedIn, Revisión de PRs..."
                    className="w-full rounded-lg border border-[#2A2A2E] bg-[#0E0E11] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-zinc-400">
                    Categoría
                  </label>
                  <select
                    value={nuevaCategoria}
                    onChange={(e) =>
                      setNuevaCategoria(
                        e.target.value as CategoriaProcedimiento
                      )
                    }
                    className="w-full rounded-lg border border-[#2A2A2E] bg-[#0E0E11] px-3 py-2 text-xs text-zinc-100 outline-none focus:border-emerald-500/50"
                  >
                    {CATEGORIAS_PROCEDIMIENTO.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORIA_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold text-zinc-400">
                  Cliente Asociado (Opcional)
                </label>
                <select
                  value={nuevoClienteId}
                  onChange={(e) => setNuevoClienteId(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2E] bg-[#0E0E11] px-3 py-2 text-xs text-zinc-100 outline-none focus:border-emerald-500/50"
                >
                  <option value="">
                    Ninguno (Procedimiento General / Interno)
                  </option>
                  {clientes.map((cli) => (
                    <option key={cli.id} value={cli.id}>
                      {cli.nombre} {cli.empresa ? `(${cli.empresa})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold text-zinc-400">
                  Descripción u Objetivo
                </label>
                <textarea
                  value={nuevaDescripcion}
                  onChange={(e) => setNuevaDescripcion(e.target.value)}
                  rows={2}
                  placeholder="Explica brevemente cuándo se usa este procedimiento y qué busca lograr..."
                  className="w-full rounded-lg border border-[#2A2A2E] bg-[#0E0E11] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Lista de Pasos Dinámica */}
              <div className="space-y-2 border-t border-[#2A2A2E] pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">
                    Pasos a Seguir (Checklist)
                  </label>
                  <button
                    type="button"
                    onClick={agregarPasoVacio}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300"
                  >
                    + Agregar Paso
                  </button>
                </div>

                <div className="space-y-2">
                  {pasosNuevos.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-lg border border-[#2A2A2E] bg-[#0E0E11] p-2"
                    >
                      <span className="w-5 text-center font-mono text-xs font-bold text-zinc-500">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={p.titulo}
                        onChange={(e) =>
                          actualizarPaso(idx, { titulo: e.target.value })
                        }
                        placeholder={`Paso ${idx + 1}...`}
                        className="flex-1 rounded border border-[#2A2A2E] bg-[#141418] px-2.5 py-1 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-500/50"
                      />
                      <input
                        type="number"
                        min="1"
                        value={p.duracionEstimadaMin ?? ""}
                        onChange={(e) =>
                          actualizarPaso(idx, {
                            duracionEstimadaMin: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="Minutos"
                        className="w-20 rounded border border-[#2A2A2E] bg-[#141418] px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-500/50"
                      />
                      <label className="flex cursor-pointer items-center gap-1 text-[11px] text-zinc-400">
                        <input
                          type="checkbox"
                          checked={p.esObligatorio}
                          onChange={(e) =>
                            actualizarPaso(idx, {
                              esObligatorio: e.target.checked,
                            })
                          }
                          className="rounded border-[#2A2A2E] text-emerald-500"
                        />
                        Obligatorio
                      </label>
                      {pasosNuevos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => quitarPaso(idx)}
                          className="p-1 text-zinc-500 hover:text-red-400"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModoCreacion(false)}
                  className="rounded-lg border border-[#2A2A2E] px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-[#222226]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={procesando}
                  onClick={() => void guardarNuevoProcedimiento()}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
                >
                  Guardar Procedimiento
                </button>
              </div>
            </div>
          )}

          {/* MODO ASISTENTE IA */}
          {modoIA && (
            <div className="space-y-4 rounded-xl border border-violet-500/20 bg-[#141418] p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-violet-300">
                  Generar Procedimiento con IA
                </h3>
                <button
                  type="button"
                  onClick={() => setModoIA(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Volver al Catálogo
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={temaIA}
                  onChange={(e) => setTemaIA(e.target.value)}
                  placeholder="Ej: Prospección en frío para agencia de software, Despliegue en VPS..."
                  className="flex-1 rounded-lg border border-[#2A2A2E] bg-[#0E0E11] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500/50"
                />
                <button
                  type="button"
                  onClick={generarPromptIA}
                  className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs font-bold text-violet-300 hover:bg-violet-500/20"
                >
                  Generar Prompt
                </button>
              </div>

              {promptGenerado && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>
                      Copiá este prompt y pegalo en tu LLM (Claude, ChatGPT,
                      etc.):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(promptGenerado);
                        mostrarToast(
                          "Prompt copiado al portapapeles.",
                          "exito"
                        );
                      }}
                      className="font-bold text-violet-400 hover:underline"
                    >
                      Copiar Prompt 📋
                    </button>
                  </div>
                  <pre className="max-h-40 overflow-y-auto rounded-lg border border-[#2A2A2E] bg-[#0A0A0C] p-3 font-mono text-[10px] text-zinc-300">
                    {promptGenerado}
                  </pre>
                </div>
              )}

              <div className="space-y-2 border-t border-[#2A2A2E] pt-2">
                <label className="block text-[11px] font-bold text-zinc-300">
                  Pegá acá el JSON devuelto por la IA para crearlo
                  automáticamente:
                </label>
                <textarea
                  value={jsonImportar}
                  onChange={(e) => setJsonImportar(e.target.value)}
                  rows={4}
                  placeholder='{"procedimientosNuevos": [...]}'
                  className="w-full rounded-lg border border-[#2A2A2E] bg-[#0E0E11] px-3 py-2 font-mono text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500/50"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={procesando}
                    onClick={() => void procesarImportacionIA()}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
                  >
                    Importar al Catálogo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* LISTA Y FILTROS DEL CATÁLOGO */}
          {!modoCreacion && !modoIA && (
            <>
              {/* Barra de Filtros */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar procedimiento por título o paso..."
                  className="min-w-[220px] flex-1 rounded-xl border border-[#2A2A2E] bg-[#141418] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500/50"
                />

                <select
                  value={categoriaSeleccionada}
                  onChange={(e) =>
                    setCategoriaSeleccionada(
                      e.target.value as CategoriaProcedimiento | "todas"
                    )
                  }
                  className="rounded-xl border border-[#2A2A2E] bg-[#141418] px-3 py-2 text-xs text-zinc-100 outline-none focus:border-emerald-500/50"
                >
                  <option value="todas">Todas las categorías</option>
                  {CATEGORIAS_PROCEDIMIENTO.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORIA_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid de Procedimientos */}
              {procedimientos.length === 0 ? (
                <div className="py-12 text-center text-zinc-500">
                  <p className="text-sm">No se encontraron procedimientos.</p>
                  <p className="mt-1 text-xs">
                    Creá tu primer procedimiento con el botón &quot;+ Nuevo
                    Procedimiento&quot; o con IA.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {procedimientos.map((proc) => {
                    const cliAsociado = clientes.find(
                      (c) => c.id === proc.clienteId
                    );
                    const duracionTotal = proc.pasos.reduce(
                      (acc, p) => acc + (p.duracionEstimadaMin ?? 0),
                      0
                    );

                    return (
                      <div
                        key={proc.id}
                        className="flex flex-col justify-between rounded-xl border border-[#2A2A2E] bg-[#121215] p-4 transition-all hover:border-[#38383E]"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                                {CATEGORIA_LABELS[proc.categoria]}
                              </span>
                              <h4 className="mt-0.5 text-sm font-bold text-zinc-100">
                                {proc.titulo}
                              </h4>
                            </div>

                            {cliAsociado && (
                              <span className="max-w-[120px] truncate rounded border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[9px] font-bold text-sky-400">
                                {cliAsociado.nombre}
                              </span>
                            )}
                          </div>

                          {proc.descripcion && (
                            <p className="line-clamp-2 text-xs text-zinc-400">
                              {proc.descripcion}
                            </p>
                          )}

                          {/* Pasos en miniatura */}
                          <div className="space-y-1 rounded-lg border border-[#2A2A2E]/50 bg-[#0E0E11] p-2 text-[11px] text-zinc-400">
                            <span className="block text-[10px] font-bold text-zinc-500">
                              {proc.pasos.length} pasos configurados
                              {duracionTotal > 0 && ` • ~${duracionTotal} min`}
                            </span>
                            <div className="space-y-0.5">
                              {proc.pasos.slice(0, 3).map((p, idx) => (
                                <div
                                  key={idx}
                                  className="truncate text-zinc-300"
                                >
                                  • {p.titulo}
                                </div>
                              ))}
                              {proc.pasos.length > 3 && (
                                <span className="block text-[10px] text-zinc-500 italic">
                                  +{proc.pasos.length - 3} pasos más...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Pie de tarjeta con acciones */}
                        <div className="mt-4 flex items-center justify-between border-t border-[#2A2A2E]/60 pt-3 text-[10px] text-zinc-500">
                          <span>
                            Ejecutado {proc.vecesEjecutado}{" "}
                            {proc.vecesEjecutado === 1 ? "vez" : "veces"}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                void eliminarProcedimiento(proc.id)
                              }
                              className="rounded p-1 text-zinc-500 hover:text-red-400"
                              title="Eliminar procedimiento"
                            >
                              🗑
                            </button>
                            <button
                              type="button"
                              disabled={procesando}
                              onClick={() => void activarParaHoy(proc)}
                              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 transition-colors hover:bg-emerald-500/20"
                            >
                              ▶ Iniciar Hoy
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
