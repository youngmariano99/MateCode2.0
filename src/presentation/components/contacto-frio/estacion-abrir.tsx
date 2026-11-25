"use client";

import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Input, Textarea } from "../input";
import { Select } from "../select";
import { Badge } from "../badge";
import { Icono } from "../icons";
import { BotonPrompt, EnlacesProspecto, EstacionVacia } from "./piezas-cinta";
import { ahoraMs, OPCIONES_CANAL, type Canal } from "./utilidades-cinta";
import { useConfiguracionStore } from "../../stores/configuracion.store";
import { GestionarContactoFrioUseCase } from "../../../application/use-cases/crm/gestionar-contacto-frio.use-case";
import { inicioDelDia } from "../../../domain/entidades/contacto-frio-cinta.entity";
import { generarPromptApertura } from "../../../domain/prompts/generar-prompt-contacto-frio";
import {
  normalizarRubro,
  coincideRubro,
  type IntentoContacto,
  type PotencialCliente,
} from "../../../domain/entidades/contacto-frio.entity";

const useCase = new GestionarContactoFrioUseCase();
const SIN_INTENTOS: IntentoContacto[] = [];

const TarjetaAbrir: React.FC<{
  prospecto: PotencialCliente;
  cerrar: () => void;
}> = ({ prospecto, cerrar }) => {
  const [canal, setCanal] = useState<Canal>("Instagram");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const ficha = useLiveQuery(
    () => db.ficha_digital.get(prospecto.id),
    [prospecto.id]
  );

  const enviar = async () => {
    setError("");
    setTrabajando(true);
    const res = await useCase.registrarEnvio({
      potencialClienteId: prospecto.id,
      canal,
      mensaje,
      tipoEnvio: "apertura",
    });
    setTrabajando(false);
    if (!res.ok) return setError(res.error!.mensaje);
    cerrar();
  };

  const noSirve = async () => {
    setTrabajando(true);
    await useCase.descartarLead(prospecto.id, ["No es su perfil"]);
    setTrabajando(false);
    cerrar();
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-zinc-100">
            {prospecto.nombre}
          </h3>
          <p className="text-xs text-zinc-400">
            {[prospecto.rubro, ficha?.dolorTags?.join(", ")]
              .filter(Boolean)
              .join(" · ") || "Sin datos de ficha"}
          </p>
          {ficha?.referenciaPosteo && (
            <p className="mt-1 text-xs text-zinc-400">
              Posteo que vi: {ficha.referenciaPosteo}
            </p>
          )}
        </div>
        {prospecto.rubro && <Badge color="sky">{prospecto.rubro}</Badge>}
      </div>

      <EnlacesProspecto prospectoId={prospecto.id} />

      <BotonPrompt
        etiqueta="Copiar prompt de apertura (The Mom Test)"
        generar={() => generarPromptApertura({ prospecto, ficha })}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]">
        <Select
          label="Canal"
          value={canal}
          onChange={(v) => setCanal(v as Canal)}
          options={OPCIONES_CANAL}
        />
        <Textarea
          label="Mensaje que mandé"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={3}
          placeholder="Pegá el mensaje final que mandaste."
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={enviar} cargando={trabajando}>
          Ya lo mandé
        </Button>
        <Button variant="ghost" onClick={noSirve} disabled={trabajando}>
          No sirve, descartar
        </Button>
      </div>
    </div>
  );
};

/**
 * ③ ABRIR — la cuota diaria de aperturas con filtro tolerante por rubro y
 * selección manual de los prospectos que se trabajarán hoy.
 */
export const EstacionAbrir: React.FC<{
  nuevos: PotencialCliente[];
  irA: (n: 4) => void;
}> = ({ nuevos, irA }) => {
  const objetivo = useConfiguracionStore((s) => s.objetivoDiarioContactos);
  const setObjetivo = useConfiguracionStore(
    (s) => s.setObjetivoDiarioContactos
  );

  const [rubroFiltro, setRubroFiltro] = useState<string>("");
  const [busquedaTexto, setBusquedaTexto] = useState<string>("");
  const [seleccionManual, setSeleccionManual] = useState<string[] | null>(null);
  const [verSoloSeleccionados, setVerSoloSeleccionados] =
    useState<boolean>(false);
  const [activoId, setActivoId] = useState<string | null>(null);

  const intentos =
    useLiveQuery(() => db.intento_contacto.toArray(), []) ?? SIN_INTENTOS;

  const aperturasHoy = useMemo(() => {
    const inicio = inicioDelDia(ahoraMs());
    return intentos.filter(
      (i) =>
        i.fecha >= inicio &&
        (i.tipoEnvio === "apertura" ||
          (!i.tipoEnvio && !!i.mensajeEnviado?.trim()))
    ).length;
  }, [intentos]);

  const restante = Math.max(objetivo - aperturasHoy, 0);

  // Lista de rubros únicos normalizados para el filtro
  const rubrosDisponibles = useMemo(() => {
    const mapa = new Map<string, { label: string; count: number }>();
    for (const p of nuevos) {
      const raw = p.rubro?.trim();
      if (!raw) continue;
      const norm = normalizarRubro(raw);
      if (!mapa.has(norm)) {
        const label = raw.charAt(0).toUpperCase() + raw.slice(1);
        mapa.set(norm, { label, count: 1 });
      } else {
        mapa.get(norm)!.count++;
      }
    }
    return Array.from(mapa.entries()).map(([norm, item]) => ({
      norm,
      label: item.label,
      count: item.count,
    }));
  }, [nuevos]);

  // Filtrar prospectos por rubro y búsqueda (tolerante a tipeo, mayúsculas y acentos)
  const prospectosFiltrados = useMemo(() => {
    return nuevos.filter((p) => {
      if (rubroFiltro && !coincideRubro(p.rubro, rubroFiltro)) {
        return false;
      }
      if (busquedaTexto.trim()) {
        const coincideNom = p.nombre
          .toLowerCase()
          .includes(busquedaTexto.toLowerCase().trim());
        const coincideRub = coincideRubro(p.rubro, busquedaTexto);
        if (!coincideNom && !coincideRub) return false;
      }
      return true;
    });
  }, [nuevos, rubroFiltro, busquedaTexto]);

  // Set de IDs válidos actualmente existentes
  const idsValidos = useMemo(() => new Set(nuevos.map((p) => p.id)), [nuevos]);

  // Selección efectiva: si el usuario modificó manualmente, usamos esa (filtrada de IDs eliminados);
  // si es null (inicio), se seleccionan por defecto los primeros 'restante'
  const seleccionadosIds = useMemo(() => {
    if (seleccionManual !== null) {
      return seleccionManual.filter((id) => idsValidos.has(id));
    }
    return prospectosFiltrados.slice(0, restante).map((p) => p.id);
  }, [seleccionManual, idsValidos, prospectosFiltrados, restante]);

  // Prospecto activo para la tarjeta: si activoId es válido se usa ese; si no, el primer seleccionado o primer filtrado
  const activo = useMemo(() => {
    if (activoId && nuevos.some((p) => p.id === activoId)) {
      return nuevos.find((p) => p.id === activoId) ?? null;
    }
    const primerSeleccionadoId = seleccionadosIds[0];
    if (primerSeleccionadoId) {
      return nuevos.find((p) => p.id === primerSeleccionadoId) ?? null;
    }
    return prospectosFiltrados[0] ?? null;
  }, [activoId, nuevos, seleccionadosIds, prospectosFiltrados]);

  const toggleSeleccion = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSeleccionManual((prev) => {
      const base =
        prev !== null
          ? prev.filter((x) => idsValidos.has(x))
          : seleccionadosIds;
      if (base.includes(id)) {
        return base.filter((item) => item !== id);
      } else {
        return [...base, id];
      }
    });
  };

  const seleccionarPrimerosN = () => {
    const cantidad = Math.max(restante, 1);
    const elegidos = prospectosFiltrados.slice(0, cantidad).map((p) => p.id);
    setSeleccionManual(elegidos);
    if (elegidos.length > 0) {
      setActivoId(elegidos[0]);
    }
  };

  const deseleccionarTodos = () => {
    setSeleccionManual([]);
  };

  // Prospectos visibles en la columna izquierda según pestaña/modo
  const listaMostrar = useMemo(() => {
    if (verSoloSeleccionados) {
      return prospectosFiltrados.filter((p) => seleccionadosIds.includes(p.id));
    }
    return prospectosFiltrados;
  }, [prospectosFiltrados, verSoloSeleccionados, seleccionadosIds]);

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Header de Cuota y Objetivo Diario */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-zinc-200">
            {aperturasHoy} / {objetivo} aperturas de hoy
          </span>
          {restante > 0 ? (
            <Badge color="amber">Faltan {restante}</Badge>
          ) : (
            <Badge color="emerald">Meta cumplida 🎉</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Objetivo diario:</span>
          <Input
            type="number"
            min={1}
            value={objetivo}
            onChange={(e) =>
              setObjetivo(Math.max(1, Number(e.target.value) || 1))
            }
            className="w-16 py-1.5 text-center text-xs"
          />
        </div>
      </div>

      {/* 2. Barra de Filtro de Rubro y Búsqueda Tolerante */}
      <div className="flex flex-col gap-2 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-zinc-300">
            Filtro por Rubro ({prospectosFiltrados.length} disponibles)
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={seleccionarPrimerosN}
              className="rounded-lg border border-[#2A2A2E] bg-[#222226] px-2.5 py-1 text-[11px] font-semibold text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
            >
              Elegir primeros {restante}
            </button>
            {seleccionadosIds.length > 0 && (
              <button
                type="button"
                onClick={deseleccionarTodos}
                className="rounded-lg px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-300"
              >
                Limpiar selección
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_200px]">
          {/* Pills de Rubros */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRubroFiltro("")}
              className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
                !rubroFiltro
                  ? "border border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                  : "border border-[#2A2A2E] bg-[#141417] text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Todos ({nuevos.length})
            </button>
            {rubrosDisponibles.map((r) => (
              <button
                key={r.norm}
                type="button"
                onClick={() =>
                  setRubroFiltro(rubroFiltro === r.norm ? "" : r.norm)
                }
                className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
                  rubroFiltro === r.norm
                    ? "border border-sky-500/40 bg-sky-500/20 text-sky-300"
                    : "border border-[#2A2A2E] bg-[#141417] text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {r.label} ({r.count})
              </button>
            ))}
          </div>

          {/* Buscador tolerante */}
          <Input
            placeholder="Buscar rubro o comercio..."
            value={busquedaTexto}
            onChange={(e) => setBusquedaTexto(e.target.value)}
            className="py-1 text-xs"
          />
        </div>

        {/* Barra de Estado de Selección */}
        <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">
              Seleccionados para hoy:{" "}
              <strong className="text-emerald-400">
                {seleccionadosIds.length}
              </strong>{" "}
              de {restante} requeridos
            </span>
            {seleccionadosIds.length < restante && restante > 0 && (
              <span className="text-amber-400">
                (Faltan {restante - seleccionadosIds.length} por elegir)
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setVerSoloSeleccionados(!verSoloSeleccionados)}
            className={`font-semibold transition-colors ${
              verSoloSeleccionados
                ? "text-emerald-400 underline"
                : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            {verSoloSeleccionados
              ? "← Ver todos los disponibles"
              : `Ver solo seleccionados (${seleccionadosIds.length})`}
          </button>
        </div>
      </div>

      {/* 3. Área Principal: Lista de Selección a la Izquierda + Tarjeta a la Derecha */}
      {nuevos.length === 0 ? (
        <EstacionVacia
          mensaje="No hay prospectos nuevos para abrir."
          siguiente={{ etiqueta: "Pasar a ④ Reponer", ir: () => irA(4) }}
        />
      ) : listaMostrar.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-[#18181B] p-8 text-center text-sm text-zinc-400">
          <Icono.Search className="h-6 w-6 text-zinc-600" />
          <span>
            {verSoloSeleccionados
              ? "No tenés ningún prospecto seleccionado para hoy con este filtro."
              : "No se encontraron prospectos que coincidan con el rubro o búsqueda."}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRubroFiltro("");
              setBusquedaTexto("");
              setVerSoloSeleccionados(false);
            }}
          >
            Restablecer filtros
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
          {/* Columna Izquierda: Lista con Checkbox de Selección */}
          <div className="flex max-h-[600px] flex-col gap-1.5 overflow-y-auto pr-1">
            {listaMostrar.map((p) => {
              const estaSeleccionado = seleccionadosIds.includes(p.id);
              const esActivo = activoId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setActivoId(p.id)}
                  className={`group flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-left text-xs transition-all ${
                    esActivo
                      ? "border-emerald-500/50 bg-emerald-500/10 shadow-sm"
                      : estaSeleccionado
                        ? "border-zinc-700 bg-[#18181B] text-zinc-200"
                        : "border-[#2A2A2E] bg-[#141417] text-zinc-400 opacity-75 hover:border-zinc-700 hover:text-zinc-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={estaSeleccionado}
                    onChange={(e) =>
                      toggleSeleccion(p.id, e as unknown as React.MouseEvent)
                    }
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5 cursor-pointer rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
                    title={
                      estaSeleccionado
                        ? "Quitar de los elegidos de hoy"
                        : "Elegir para abrir hoy"
                    }
                  />

                  <div className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={`truncate font-semibold ${
                        esActivo ? "text-emerald-300" : "text-zinc-200"
                      }`}
                    >
                      {p.nombre}
                    </span>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      {p.rubro && (
                        <span className="truncate text-[10px] text-zinc-400">
                          {p.rubro}
                        </span>
                      )}
                      {estaSeleccionado && (
                        <span className="py-0.2 ml-auto rounded bg-emerald-500/10 px-1.5 text-[9px] font-bold text-emerald-400">
                          Hoy
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Columna Derecha: Tarjeta de Apertura Activa */}
          {activo ? (
            <TarjetaAbrir
              key={activo.id}
              prospecto={activo}
              cerrar={() => {
                // Al enviar o descartar, remover de seleccionados
                setSeleccionManual((prev) => {
                  const base =
                    prev !== null
                      ? prev.filter((x) => idsValidos.has(x))
                      : seleccionadosIds;
                  return base.filter((id) => id !== activo.id);
                });
                setActivoId(null);
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2A2A2E] p-12 text-center text-sm text-zinc-500">
              <Icono.Mail className="mb-2 h-8 w-8 text-zinc-600" />
              <span>
                Elegí un prospecto de la lista para redactar la apertura.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
