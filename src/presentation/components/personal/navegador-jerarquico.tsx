"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import { Dialog } from "../dialog";
import { ModalImportarJson } from "../contenido/modal-importar-json";
import { ConfirmarEliminacionNodo } from "./confirmar-eliminacion-nodo";
import { AjustarFechaModal } from "./ajustar-fecha-modal";
import { PanelHistorialPersonal } from "./panel-historial-personal";
import type { NivelJerarquiaPersonal } from "../../../application/use-cases/personal/eliminar-nodo-personal.use-case";
import type { NivelConHijosFecha } from "../../../application/use-cases/personal/ajustar-fecha-personal.use-case";
import type { TipoEntidadHistorial } from "../../../domain/entidades/personal-historial.entity";
import { GestionarAreasUseCase } from "../../../application/use-cases/personal/gestionar-areas.use-case";
import { GestionarObjetivosUseCase } from "../../../application/use-cases/personal/gestionar-objetivos.use-case";
import { GestionarProyectosPersonalUseCase } from "../../../application/use-cases/personal/gestionar-proyectos-personal.use-case";
import { GestionarEntregablesUseCase } from "../../../application/use-cases/personal/gestionar-entregables.use-case";
import { GestionarActividadesUseCase } from "../../../application/use-cases/personal/gestionar-actividades.use-case";
import { ImportarArbolPersonalUseCase } from "../../../application/use-cases/personal/importar-arbol-personal.use-case";
import {
  generarPromptArbolCompleto,
  generarPromptObjetivo,
  generarPromptProyecto,
  generarPromptEntregable,
  generarPromptActividades,
} from "../../../domain/prompts/generar-prompt-jerarquia-personal";
import { generarResumenPeriodo } from "../../../domain/prompts/generar-prompt-planificacion-personal";
import {
  calcularRitmoObjetivo,
  type EstadoRitmoObjetivo,
} from "../../../domain/entidades/objetivo-cuantificable.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";
import { FRECUENCIAS_RECURRENCIA } from "../../../domain/entidades/entregable.entity";
import { TIPOS_ACTIVIDAD } from "../../../domain/entidades/actividad.entity";
import type { AreaPersonal } from "../../../domain/entidades/area-personal.entity";
import type { ObjetivoCuantificable } from "../../../domain/entidades/objetivo-cuantificable.entity";
import type { ProyectoPersonal } from "../../../domain/entidades/proyecto-personal.entity";
import type { Entregable } from "../../../domain/entidades/entregable.entity";

const areasUseCase = new GestionarAreasUseCase();
const objetivosUseCase = new GestionarObjetivosUseCase();
const proyectosUseCase = new GestionarProyectosPersonalUseCase();
const entregablesUseCase = new GestionarEntregablesUseCase();
const actividadesUseCase = new GestionarActividadesUseCase();
const importarUseCase = new ImportarArbolPersonalUseCase();

const SIN_ITEMS: never[] = [];

const COLOR_RITMO: Record<EstadoRitmoObjetivo, string> = {
  cumplido: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  vencido: "text-red-400 border-red-500/30 bg-red-500/10",
  al_dia: "text-sky-400 border-sky-500/30 bg-sky-500/10",
  atrasado: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  adelantado: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
};
const ETIQUETA_RITMO: Record<EstadoRitmoObjetivo, string> = {
  cumplido: "Cumplido",
  vencido: "Vencido",
  al_dia: "Al día",
  atrasado: "Atrasado",
  adelantado: "Adelantado",
};

function fechaRelativa(diaLimite: string, hoy: string): string {
  const dif = Math.round(
    (new Date(diaLimite).getTime() - new Date(hoy).getTime()) / 86400000
  );
  if (dif === 0) return "vence hoy";
  if (dif > 0) return `vence en ${dif} día${dif === 1 ? "" : "s"}`;
  return `venció hace ${-dif} día${-dif === 1 ? "" : "s"}`;
}

/** Fila de acciones secundarias (historial/ajustar fecha/eliminar) — botones reales, nunca anidados dentro de otro botón. */
const AccionesNodo: React.FC<{
  onHistorial?: () => void;
  onAjustarFecha?: () => void;
  onEliminar?: () => void;
}> = ({ onHistorial, onAjustarFecha, onEliminar }) => {
  if (!onHistorial && !onAjustarFecha && !onEliminar) return null;
  const detener = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  return (
    <div className="flex justify-end gap-1 border-t border-[#2A2A2E] pt-2">
      {onHistorial && (
        <button
          onClick={detener(onHistorial)}
          title="Historial"
          className="rounded border border-zinc-800 p-1.5 text-zinc-500 hover:text-sky-400"
        >
          <Icono.History className="h-3.5 w-3.5" />
        </button>
      )}
      {onAjustarFecha && (
        <button
          onClick={detener(onAjustarFecha)}
          title="Ajustar fecha"
          className="rounded border border-zinc-800 p-1.5 text-zinc-500 hover:text-amber-400"
        >
          <Icono.Clock className="h-3.5 w-3.5" />
        </button>
      )}
      {onEliminar && (
        <button
          onClick={detener(onEliminar)}
          title="Eliminar"
          className="rounded border border-zinc-800 p-1.5 text-zinc-500 hover:text-red-400"
        >
          <Icono.Trash className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

/** Tarjeta genérica para Objetivo/Proyecto/Entregable — fecha, progreso y ritmo con el número, no solo la etiqueta. */
const TarjetaNodo: React.FC<{
  titulo: string;
  horizonte: string;
  diaInicio: string;
  diaLimite: string;
  cantidadObjetivo?: number;
  unidad?: string;
  progresoActual: number;
  onClick: () => void;
  onHistorial?: () => void;
  onAjustarFecha?: () => void;
  onEliminar?: () => void;
}> = ({
  titulo,
  horizonte,
  diaInicio,
  diaLimite,
  cantidadObjetivo,
  unidad,
  progresoActual,
  onClick,
  onHistorial,
  onAjustarFecha,
  onEliminar,
}) => {
  const hoy = obtenerDiaTareaHoy();
  const ritmo =
    cantidadObjetivo !== undefined
      ? calcularRitmoObjetivo(
          { cantidadObjetivo, progresoActual, diaInicio, diaLimite },
          hoy
        )
      : null;
  const vencida = diaLimite < hoy;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3 transition-all hover:border-zinc-700">
      <div
        onClick={onClick}
        className="flex cursor-pointer flex-col gap-2 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-zinc-200">{titulo}</span>
          <span className="shrink-0 rounded border border-zinc-800 px-1.5 py-0.5 text-[9px] font-bold text-zinc-500 uppercase">
            {horizonte}
          </span>
        </div>
        <span
          className={`text-xs ${vencida ? "text-red-400" : "text-zinc-500"}`}
        >
          {fechaRelativa(diaLimite, hoy)}
        </span>
        {cantidadObjetivo !== undefined && (
          <>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{
                  width: `${Math.min(100, (progresoActual / cantidadObjetivo) * 100)}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-400">
                {progresoActual}/{cantidadObjetivo} {unidad}
              </span>
              {ritmo && (
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${COLOR_RITMO[ritmo.estado]}`}
                >
                  {ETIQUETA_RITMO[ritmo.estado]}
                </span>
              )}
            </div>
            {ritmo && ritmo.estado !== "cumplido" && (
              <span className="text-[11px] text-zinc-500">
                Llevás {progresoActual} — deberías llevar{" "}
                {Math.round(ritmo.ritmoEsperadoHastaHoy)} a esta altura.
              </span>
            )}
          </>
        )}
      </div>
      <AccionesNodo
        onHistorial={onHistorial}
        onAjustarFecha={onAjustarFecha}
        onEliminar={onEliminar}
      />
    </div>
  );
};

const CampoTexto: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}> = ({ value, onChange, placeholder, type = "text" }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
  />
);

/** ------------------------------------------------------------------ Áreas */

const FormularioNuevaArea: React.FC = () => {
  const { mostrarToast } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  const crear = async () => {
    if (!nombre.trim()) return;
    setGuardando(true);
    const res = await areasUseCase.crearArea({ nombre });
    setGuardando(false);
    if (res.ok) {
      setNombre("");
      setAbierto(false);
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
        Nueva área
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
      <CampoTexto
        value={nombre}
        onChange={setNombre}
        placeholder="Nombre del área (ej. Freelancer)"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setAbierto(false)}
          className="text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
        >
          Cancelar
        </button>
        <Button onClick={crear} cargando={guardando} disabled={!nombre.trim()}>
          Crear
        </Button>
      </div>
    </div>
  );
};

const VistaAreas: React.FC<{
  onEntrar: (area: AreaPersonal) => void;
  onEliminar: (id: string, titulo: string) => void;
  onHistorial: (id: string, titulo: string) => void;
}> = ({ onEntrar, onEliminar, onHistorial }) => {
  const { mostrarToast } = useToast();
  const [modalAbierto, setModalAbierto] = useState(false);
  const todasLasAreas =
    useLiveQuery(() => db.area_personal.toArray()) || SIN_ITEMS;
  const areas = todasLasAreas
    .filter((a) => a.activa)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const copiarPrompt = async () => {
    const hoy = obtenerDiaTareaHoy();
    const habitos = await db.habito_definicion.toArray();
    const registros = await db.habito_registro
      .where("diaTarea")
      .aboveOrEqual(sumarDias(hoy, -30))
      .toArray();
    const objetivos = await db.objetivo_cuantificable
      .where("estado")
      .anyOf(["activo", "vencido"])
      .toArray();
    const resumen = generarResumenPeriodo(habitos, registros, objetivos, hoy);
    const prompt = generarPromptArbolCompleto(
      resumen,
      areas.map((a) => a.nombre)
    );
    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt copiado al portapapeles.", "exito");
  };

  const importar = async (items: unknown[]) => {
    const res = await importarUseCase.importarArbol(items);
    if (!res.ok) throw new Error(res.error!.mensaje);
    mostrarToast(res.valor, "exito");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Áreas
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={copiarPrompt}
            className="px-3 py-1.5 text-xs"
            icono={<Icono.Sparkles className="h-3.5 w-3.5" />}
          >
            Armar árbol con IA
          </Button>
          <Button
            variant="outline"
            onClick={() => setModalAbierto(true)}
            className="px-3 py-1.5 text-xs"
          >
            Pegar plan generado
          </Button>
        </div>
      </div>
      {areas.length === 0 && (
        <p className="text-sm text-zinc-500">
          Sin áreas todavía — creá una para empezar a organizar tus objetivos de
          largo plazo.
        </p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {areas.map((a) => (
          <div
            key={a.id}
            className="flex flex-col gap-1 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3 transition-all hover:border-zinc-700"
          >
            <div
              onClick={() => onEntrar(a)}
              className="flex cursor-pointer flex-col gap-1 text-left"
            >
              <span className="text-sm font-bold text-zinc-200">
                {a.nombre}
              </span>
              {a.descripcion && (
                <span className="text-xs text-zinc-500">{a.descripcion}</span>
              )}
            </div>
            <AccionesNodo
              onHistorial={() => onHistorial(a.id, a.nombre)}
              onEliminar={() => onEliminar(a.id, a.nombre)}
            />
          </div>
        ))}
        <FormularioNuevaArea />
      </div>
      <ModalImportarJson
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo="Importar árbol completo desde JSON"
        plantillaEjemplo={JSON.stringify(
          {
            areaTitulo: "Freelancer",
            objetivosNuevos: [
              {
                titulo: "...",
                unidad: "...",
                cantidadObjetivo: 5,
                diaLimite: "YYYY-MM-DD",
                proyectos: [],
              },
            ],
          },
          null,
          2
        )}
        onImportar={importar}
      />
    </div>
  );
};

/** --------------------------------------------------------------- Objetivos */

const FormularioNuevoObjetivo: React.FC<{ areaId: string }> = ({ areaId }) => {
  const { mostrarToast } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [unidad, setUnidad] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [diaLimite, setDiaLimite] = useState(
    sumarDias(obtenerDiaTareaHoy(), 90)
  );
  const [guardando, setGuardando] = useState(false);

  const crear = async () => {
    const cantidadNum = Number(cantidad);
    if (!titulo.trim() || !unidad.trim() || !cantidadNum) return;
    setGuardando(true);
    const res = await objetivosUseCase.crearObjetivo({
      titulo,
      unidad,
      cantidadObjetivo: cantidadNum,
      diaInicio: obtenerDiaTareaHoy(),
      diaLimite,
      areaId,
    });
    setGuardando(false);
    if (res.ok) {
      setTitulo("");
      setUnidad("");
      setCantidad("");
      setAbierto(false);
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
        SMART: cantidad + unidad + fecha límite, siempre.
      </p>
      <CampoTexto
        value={titulo}
        onChange={setTitulo}
        placeholder="Título (ej. Cerrar 5 clientes nuevos)"
      />
      <div className="flex flex-wrap gap-2">
        <input
          type="number"
          min={1}
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          placeholder="Cantidad"
          className="w-28 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
        />
        <div className="w-40">
          <CampoTexto
            value={unidad}
            onChange={setUnidad}
            placeholder="Unidad (clientes, kg...)"
          />
        </div>
        <CampoTexto
          type="date"
          value={diaLimite}
          onChange={setDiaLimite}
          placeholder=""
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setAbierto(false)}
          className="text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
        >
          Cancelar
        </button>
        <Button
          onClick={crear}
          cargando={guardando}
          disabled={!titulo.trim() || !unidad.trim() || !cantidad}
        >
          Crear
        </Button>
      </div>
    </div>
  );
};

const VistaObjetivos: React.FC<{
  area: AreaPersonal;
  onEntrar: (o: ObjetivoCuantificable) => void;
  onEliminar: (id: string, titulo: string) => void;
  onAjustarFecha: (id: string, titulo: string, fechaActual: string) => void;
  onHistorial: (id: string, titulo: string) => void;
}> = ({ area, onEntrar, onEliminar, onAjustarFecha, onHistorial }) => {
  const { mostrarToast } = useToast();
  const [modalAbierto, setModalAbierto] = useState(false);
  const todos =
    useLiveQuery(
      () => db.objetivo_cuantificable.where("areaId").equals(area.id).toArray(),
      [area.id]
    ) || SIN_ITEMS;
  const objetivos = todos.filter(
    (o) => o.estado === "activo" || o.estado === "vencido"
  );

  const copiarPrompt = async () => {
    const hoy = obtenerDiaTareaHoy();
    const habitos = await db.habito_definicion.toArray();
    const registros = await db.habito_registro
      .where("diaTarea")
      .aboveOrEqual(sumarDias(hoy, -30))
      .toArray();
    const resumen = generarResumenPeriodo(habitos, registros, objetivos, hoy);
    const prompt = generarPromptObjetivo(resumen, [area.nombre]);
    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt copiado al portapapeles.", "exito");
  };

  const importar = async (items: unknown[]) => {
    const res = await importarUseCase.importarObjetivo(items);
    if (!res.ok) throw new Error(res.error!.mensaje);
    mostrarToast(res.valor, "exito");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Objetivos de {area.nombre}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={copiarPrompt}
            className="px-3 py-1.5 text-xs"
            icono={<Icono.Sparkles className="h-3.5 w-3.5" />}
          >
            Copiar prompt para IA
          </Button>
          <Button
            variant="outline"
            onClick={() => setModalAbierto(true)}
            className="px-3 py-1.5 text-xs"
          >
            Pegar plan generado
          </Button>
        </div>
      </div>
      {objetivos.length === 0 && (
        <p className="text-sm text-zinc-500">
          Sin objetivos activos en esta área todavía.
        </p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {objetivos.map((o) => (
          <TarjetaNodo
            key={o.id}
            titulo={o.titulo}
            horizonte="Largo plazo"
            diaInicio={o.diaInicio}
            diaLimite={o.diaLimite}
            cantidadObjetivo={o.cantidadObjetivo}
            unidad={o.unidad}
            progresoActual={o.progresoActual}
            onClick={() => onEntrar(o)}
            onHistorial={() => onHistorial(o.id, o.titulo)}
            onAjustarFecha={() => onAjustarFecha(o.id, o.titulo, o.diaLimite)}
            onEliminar={() => onEliminar(o.id, o.titulo)}
          />
        ))}
        <FormularioNuevoObjetivo areaId={area.id} />
      </div>
      <ModalImportarJson
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo="Importar objetivo(s) desde JSON"
        plantillaEjemplo={JSON.stringify(
          {
            areaTitulo: area.nombre,
            objetivosNuevos: [
              {
                titulo: "...",
                unidad: "...",
                cantidadObjetivo: 5,
                diaLimite: "YYYY-MM-DD",
                proyectos: [],
              },
            ],
          },
          null,
          2
        )}
        onImportar={importar}
      />
    </div>
  );
};

/** --------------------------------------------------------------- Proyectos */

const FormularioNuevoProyecto: React.FC<{ objetivoId: string }> = ({
  objetivoId,
}) => {
  const { mostrarToast } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [diaLimite, setDiaLimite] = useState(
    sumarDias(obtenerDiaTareaHoy(), 30)
  );
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState("");
  const [guardando, setGuardando] = useState(false);

  const crear = async () => {
    if (!titulo.trim()) return;
    setGuardando(true);
    const res = await proyectosUseCase.crearProyecto({
      objetivoId,
      titulo,
      diaInicio: obtenerDiaTareaHoy(),
      diaLimite,
      cantidadObjetivo: cantidad ? Number(cantidad) : undefined,
      unidad: cantidad ? unidad : undefined,
    });
    setGuardando(false);
    if (res.ok) {
      setTitulo("");
      setCantidad("");
      setUnidad("");
      setAbierto(false);
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
        Nuevo proyecto
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
      <p className="text-xs text-zinc-500">
        Cantidad/unidad opcionales — solo si tiene sentido cuantificar este
        proyecto.
      </p>
      <CampoTexto
        value={titulo}
        onChange={setTitulo}
        placeholder="Título (ej. Rediseño web)"
      />
      <div className="flex flex-wrap gap-2">
        <CampoTexto
          type="date"
          value={diaLimite}
          onChange={setDiaLimite}
          placeholder=""
        />
        <input
          type="number"
          min={1}
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          placeholder="Cantidad (opcional)"
          className="w-36 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
        />
        <div className="w-32">
          <CampoTexto
            value={unidad}
            onChange={setUnidad}
            placeholder="Unidad"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setAbierto(false)}
          className="text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
        >
          Cancelar
        </button>
        <Button onClick={crear} cargando={guardando} disabled={!titulo.trim()}>
          Crear
        </Button>
      </div>
    </div>
  );
};

const VistaProyectos: React.FC<{
  objetivo: ObjetivoCuantificable;
  onEntrar: (p: ProyectoPersonal) => void;
  onEliminar: (id: string, titulo: string) => void;
  onAjustarFecha: (id: string, titulo: string, fechaActual: string) => void;
  onHistorial: (id: string, titulo: string) => void;
}> = ({ objetivo, onEntrar, onEliminar, onAjustarFecha, onHistorial }) => {
  const { mostrarToast } = useToast();
  const [modalAbierto, setModalAbierto] = useState(false);
  const todos =
    useLiveQuery(
      () =>
        db.proyecto_personal.where("objetivoId").equals(objetivo.id).toArray(),
      [objetivo.id]
    ) || SIN_ITEMS;
  const proyectos = todos.filter((p) => p.estado !== "archivado");

  const copiarPrompt = () => {
    const ritmo = calcularRitmoObjetivo(objetivo, obtenerDiaTareaHoy());
    const restante = `vence ${objetivo.diaLimite}, restan ${ritmo.restante} de ${objetivo.cantidadObjetivo} ${objetivo.unidad}`;
    const prompt = generarPromptProyecto(objetivo.titulo, restante);
    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt copiado al portapapeles.", "exito");
  };

  const importar = async (items: unknown[]) => {
    const res = await importarUseCase.importarProyecto(items);
    if (!res.ok) throw new Error(res.error!.mensaje);
    mostrarToast(res.valor, "exito");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Proyectos de {objetivo.titulo}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={copiarPrompt}
            className="px-3 py-1.5 text-xs"
            icono={<Icono.Sparkles className="h-3.5 w-3.5" />}
          >
            Copiar prompt para IA
          </Button>
          <Button
            variant="outline"
            onClick={() => setModalAbierto(true)}
            className="px-3 py-1.5 text-xs"
          >
            Pegar plan generado
          </Button>
        </div>
      </div>
      {proyectos.length === 0 && (
        <p className="text-sm text-zinc-500">
          Sin proyectos todavía bajo este objetivo.
        </p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {proyectos.map((p) => (
          <TarjetaNodo
            key={p.id}
            titulo={p.titulo}
            horizonte="Mediano plazo"
            diaInicio={p.diaInicio}
            diaLimite={p.diaLimite}
            cantidadObjetivo={p.cantidadObjetivo}
            unidad={p.unidad}
            progresoActual={p.progresoActual}
            onClick={() => onEntrar(p)}
            onHistorial={() => onHistorial(p.id, p.titulo)}
            onAjustarFecha={() => onAjustarFecha(p.id, p.titulo, p.diaLimite)}
            onEliminar={() => onEliminar(p.id, p.titulo)}
          />
        ))}
        <FormularioNuevoProyecto objetivoId={objetivo.id} />
      </div>
      <ModalImportarJson
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo="Importar proyecto(s) desde JSON"
        plantillaEjemplo={JSON.stringify(
          {
            objetivoTitulo: objetivo.titulo,
            proyectosNuevos: [
              { titulo: "...", diaLimite: "YYYY-MM-DD", entregables: [] },
            ],
          },
          null,
          2
        )}
        onImportar={importar}
      />
    </div>
  );
};

/** -------------------------------------------------------------- Entregables */

const FormularioNuevoEntregable: React.FC<{
  proyectoId: string;
  objetivoId: string;
}> = ({ proyectoId, objetivoId }) => {
  const { mostrarToast } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [diaLimite, setDiaLimite] = useState(
    sumarDias(obtenerDiaTareaHoy(), 7)
  );
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState("");
  const [recurrente, setRecurrente] = useState(false);
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]);
  const [guardando, setGuardando] = useState(false);

  const toggleDia = (d: number) =>
    setDiasSemana((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );

  const crear = async () => {
    if (!titulo.trim()) return;
    setGuardando(true);
    const res = await entregablesUseCase.crearEntregable({
      proyectoId,
      objetivoId,
      titulo,
      diaInicio: obtenerDiaTareaHoy(),
      diaLimite,
      cantidadObjetivo: cantidad ? Number(cantidad) : undefined,
      unidad: cantidad ? unidad : undefined,
      recurrencia: recurrente
        ? { frecuencia: "dias_especificos", diasSemana }
        : undefined,
    });
    setGuardando(false);
    if (res.ok) {
      setTitulo("");
      setCantidad("");
      setUnidad("");
      setRecurrente(false);
      setAbierto(false);
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
        Nuevo entregable
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
      <CampoTexto
        value={titulo}
        onChange={setTitulo}
        placeholder="Título (ej. Contacto en frío)"
      />
      <div className="flex flex-wrap gap-2">
        <CampoTexto
          type="date"
          value={diaLimite}
          onChange={setDiaLimite}
          placeholder=""
        />
        <input
          type="number"
          min={1}
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          placeholder="Cantidad (opcional)"
          className="w-36 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
        />
        <div className="w-32">
          <CampoTexto
            value={unidad}
            onChange={setUnidad}
            placeholder="Unidad"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={recurrente}
          onChange={(e) => setRecurrente(e.target.checked)}
          className="accent-emerald-500"
        />
        Se repite (Lun-Vie u otros días), hasta cumplir la cantidad
      </label>
      {recurrente && (
        <div className="flex gap-1">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(
            (label, dia) => (
              <button
                key={dia}
                type="button"
                onClick={() => toggleDia(dia)}
                className={`min-h-9 flex-1 rounded-lg border text-[11px] font-bold uppercase transition-all ${
                  diasSemana.includes(dia)
                    ? "border-emerald-500/40 bg-emerald-500 text-zinc-950"
                    : "border-[#2A2A2E] text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setAbierto(false)}
          className="text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
        >
          Cancelar
        </button>
        <Button onClick={crear} cargando={guardando} disabled={!titulo.trim()}>
          Crear
        </Button>
      </div>
    </div>
  );
};

const VistaEntregables: React.FC<{
  proyecto: ProyectoPersonal;
  onEntrar: (e: Entregable) => void;
  onEliminar: (id: string, titulo: string) => void;
  onHistorial: (id: string, titulo: string) => void;
}> = ({ proyecto, onEntrar, onEliminar, onHistorial }) => {
  const { mostrarToast } = useToast();
  const [modalAbierto, setModalAbierto] = useState(false);
  const todos =
    useLiveQuery(
      () => db.entregable.where("proyectoId").equals(proyecto.id).toArray(),
      [proyecto.id]
    ) || SIN_ITEMS;
  const entregables = todos.filter((e) => e.estado !== "archivado");

  const copiarPrompt = () => {
    const restante =
      proyecto.cantidadObjetivo !== undefined
        ? `vence ${proyecto.diaLimite}, restan ${Math.max(0, proyecto.cantidadObjetivo - proyecto.progresoActual)} de ${proyecto.cantidadObjetivo} ${proyecto.unidad}`
        : `vence ${proyecto.diaLimite}`;
    const prompt = generarPromptEntregable(proyecto.titulo, restante);
    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt copiado al portapapeles.", "exito");
  };

  const importar = async (items: unknown[]) => {
    const res = await importarUseCase.importarEntregable(items);
    if (!res.ok) throw new Error(res.error!.mensaje);
    mostrarToast(res.valor, "exito");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Entregables de {proyecto.titulo}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={copiarPrompt}
            className="px-3 py-1.5 text-xs"
            icono={<Icono.Sparkles className="h-3.5 w-3.5" />}
          >
            Copiar prompt para IA
          </Button>
          <Button
            variant="outline"
            onClick={() => setModalAbierto(true)}
            className="px-3 py-1.5 text-xs"
          >
            Pegar plan generado
          </Button>
        </div>
      </div>
      {entregables.length === 0 && (
        <p className="text-sm text-zinc-500">
          Sin entregables todavía bajo este proyecto.
        </p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {entregables.map((e) => (
          <div key={e.id} className="flex flex-col gap-1">
            <TarjetaNodo
              titulo={e.titulo}
              horizonte="Corto plazo"
              diaInicio={e.diaInicio}
              diaLimite={e.diaLimite}
              cantidadObjetivo={e.cantidadObjetivo}
              unidad={e.unidad}
              progresoActual={e.progresoActual}
              onClick={() => onEntrar(e)}
              onHistorial={() => onHistorial(e.id, e.titulo)}
              onEliminar={() => onEliminar(e.id, e.titulo)}
            />
            {e.recurrencia && (
              <span className="px-1 text-[10px] text-sky-400">
                ↻ Recurrente — se genera solo cada día que corresponde
              </span>
            )}
          </div>
        ))}
        <FormularioNuevoEntregable
          proyectoId={proyecto.id}
          objetivoId={proyecto.objetivoId}
        />
      </div>
      <ModalImportarJson
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo="Importar entregable(s) desde JSON"
        plantillaEjemplo={JSON.stringify(
          {
            proyectoTitulo: proyecto.titulo,
            entregablesNuevos: [
              {
                titulo: "...",
                diaLimite: "YYYY-MM-DD",
                cantidadObjetivo: 200,
                unidad: "contactos",
                recurrencia: {
                  frecuencia: FRECUENCIAS_RECURRENCIA[1],
                  diasSemana: [1, 2, 3, 4, 5],
                },
                actividades: [],
              },
            ],
          },
          null,
          2
        )}
        onImportar={importar}
      />
    </div>
  );
};

/** -------------------------------------------------------------- Actividades */

const FormularioNuevaActividadEntregable: React.FC<{
  entregableId: string;
}> = ({ entregableId }) => {
  const { mostrarToast } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [diaTarea, setDiaTarea] = useState(obtenerDiaTareaHoy());
  const [tipo, setTipo] = useState<"enfoque" | "mantenimiento">(
    "mantenimiento"
  );
  const [guardando, setGuardando] = useState(false);

  const crear = async () => {
    if (!descripcion.trim()) return;
    setGuardando(true);
    const res = await actividadesUseCase.crearActividad({
      entregableId,
      tipo,
      descripcion,
      diaTarea,
    });
    setGuardando(false);
    if (res.ok) {
      setDescripcion("");
      setAbierto(false);
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
        Nueva actividad
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
      <CampoTexto
        value={descripcion}
        onChange={setDescripcion}
        placeholder="Descripción"
      />
      <div className="flex flex-wrap gap-2">
        <CampoTexto
          type="date"
          value={diaTarea}
          onChange={setDiaTarea}
          placeholder=""
        />
        <div className="flex gap-1.5">
          {(["enfoque", "mantenimiento"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold uppercase transition-all ${
                tipo === t
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-[#2A2A2E] text-zinc-500"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setAbierto(false)}
          className="text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
        >
          Cancelar
        </button>
        <Button
          onClick={crear}
          cargando={guardando}
          disabled={!descripcion.trim()}
        >
          Crear
        </Button>
      </div>
    </div>
  );
};

const VistaActividades: React.FC<{ entregable: Entregable }> = ({
  entregable,
}) => {
  const { mostrarToast } = useToast();
  const [modalAbierto, setModalAbierto] = useState(false);
  const actividades =
    useLiveQuery(
      () => db.actividad.where("entregableId").equals(entregable.id).toArray(),
      [entregable.id]
    ) || SIN_ITEMS;
  const activas = actividades.filter(
    (a) => a.estado === "pendiente" || a.estado === "completada"
  );

  const copiarPrompt = () => {
    const restante =
      entregable.cantidadObjetivo !== undefined
        ? `vence ${entregable.diaLimite}, restan ${Math.max(0, entregable.cantidadObjetivo - entregable.progresoActual)} de ${entregable.cantidadObjetivo} ${entregable.unidad}`
        : `vence ${entregable.diaLimite}`;
    const prompt = generarPromptActividades(entregable.titulo, restante);
    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt copiado al portapapeles.", "exito");
  };

  const importar = async (items: unknown[]) => {
    const res = await importarUseCase.importarActividades(items);
    if (!res.ok) throw new Error(res.error!.mensaje);
    mostrarToast(res.valor, "exito");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Actividades de {entregable.titulo}
        </h3>
        {!entregable.recurrencia && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={copiarPrompt}
              className="px-3 py-1.5 text-xs"
              icono={<Icono.Sparkles className="h-3.5 w-3.5" />}
            >
              Copiar prompt para IA
            </Button>
            <Button
              variant="outline"
              onClick={() => setModalAbierto(true)}
              className="px-3 py-1.5 text-xs"
            >
              Pegar plan generado
            </Button>
          </div>
        )}
      </div>
      {entregable.recurrencia && (
        <p className="text-xs text-sky-400">
          Este entregable es recurrente — sus actividades se generan solas cada
          día que corresponde, en la vista de Hoy.
        </p>
      )}
      {activas.length === 0 && !entregable.recurrencia && (
        <p className="text-sm text-zinc-500">
          Sin actividades todavía bajo este entregable.
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        {activas.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-2.5"
          >
            <span
              className={`text-sm ${a.estado === "completada" ? "text-zinc-500 line-through" : "text-zinc-200"}`}
            >
              {a.descripcion}
            </span>
            <span className="text-xs text-zinc-600">{a.diaTarea}</span>
          </div>
        ))}
      </div>
      {!entregable.recurrencia && (
        <FormularioNuevaActividadEntregable entregableId={entregable.id} />
      )}
      <ModalImportarJson
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo="Importar actividad(es) desde JSON"
        plantillaEjemplo={JSON.stringify(
          {
            entregableTitulo: entregable.titulo,
            actividadesNuevas: [
              {
                tipo: TIPOS_ACTIVIDAD[1],
                descripcion: "...",
                diaTarea: "YYYY-MM-DD",
              },
            ],
          },
          null,
          2
        )}
        onImportar={importar}
      />
    </div>
  );
};

/** ------------------------------------------------------------------ Raíz */

/**
 * Navegador jerárquico Área → Objetivo → Proyecto → Entregable → Actividad
 * — breadcrumb con drill-down, un solo nivel visible a la vez (reemplaza el
 * acordeón que no gustó). Estado local, no ruta nueva — vive en el tab "Mes"
 * de hoy/page.tsx. Los objetos del breadcrumb se guardan completos (no solo
 * ids) para no tener que resolverlos de nuevo al renderizar las migas.
 */
export const NavegadorJerarquico: React.FC = () => {
  const [area, setArea] = useState<AreaPersonal | null>(null);
  const [objetivo, setObjetivo] = useState<ObjetivoCuantificable | null>(null);
  const [proyecto, setProyecto] = useState<ProyectoPersonal | null>(null);
  const [entregable, setEntregable] = useState<Entregable | null>(null);

  // Estado centralizado de los 3 modales secundarios (eliminar/ajustar fecha/
  // historial) — se abren desde cualquier nivel, un solo lugar de verdad en
  // vez de duplicar esto 4 veces (uno por Vista*).
  const [eliminarTarget, setEliminarTarget] = useState<{
    nivel: NivelJerarquiaPersonal;
    id: string;
    titulo: string;
  } | null>(null);
  const [ajustarTarget, setAjustarTarget] = useState<{
    nivel: NivelConHijosFecha;
    id: string;
    titulo: string;
    fechaActual: string;
  } | null>(null);
  const [historialTarget, setHistorialTarget] = useState<{
    tipo: TipoEntidadHistorial;
    id: string;
    titulo: string;
  } | null>(null);

  const migas: { label: string; onClick: () => void }[] = [
    {
      label: "Áreas",
      onClick: () => {
        setArea(null);
        setObjetivo(null);
        setProyecto(null);
        setEntregable(null);
      },
    },
  ];
  if (area)
    migas.push({
      label: area.nombre,
      onClick: () => {
        setObjetivo(null);
        setProyecto(null);
        setEntregable(null);
      },
    });
  if (objetivo)
    migas.push({
      label: objetivo.titulo,
      onClick: () => {
        setProyecto(null);
        setEntregable(null);
      },
    });
  if (proyecto)
    migas.push({ label: proyecto.titulo, onClick: () => setEntregable(null) });
  if (entregable) migas.push({ label: entregable.titulo, onClick: () => {} });

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-zinc-500">
        {migas.map((m, i) => {
          const esUltima = i === migas.length - 1;
          return (
            <React.Fragment key={i}>
              {i > 0 && <Icono.ChevronRight className="h-3.5 w-3.5" />}
              {esUltima ? (
                <span className="font-bold text-zinc-300">{m.label}</span>
              ) : (
                <button
                  onClick={m.onClick}
                  className="transition-all hover:text-zinc-300"
                >
                  {m.label}
                </button>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {!area && (
        <VistaAreas
          onEntrar={setArea}
          onEliminar={(id, titulo) =>
            setEliminarTarget({ nivel: "area", id, titulo })
          }
          onHistorial={(id, titulo) =>
            setHistorialTarget({ tipo: "area", id, titulo })
          }
        />
      )}
      {area && !objetivo && (
        <VistaObjetivos
          area={area}
          onEntrar={setObjetivo}
          onEliminar={(id, titulo) =>
            setEliminarTarget({ nivel: "objetivo", id, titulo })
          }
          onAjustarFecha={(id, titulo, fechaActual) =>
            setAjustarTarget({ nivel: "objetivo", id, titulo, fechaActual })
          }
          onHistorial={(id, titulo) =>
            setHistorialTarget({ tipo: "objetivo", id, titulo })
          }
        />
      )}
      {objetivo && !proyecto && (
        <VistaProyectos
          objetivo={objetivo}
          onEntrar={setProyecto}
          onEliminar={(id, titulo) =>
            setEliminarTarget({ nivel: "proyecto", id, titulo })
          }
          onAjustarFecha={(id, titulo, fechaActual) =>
            setAjustarTarget({ nivel: "proyecto", id, titulo, fechaActual })
          }
          onHistorial={(id, titulo) =>
            setHistorialTarget({ tipo: "proyecto", id, titulo })
          }
        />
      )}
      {proyecto && !entregable && (
        <VistaEntregables
          proyecto={proyecto}
          onEntrar={setEntregable}
          onEliminar={(id, titulo) =>
            setEliminarTarget({ nivel: "entregable", id, titulo })
          }
          onHistorial={(id, titulo) =>
            setHistorialTarget({ tipo: "entregable", id, titulo })
          }
        />
      )}
      {entregable && <VistaActividades entregable={entregable} />}

      {eliminarTarget && (
        <ConfirmarEliminacionNodo
          abierto
          nivel={eliminarTarget.nivel}
          id={eliminarTarget.id}
          titulo={eliminarTarget.titulo}
          onCerrar={() => setEliminarTarget(null)}
          onEliminado={() => setEliminarTarget(null)}
        />
      )}
      {ajustarTarget && (
        <AjustarFechaModal
          abierto
          nivel={ajustarTarget.nivel}
          id={ajustarTarget.id}
          titulo={ajustarTarget.titulo}
          fechaActual={ajustarTarget.fechaActual}
          onCerrar={() => setAjustarTarget(null)}
          onAjustado={() => setAjustarTarget(null)}
        />
      )}
      {historialTarget && (
        <Dialog
          abierto
          onClose={() => setHistorialTarget(null)}
          titulo={`Historial de "${historialTarget.titulo}"`}
          maxWidth="lg"
        >
          <PanelHistorialPersonal
            entidadTipo={historialTarget.tipo}
            entidadId={historialTarget.id}
          />
        </Dialog>
      )}
    </div>
  );
};
