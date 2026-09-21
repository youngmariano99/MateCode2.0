"use client";

import React, { useState } from "react";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { Icono } from "../icons";
import { Chips } from "../contacto-frio/piezas-cinta";
import { useToast } from "../../hooks/useToast";
import { useProyectosDeTrabajo } from "./detalle-actividad";
import { GestionarActividadesUseCase } from "../../../application/use-cases/personal/gestionar-actividades.use-case";
import type { PrioridadActividad } from "../../../domain/entidades/actividad.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
  type AreaPendiente,
} from "../../../domain/entidades/personal.entity";

const useCase = new GestionarActividadesUseCase();

type Prioridad = PrioridadActividad | "normal";
type Cuando = "fecha" | "sin_fecha";

const OPCIONES_PRIORIDAD: { valor: Prioridad; etiqueta: string }[] = [
  { valor: "normal", etiqueta: "Normal" },
  { valor: "urgente", etiqueta: "Urgente" },
  { valor: "importante", etiqueta: "Importante" },
  { valor: "puede_esperar", etiqueta: "Puede esperar" },
];

const campo =
  "w-full rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500/50";
const rotulo = "text-[11px] font-bold tracking-wider text-zinc-500 uppercase";

/**
 * Formulario completo para agregar una tarea: qué, cuándo (un día concreto o
 * sin fecha, para el backlog), prioridad, si es LA prioridad del día, área,
 * proyecto y nota. Se abre desde cualquier calendario con el día ya elegido.
 */
export const NuevaTareaModal: React.FC<{
  abierto: boolean;
  onCerrar: () => void;
  diaInicial?: string;
  descripcionInicial?: string;
}> = ({ abierto, onCerrar, diaInicial, descripcionInicial }) => {
  const { mostrarToast } = useToast();
  const proyectos = useProyectosDeTrabajo();
  const [descripcion, setDescripcion] = useState(descripcionInicial ?? "");
  const [cuando, setCuando] = useState<Cuando>("fecha");
  const [dia, setDia] = useState(diaInicial ?? obtenerDiaTareaHoy());
  const [prioridad, setPrioridad] = useState<Prioridad>("normal");
  const [foco, setFoco] = useState(false);
  const [area, setArea] = useState<AreaPendiente | "">("");
  const [proyectoId, setProyectoId] = useState("");
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  const reiniciar = () => {
    setDescripcion("");
    setPrioridad("normal");
    setFoco(false);
    setArea("");
    setProyectoId("");
    setNota("");
  };

  const guardar = async (otra: boolean) => {
    if (!descripcion.trim()) return;
    setGuardando(true);
    const sinFecha = cuando === "sin_fecha";
    const res = await useCase.crearActividad({
      descripcion,
      tipo: sinFecha ? "backlog" : foco ? "enfoque" : "mantenimiento",
      diaTarea: sinFecha ? undefined : dia,
      prioridad:
        prioridad === "normal"
          ? sinFecha
            ? "importante"
            : undefined
          : prioridad,
      area: area || undefined,
    });
    if (res.ok && (proyectoId || nota.trim())) {
      await useCase.editarDetalle(res.valor!, {
        nota: nota.trim() || undefined,
        proyectoTrabajoId: proyectoId || undefined,
      });
    }
    setGuardando(false);
    if (!res.ok) {
      mostrarToast(res.error!.mensaje, "error");
      return;
    }
    mostrarToast(
      sinFecha
        ? "Tarea guardada en pendientes (sin fecha)."
        : `Tarea agregada al ${dia}.`,
      "exito"
    );
    if (otra) reiniciar();
    else {
      reiniciar();
      onCerrar();
    }
  };

  return (
    <Dialog
      abierto={abierto}
      onClose={onCerrar}
      titulo="Nueva tarea"
      maxWidth="md"
      footer={
        <>
          <button
            onClick={onCerrar}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
          >
            Cancelar
          </button>
          <Button
            variant="outline"
            onClick={() => void guardar(true)}
            disabled={!descripcion.trim()}
            cargando={guardando}
          >
            Guardar y agregar otra
          </Button>
          <Button
            onClick={() => void guardar(false)}
            disabled={!descripcion.trim()}
            cargando={guardando}
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className={rotulo}>Qué hay que hacer</span>
          <input
            autoFocus
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void guardar(false);
            }}
            placeholder="Ej: Llamar al contador"
            className={campo}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className={rotulo}>Cuándo</span>
          <Chips
            valor={cuando}
            onChange={setCuando}
            opciones={[
              { valor: "fecha", etiqueta: "Un día concreto" },
              { valor: "sin_fecha", etiqueta: "Sin fecha (pendientes)" },
            ]}
          />
          {cuando === "fecha" ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className={`${campo} w-auto`}
              />
              <button
                onClick={() => setDia(obtenerDiaTareaHoy())}
                className="text-xs font-bold text-emerald-400 uppercase"
              >
                Hoy
              </button>
              <button
                onClick={() => setDia(sumarDias(obtenerDiaTareaHoy(), 1))}
                className="text-xs font-bold text-emerald-400 uppercase"
              >
                Mañana
              </button>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              Queda en Pendientes de la pestaña Semana; la asignás a un día
              cuando puedas.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className={rotulo}>Prioridad</span>
          <Chips
            valor={prioridad}
            onChange={setPrioridad}
            opciones={OPCIONES_PRIORIDAD}
          />
          {cuando === "fecha" && (
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={foco}
                onChange={(e) => setFoco(e.target.checked)}
              />
              Es LA prioridad de ese día (lo primero que tengo que hacer)
            </label>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className={rotulo}>Área (opcional)</span>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value as AreaPendiente | "")}
              className={campo}
            >
              <option value="">Sin área</option>
              <option value="profesional">Profesional</option>
              <option value="personal">Personal</option>
              <option value="ambas">Ambas</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className={rotulo}>Proyecto (opcional)</span>
            <select
              value={proyectoId}
              onChange={(e) => setProyectoId(e.target.value)}
              className={campo}
            >
              <option value="">Sin proyecto</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className={rotulo}>Nota (opcional)</span>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            className={campo}
          />
        </div>
      </div>
    </Dialog>
  );
};

/** Botón "+ Nueva tarea" que abre el formulario completo (con el día ya elegido si se pasa). */
export const BotonNuevaTarea: React.FC<{
  dia?: string;
  etiqueta?: string;
  compacto?: boolean;
}> = ({ dia, etiqueta = "Nueva tarea", compacto }) => {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      {compacto ? (
        <button
          onClick={() => setAbierto(true)}
          title="Agregar tarea a este día"
          className="rounded p-0.5 text-zinc-600 hover:bg-emerald-500/10 hover:text-emerald-400"
        >
          <Icono.Plus className="h-3.5 w-3.5" />
        </button>
      ) : (
        <Button onClick={() => setAbierto(true)}>
          <Icono.Plus className="mr-1 h-4 w-4" />
          {etiqueta}
        </Button>
      )}
      {abierto && (
        <NuevaTareaModal
          abierto
          onCerrar={() => setAbierto(false)}
          diaInicial={dia}
        />
      )}
    </>
  );
};

type CuandoRapido = "hoy" | "manana" | "sin_fecha";

/**
 * Captura rápida de tareas, como la bandeja de ideas pero con decisión: un
 * campo, un día (hoy / mañana / sin fecha) y la prioridad, y Enter. Para
 * algo más detallado (fecha puntual, proyecto, nota) abre el formulario.
 */
export const TareaRapida: React.FC = () => {
  const { mostrarToast } = useToast();
  const [texto, setTexto] = useState("");
  const [cuando, setCuando] = useState<CuandoRapido>("hoy");
  const [prioridad, setPrioridad] = useState<Prioridad>("normal");
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!texto.trim()) return;
    setGuardando(true);
    const hoy = obtenerDiaTareaHoy();
    const sinFecha = cuando === "sin_fecha";
    const res = await useCase.crearActividad({
      descripcion: texto,
      tipo: sinFecha ? "backlog" : "mantenimiento",
      diaTarea: sinFecha
        ? undefined
        : cuando === "hoy"
          ? hoy
          : sumarDias(hoy, 1),
      prioridad:
        prioridad === "normal"
          ? sinFecha
            ? "importante"
            : undefined
          : prioridad,
    });
    setGuardando(false);
    if (res.ok) {
      setTexto("");
      mostrarToast(
        sinFecha
          ? "Guardada en pendientes."
          : cuando === "hoy"
            ? "Agregada a hoy."
            : "Agregada para mañana.",
        "exito"
      );
    } else mostrarToast(res.error!.mensaje, "error");
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center gap-2">
        <Icono.ListTodo className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Tarea rápida
        </h3>
      </div>
      <div className="flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void guardar();
          }}
          placeholder="Escribí la tarea y Enter…"
          className={campo}
        />
        <Button
          onClick={() => void guardar()}
          disabled={!texto.trim()}
          cargando={guardando}
        >
          Agregar
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Chips
          valor={cuando}
          onChange={setCuando}
          opciones={[
            { valor: "hoy", etiqueta: "Hoy" },
            { valor: "manana", etiqueta: "Mañana" },
            { valor: "sin_fecha", etiqueta: "Sin fecha" },
          ]}
        />
        <Chips
          valor={prioridad}
          onChange={setPrioridad}
          opciones={OPCIONES_PRIORIDAD}
        />
        <button
          onClick={() => setModal(true)}
          className="text-xs font-bold text-emerald-400 uppercase hover:underline"
        >
          Más opciones…
        </button>
      </div>
      {modal && (
        <NuevaTareaModal
          abierto
          onCerrar={() => setModal(false)}
          descripcionInicial={texto}
          diaInicial={
            cuando === "manana" ? sumarDias(obtenerDiaTareaHoy(), 1) : undefined
          }
        />
      )}
    </div>
  );
};
