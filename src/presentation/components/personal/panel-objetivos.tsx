"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Icono } from "../icons";
import { Badge, type BadgeColor } from "../badge";
import { Select } from "../select";
import { useToast } from "../../hooks/useToast";
import { GestionarObjetivosUseCase } from "../../../application/use-cases/personal/gestionar-objetivos.use-case";
import {
  calcularRitmoObjetivo,
  AREAS_OBJETIVO,
  type AreaObjetivo,
  type ObjetivoCuantificable,
  type EstadoRitmoObjetivo,
} from "../../../domain/entidades/objetivo-cuantificable.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";

const useCase = new GestionarObjetivosUseCase();
const SIN_OBJETIVOS: never[] = [];

const ETIQUETA_RITMO: Record<EstadoRitmoObjetivo, string> = {
  cumplido: "Cumplido",
  vencido: "Vencido",
  al_dia: "Al día",
  atrasado: "Atrasado",
  adelantado: "Adelantado",
};

const COLOR_RITMO: Record<EstadoRitmoObjetivo, BadgeColor> = {
  cumplido: "emerald",
  vencido: "red",
  al_dia: "sky",
  atrasado: "amber",
  adelantado: "emerald",
};

const ETIQUETA_AREA: Record<AreaObjetivo, string> = {
  profesional: "Profesional",
  personal: "Personal",
  ambas: "Ambas",
};

const FilaObjetivo: React.FC<{ objetivo: ObjetivoCuantificable }> = ({
  objetivo,
}) => {
  const { mostrarToast } = useToast();
  const hoy = obtenerDiaTareaHoy();
  const ritmo = calcularRitmoObjetivo(objetivo, hoy);

  const [editando, setEditando] = useState(false);
  const [avanceRapido, setAvanceRapido] = useState("");
  const [nuevaCantidad, setNuevaCantidad] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");

  const registrarAvance = async () => {
    const n = Number(avanceRapido);
    if (!n) return;
    const res = await useCase.registrarAvance(objetivo.id, n);
    if (res.ok) setAvanceRapido("");
    else mostrarToast(res.error!.mensaje, "error");
  };

  const guardarAjuste = async () => {
    const res = await useCase.ajustarObjetivo({
      id: objetivo.id,
      cantidadObjetivo: nuevaCantidad ? Number(nuevaCantidad) : undefined,
      diaLimite: nuevaFecha || undefined,
    });
    if (res.ok) {
      setEditando(false);
      setNuevaCantidad("");
      setNuevaFecha("");
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  const archivar = async () => {
    const res = await useCase.archivarObjetivo(objetivo.id);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-zinc-200">
            {objetivo.titulo}
          </span>
          <Badge color={COLOR_RITMO[ritmo.estado]}>
            {ETIQUETA_RITMO[ritmo.estado]}
          </Badge>
          {objetivo.origenModulo && (
            <span className="text-[10px] text-zinc-600">
              {objetivo.origenModulo}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">
            {objetivo.progresoActual}/{objetivo.cantidadObjetivo}{" "}
            {objetivo.unidad}
          </span>
          <button
            onClick={() => setEditando(!editando)}
            className="text-[10px] font-bold text-zinc-500 uppercase hover:text-zinc-300"
          >
            Ajustar
          </button>
          <button
            onClick={() => void archivar()}
            title="Archivar objetivo"
            className="flex min-h-11 min-w-11 items-center justify-center text-zinc-600 hover:text-red-400"
          >
            <Icono.Close className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {ritmo.estado !== "cumplido" && !editando && (
        <p className="text-xs text-zinc-500">
          Faltan {ritmo.restante} {objetivo.unidad} —{" "}
          {ritmo.diasRestantes > 0
            ? `${ritmo.porDiaNecesario.toFixed(1)} por día para llegar`
            : "la fecha límite ya pasó"}
          . Al ritmo actual, vas a terminar con {ritmo.proyeccionAlRitmoActual}{" "}
          {objetivo.unidad}.
        </p>
      )}

      {!editando && ritmo.estado !== "cumplido" && (
        <div className="flex gap-2">
          <input
            type="number"
            value={avanceRapido}
            onChange={(e) => setAvanceRapido(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void registrarAvance();
            }}
            placeholder={`+ ${objetivo.unidad} de hoy`}
            className="w-32 rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
          />
          <Button
            onClick={registrarAvance}
            variant="outline"
            disabled={!avanceRapido}
          >
            Sumar
          </Button>
        </div>
      )}

      {editando && (
        <div className="flex flex-wrap items-end gap-2 border-t border-[#2A2A2E] pt-2">
          <input
            type="number"
            value={nuevaCantidad}
            onChange={(e) => setNuevaCantidad(e.target.value)}
            placeholder={`Nueva cantidad (hoy: ${objetivo.cantidadObjetivo})`}
            className="w-44 rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
          />
          <input
            type="date"
            value={nuevaFecha}
            onChange={(e) => setNuevaFecha(e.target.value)}
            className="rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
          />
          <Button onClick={guardarAjuste} variant="outline">
            Guardar
          </Button>
        </div>
      )}
    </div>
  );
};

const FormularioNuevoObjetivo: React.FC = () => {
  const { mostrarToast } = useToast();
  const hoy = obtenerDiaTareaHoy();
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [unidad, setUnidad] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [diaLimite, setDiaLimite] = useState(sumarDias(hoy, 30));
  const [area, setArea] = useState<AreaObjetivo>("ambas");
  const [guardando, setGuardando] = useState(false);

  const crear = async () => {
    const cantidadNum = Number(cantidad);
    if (!titulo.trim() || !unidad.trim() || !cantidadNum || cantidadNum <= 0) {
      return;
    }
    setGuardando(true);
    const res = await useCase.crearObjetivo({
      titulo,
      unidad,
      cantidadObjetivo: cantidadNum,
      diaInicio: hoy,
      diaLimite,
      area,
    });
    setGuardando(false);
    if (res.ok) {
      setTitulo("");
      setUnidad("");
      setCantidad("");
      setDiaLimite(sumarDias(hoy, 30));
      setAbierto(false);
      mostrarToast("Objetivo definido.", "exito");
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#2A2A2E] p-3 text-xs font-bold text-zinc-500 uppercase hover:border-zinc-700 hover:text-zinc-300"
      >
        <Icono.Plus className="h-3.5 w-3.5" />
        Nuevo objetivo
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
      <p className="text-xs text-zinc-500">
        Todo objetivo lleva cantidad + fecha límite — el ritmo diario necesario
        se calcula solo, no hace falta hacer la cuenta.
      </p>
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título (ej. Leer libros este mes)"
        className="rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
      />
      <div className="flex flex-wrap items-end gap-2">
        <input
          type="number"
          min={1}
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          placeholder="Cantidad"
          className="w-28 rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
        />
        <input
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
          placeholder="Unidad (libros, kg, contactos...)"
          className="w-44 rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
        />
        <input
          type="date"
          value={diaLimite}
          onChange={(e) => setDiaLimite(e.target.value)}
          className="rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
        />
        <Select
          value={area}
          onChange={(v) => setArea(v as AreaObjetivo)}
          options={AREAS_OBJETIVO.map((a) => ({
            value: a,
            label: ETIQUETA_AREA[a],
          }))}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setAbierto(false)}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
        >
          Cancelar
        </button>
        <Button
          onClick={crear}
          cargando={guardando}
          disabled={!titulo.trim() || !unidad.trim() || !cantidad}
        >
          Definir objetivo
        </Button>
      </div>
    </div>
  );
};

/**
 * Vista "Mes": todos los objetivos cuantitativos activos (los propios y los
 * enganchados a otros módulos, ej. Contacto en Frío) con su ritmo, en un
 * solo lugar — separado de la vista diaria para no mezclar el horizonte de
 * "hoy" con el de "este mes".
 */
export const PanelObjetivos: React.FC = () => {
  const todos =
    useLiveQuery(() => db.objetivo_cuantificable.toArray()) || SIN_OBJETIVOS;

  const activos = todos.filter(
    (o) => o.estado === "activo" || o.estado === "vencido"
  );
  const cumplidos = todos.filter((o) => o.estado === "cumplido");

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center gap-2">
        <Icono.Target className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Objetivos del mes
        </h3>
      </div>

      {activos.length === 0 && (
        <p className="text-sm text-zinc-500">
          Sin objetivos activos todavía. Definí uno cuantitativo para poder ver
          tu ritmo real, no solo la intención.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {activos.map((o) => (
          <FilaObjetivo key={o.id} objetivo={o} />
        ))}
        <FormularioNuevoObjetivo />
      </div>

      {cumplidos.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-[#2A2A2E] pt-3">
          <span className="text-[10px] font-bold tracking-wider text-zinc-600 uppercase">
            Cumplidos ({cumplidos.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {cumplidos.map((o) => (
              <Badge key={o.id} color="emerald">
                {o.titulo}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
