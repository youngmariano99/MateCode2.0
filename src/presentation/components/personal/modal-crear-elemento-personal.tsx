"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import { GestionarAreasUseCase } from "../../../application/use-cases/personal/gestionar-areas.use-case";
import { GestionarObjetivosUseCase } from "../../../application/use-cases/personal/gestionar-objetivos.use-case";
import { GestionarProyectosPersonalUseCase } from "../../../application/use-cases/personal/gestionar-proyectos-personal.use-case";
import { GestionarEntregablesUseCase } from "../../../application/use-cases/personal/gestionar-entregables.use-case";
import { GestionarFasesUseCase } from "../../../application/use-cases/personal/gestionar-fases.use-case";
import { GestionarActividadesUseCase } from "../../../application/use-cases/personal/gestionar-actividades.use-case";
import { PALETA_COLORES_AREA } from "../../../domain/entidades/area-personal.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
  type PrioridadPendiente,
} from "../../../domain/entidades/personal.entity";

const areasUseCase = new GestionarAreasUseCase();
const objetivosUseCase = new GestionarObjetivosUseCase();
const proyectosUseCase = new GestionarProyectosPersonalUseCase();
const entregablesUseCase = new GestionarEntregablesUseCase();
const fasesUseCase = new GestionarFasesUseCase();
const actividadesUseCase = new GestionarActividadesUseCase();

export type TipoElementoCrear =
  "tarea" | "entregable" | "fase" | "proyecto" | "objetivo" | "area";

const TIPOS_DISPONIBLES: {
  id: TipoElementoCrear;
  label: string;
  ayuda: string;
}[] = [
  {
    id: "tarea",
    label: "Tarea / Actividad",
    ayuda:
      "Acción concreta para un día específico o para el backlog de pendientes (suelta o vinculada a un entregable).",
  },
  {
    id: "entregable",
    label: "Entregable",
    ayuda:
      "Trabajo medible o recurrente dentro de un Proyecto (ej. 'Envío de mensajes Lun–Vie').",
  },
  {
    id: "fase",
    label: "Fase",
    ayuda:
      "Bloque semanal o quincenal dentro de un Entregable con su propia cuota numérica.",
  },
  {
    id: "proyecto",
    label: "Proyecto",
    ayuda: "Frente de trabajo de mediano plazo que contribuye a un Objetivo.",
  },
  {
    id: "objetivo",
    label: "Objetivo",
    ayuda: "Meta cuantificable de largo/mediano plazo dentro de un Área.",
  },
  {
    id: "area",
    label: "Área",
    ayuda:
      "Categoría macro de tu vida o agencia (ej. Agencia y Finanzas, Salud).",
  },
];

const DIAS_SEMANA_OPTS = [
  { v: 1, l: "L" },
  { v: 2, l: "M" },
  { v: 3, l: "X" },
  { v: 4, l: "J" },
  { v: 5, l: "V" },
  { v: 6, l: "S" },
  { v: 0, l: "D" },
];

const campo =
  "w-full rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500/50";
const rotulo = "text-[11px] font-bold tracking-wider text-zinc-500 uppercase";

export interface ModalCrearElementoPersonalProps {
  abierto: boolean;
  onCerrar: () => void;
  tipoInicial?: TipoElementoCrear;
  padreInicialId?: string;
  diaInicial?: string;
  onCreado?: (id: string, tipo: TipoElementoCrear) => void;
}

export const ModalCrearElementoPersonal: React.FC<
  ModalCrearElementoPersonalProps
> = ({
  abierto,
  onCerrar,
  tipoInicial = "tarea",
  padreInicialId = "",
  diaInicial,
  onCreado,
}) => {
  const { mostrarToast } = useToast();
  const hoy = obtenerDiaTareaHoy();

  const [tipo, setTipo] = useState<TipoElementoCrear>(tipoInicial);
  const [guardando, setGuardando] = useState(false);

  const areas =
    useLiveQuery(() => db.area_personal.filter((a) => a.activa).toArray()) ??
    [];
  const objetivos =
    useLiveQuery(() =>
      db.objetivo_cuantificable
        .where("estado")
        .anyOf(["activo", "vencido"])
        .toArray()
    ) ?? [];
  const proyectos =
    useLiveQuery(() =>
      db.proyecto_personal
        .where("estado")
        .anyOf(["activo", "vencido"])
        .toArray()
    ) ?? [];
  const entregables =
    useLiveQuery(() =>
      db.entregable.where("estado").anyOf(["activo", "vencido"]).toArray()
    ) ?? [];
  const fases = useLiveQuery(() => db.fase_personal.toArray()) ?? [];

  // Campos compartidos
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [diaInicio, setDiaInicio] = useState(diaInicial ?? hoy);
  const [diaLimite, setDiaLimite] = useState(sumarDias(hoy, 30));
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState("");
  const [bandaAceptable, setBandaAceptable] = useState("75");

  // Vínculos padres según el tipo elegido
  const [areaId, setAreaId] = useState(
    tipoInicial === "objetivo" ? padreInicialId : ""
  );
  const [objetivoId, setObjetivoId] = useState(
    tipoInicial === "proyecto" ? padreInicialId : ""
  );
  const [proyectoId, setProyectoId] = useState(
    tipoInicial === "entregable" ? padreInicialId : ""
  );
  const [entregableId, setEntregableId] = useState(
    tipoInicial === "fase" || tipoInicial === "tarea" ? padreInicialId : ""
  );

  // Exclusivos de Área
  const [colorArea, setColorArea] = useState<string>(PALETA_COLORES_AREA[4]);

  // Exclusivos de Entregable
  const [modoEntregable, setModoEntregable] = useState<
    "cuantificable" | "continua_hasta_completar" | "puntual"
  >("cuantificable");
  const [esRecurrente, setEsRecurrente] = useState(false);
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]);

  // Exclusivos de Tarea / Actividad
  const [cuandoTarea, setCuandoTarea] = useState<"fecha" | "sin_fecha">(
    "fecha"
  );
  const [esEnfoque, setEsEnfoque] = useState(false);
  const [prioridadTarea, setPrioridadTarea] =
    useState<PrioridadPendiente>("importante");

  const limpiarFormulario = () => {
    setTitulo("");
    setDescripcion("");
    setCantidad("");
    setUnidad("");
  };

  const guardar = async (crearOtro: boolean) => {
    setGuardando(true);
    try {
      let idCreado = "";

      if (tipo === "area") {
        const res = await areasUseCase.crearArea({
          nombre: titulo,
          descripcion: descripcion || undefined,
          color: colorArea,
        });
        if (!res.ok) {
          mostrarToast(res.error!.mensaje, "error");
          return;
        }
        idCreado = res.valor!;
        mostrarToast(`Área "${titulo}" creada.`, "exito");
      } else if (tipo === "objetivo") {
        const res = await objetivosUseCase.crearObjetivo({
          titulo,
          areaId: areaId || undefined,
          cantidadObjetivo: Number(cantidad),
          unidad,
          diaInicio,
          diaLimite,
          bandaAceptable: bandaAceptable ? Number(bandaAceptable) : undefined,
        });
        if (!res.ok) {
          mostrarToast(res.error!.mensaje, "error");
          return;
        }
        idCreado = res.valor!;
        mostrarToast(`Objetivo "${titulo}" creado.`, "exito");
      } else if (tipo === "proyecto") {
        if (!objetivoId) {
          mostrarToast(
            "Elegí a qué Objetivo pertenece este Proyecto.",
            "error"
          );
          return;
        }
        const res = await proyectosUseCase.crearProyecto({
          objetivoId,
          titulo,
          descripcion: descripcion || undefined,
          diaInicio,
          diaLimite,
          cantidadObjetivo: cantidad ? Number(cantidad) : undefined,
          unidad: cantidad ? unidad : undefined,
        });
        if (!res.ok) {
          mostrarToast(res.error!.mensaje, "error");
          return;
        }
        idCreado = res.valor!;
        mostrarToast(`Proyecto "${titulo}" creado.`, "exito");
      } else if (tipo === "entregable") {
        const proy = proyectos.find((p) => p.id === proyectoId);
        if (!proy) {
          mostrarToast(
            "Elegí a qué Proyecto pertenece este Entregable.",
            "error"
          );
          return;
        }
        const usarRecurrencia =
          modoEntregable === "continua_hasta_completar" || esRecurrente;
        const usarCantidad =
          modoEntregable === "cuantificable" && Boolean(cantidad);
        const fechaFinEfectiva =
          modoEntregable === "continua_hasta_completar"
            ? proy.diaLimite > diaInicio
              ? proy.diaLimite
              : sumarDias(diaInicio, 180)
            : diaLimite;

        const res = await entregablesUseCase.crearEntregable({
          proyectoId: proy.id,
          objetivoId: proy.objetivoId,
          titulo,
          descripcion: descripcion || undefined,
          diaInicio,
          diaLimite: fechaFinEfectiva,
          cantidadObjetivo: usarCantidad ? Number(cantidad) : undefined,
          unidad: usarCantidad ? unidad || "unidades" : undefined,
          recurrencia: usarRecurrencia
            ? { frecuencia: "dias_especificos", diasSemana }
            : undefined,
        });
        if (!res.ok) {
          mostrarToast(res.error!.mensaje, "error");
          return;
        }
        idCreado = res.valor!;
        mostrarToast(`Entregable "${titulo}" creado.`, "exito");
      } else if (tipo === "fase") {
        const ent = entregables.find((e) => e.id === entregableId);
        if (!ent) {
          mostrarToast("Elegí a qué Entregable pertenece esta Fase.", "error");
          return;
        }
        const orden = fases.filter((f) => f.entregableId === ent.id).length;
        const res = await fasesUseCase.crearFase({
          entregableId: ent.id,
          titulo,
          orden,
          diaInicio,
          diaLimite,
          cantidadObjetivo: Number(cantidad),
          unidad: unidad || ent.unidad || "unidades",
          bandaAceptable: bandaAceptable ? Number(bandaAceptable) : undefined,
        });
        if (!res.ok) {
          mostrarToast(res.error!.mensaje, "error");
          return;
        }
        idCreado = res.valor!;
        mostrarToast(`Fase "${titulo}" creada.`, "exito");
      } else if (tipo === "tarea") {
        const ent = entregables.find((e) => e.id === entregableId);
        const sinFecha = cuandoTarea === "sin_fecha";
        const res = await actividadesUseCase.crearActividad({
          descripcion: titulo,
          entregableId: ent?.id,
          proyectoId: ent?.proyectoId,
          objetivoId: ent?.objetivoId,
          tipo: sinFecha ? "backlog" : esEnfoque ? "enfoque" : "mantenimiento",
          diaTarea: sinFecha ? undefined : diaInicio,
          prioridad: sinFecha ? prioridadTarea : undefined,
          cantidadObjetivo: cantidad ? Number(cantidad) : undefined,
          unidad: cantidad ? unidad || ent?.unidad || "unidades" : undefined,
        });
        if (!res.ok) {
          mostrarToast(res.error!.mensaje, "error");
          return;
        }
        idCreado = res.valor!;
        mostrarToast(
          sinFecha
            ? "Tarea guardada en el backlog de pendientes."
            : `Tarea agendada para el ${diaInicio}.`,
          "exito"
        );
      }

      onCreado?.(idCreado, tipo);
      limpiarFormulario();
      if (!crearOtro) onCerrar();
    } finally {
      setGuardando(false);
    }
  };

  const infoTipoActual = TIPOS_DISPONIBLES.find((t) => t.id === tipo)!;

  return (
    <Dialog
      abierto={abierto}
      onClose={onCerrar}
      titulo="Agregar a tu Planificación"
      maxWidth="lg"
      footer={
        <>
          <button
            onClick={onCerrar}
            className="min-h-11 rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
          >
            Cancelar
          </button>
          <Button
            variant="outline"
            onClick={() => void guardar(true)}
            disabled={!titulo.trim()}
            cargando={guardando}
          >
            Guardar y agregar otro
          </Button>
          <Button
            onClick={() => void guardar(false)}
            disabled={!titulo.trim()}
            cargando={guardando}
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className={rotulo}>¿Qué querés agregar?</span>
          <div className="flex flex-wrap gap-1.5">
            {TIPOS_DISPONIBLES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTipo(t.id)}
                className={`min-h-9 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                  tipo === t.id
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-[#2A2A2E] bg-[#0D0D0F] text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500">{infoTipoActual.ayuda}</p>
        </div>

        {/* Selector de Padre según el nivel */}
        {tipo === "objetivo" && (
          <div className="flex flex-col gap-1">
            <span className={rotulo}>Área a la que pertenece</span>
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className={campo}
            >
              <option value="">Seleccionar Área…</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {tipo === "proyecto" && (
          <div className="flex flex-col gap-1">
            <span className={rotulo}>Objetivo padre (obligatorio)</span>
            <select
              value={objetivoId}
              onChange={(e) => setObjetivoId(e.target.value)}
              className={campo}
            >
              <option value="">Seleccionar Objetivo…</option>
              {objetivos.map((o) => {
                const area = areas.find((a) => a.id === o.areaId);
                return (
                  <option key={o.id} value={o.id}>
                    {area ? `[${area.nombre}] ` : ""}
                    {o.titulo}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {tipo === "entregable" && (
          <div className="flex flex-col gap-1">
            <span className={rotulo}>Proyecto padre (obligatorio)</span>
            <select
              value={proyectoId}
              onChange={(e) => setProyectoId(e.target.value)}
              className={campo}
            >
              <option value="">Seleccionar Proyecto…</option>
              {proyectos.map((p) => {
                const obj = objetivos.find((o) => o.id === p.objetivoId);
                return (
                  <option key={p.id} value={p.id}>
                    {obj ? `${obj.titulo} → ` : ""}
                    {p.titulo}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {(tipo === "fase" || tipo === "tarea") && (
          <div className="flex flex-col gap-1">
            <span className={rotulo}>
              {tipo === "fase"
                ? "Entregable padre (obligatorio)"
                : "Vincular a un Entregable (opcional — si es suelta dejalo vacío)"}
            </span>
            <select
              value={entregableId}
              onChange={(e) => setEntregableId(e.target.value)}
              className={campo}
            >
              <option value="">
                {tipo === "fase"
                  ? "Seleccionar Entregable…"
                  : "Tarea suelta (sin entregable padre)"}
              </option>
              {entregables.map((e) => {
                const proy = proyectos.find((p) => p.id === e.proyectoId);
                return (
                  <option key={e.id} value={e.id}>
                    {proy ? `${proy.titulo} → ` : ""}
                    {e.titulo}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Nombre / Título / Descripción principal */}
        <div className="flex flex-col gap-1">
          <span className={rotulo}>
            {tipo === "tarea" ? "Qué hay que hacer" : "Título / Nombre"}
          </span>
          <input
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={
              tipo === "area"
                ? "Ej: Agencia y Finanzas"
                : tipo === "objetivo"
                  ? "Ej: Facturar $2.900.000 ARS mensuales"
                  : tipo === "proyecto"
                    ? "Ej: Motor de Prospección en Frío"
                    : tipo === "entregable"
                      ? "Ej: Envío de pitches personalizados"
                      : tipo === "fase"
                        ? "Ej: Semana 1 — Arranque"
                        : "Ej: Enviar 10 mensajes de prospección"
            }
            className={campo}
          />
        </div>

        {/* Color para Área */}
        {tipo === "area" && (
          <div className="flex flex-col gap-1.5">
            <span className={rotulo}>Color identificatorio</span>
            <div className="flex flex-wrap gap-2">
              {PALETA_COLORES_AREA.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorArea(c)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${
                    colorArea === c
                      ? "scale-110 border-white"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Opciones de Cuándo para Tarea */}
        {tipo === "tarea" && (
          <div className="flex flex-col gap-3 rounded-xl border border-[#2A2A2E] bg-[#141417] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCuandoTarea("fecha");
                  setDiaInicio(hoy);
                }}
                className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                  cuandoTarea === "fecha" && diaInicio === hoy
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-[#2A2A2E] text-zinc-400"
                }`}
              >
                Hoy ({hoy})
              </button>
              <button
                type="button"
                onClick={() => {
                  setCuandoTarea("fecha");
                  setDiaInicio(sumarDias(hoy, 1));
                }}
                className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                  cuandoTarea === "fecha" && diaInicio === sumarDias(hoy, 1)
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-[#2A2A2E] text-zinc-400"
                }`}
              >
                Mañana
              </button>
              <input
                type="date"
                value={diaInicio}
                onChange={(e) => {
                  setCuandoTarea("fecha");
                  setDiaInicio(e.target.value);
                }}
                className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2.5 py-1 text-xs text-zinc-200"
              />
              <button
                type="button"
                onClick={() => setCuandoTarea("sin_fecha")}
                className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                  cuandoTarea === "sin_fecha"
                    ? "border-sky-500/40 bg-sky-500/10 text-sky-400"
                    : "border-[#2A2A2E] text-zinc-400"
                }`}
              >
                Sin fecha (Backlog)
              </button>
            </div>

            {cuandoTarea === "fecha" ? (
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={esEnfoque}
                  onChange={(e) => setEsEnfoque(e.target.checked)}
                />
                Es LA prioridad #1 (Enfoque) de ese día
              </label>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Prioridad:</span>
                {(["urgente", "importante", "puede_esperar"] as const).map(
                  (p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrioridadTarea(p)}
                      className={`rounded border px-2 py-1 text-[11px] font-bold uppercase ${
                        prioridadTarea === p
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : "border-[#2A2A2E] text-zinc-500"
                      }`}
                    >
                      {p.replace("_", " ")}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* Selector de modo para Entregable */}
        {tipo === "entregable" && (
          <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#141417] p-3">
            <span className={rotulo}>¿Cómo funciona este entregable?</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setModoEntregable("cuantificable")}
                className={`flex flex-col items-start gap-0.5 rounded-lg border p-2.5 text-left transition-all ${
                  modoEntregable === "cuantificable"
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-[#2A2A2E] bg-[#0D0D0F] text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span className="text-xs font-bold">1. Por cantidad</span>
                <span className="text-[11px] opacity-80">
                  Ej: 200 contactos, 12 videos (podés armar fases).
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModoEntregable("continua_hasta_completar");
                  setEsRecurrente(true);
                }}
                className={`flex flex-col items-start gap-0.5 rounded-lg border p-2.5 text-left transition-all ${
                  modoEntregable === "continua_hasta_completar"
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-[#2A2A2E] bg-[#0D0D0F] text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span className="text-xs font-bold">
                  2. Continua hasta terminar
                </span>
                <span className="text-[11px] opacity-80">
                  Aparece Lun–Vie para anotar en el día qué hiciste hasta darle
                  Terminado.
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModoEntregable("puntual");
                  setEsRecurrente(false);
                }}
                className={`flex flex-col items-start gap-0.5 rounded-lg border p-2.5 text-left transition-all ${
                  modoEntregable === "puntual"
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-[#2A2A2E] bg-[#0D0D0F] text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span className="text-xs font-bold">3. Hito / Plazo fijo</span>
                <span className="text-[11px] opacity-80">
                  Entregable puntual con fecha límite sin cuota diaria.
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Fechas de inicio y límite para Objetivo / Proyecto / Entregable / Fase */}
        {tipo !== "area" &&
          tipo !== "tarea" &&
          !(
            tipo === "entregable" &&
            modoEntregable === "continua_hasta_completar"
          ) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className={rotulo}>Fecha de inicio</span>
                <input
                  type="date"
                  value={diaInicio}
                  onChange={(e) => setDiaInicio(e.target.value)}
                  className={campo}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className={rotulo}>Fecha límite</span>
                <input
                  type="date"
                  value={diaLimite}
                  onChange={(e) => setDiaLimite(e.target.value)}
                  className={campo}
                />
              </div>
            </div>
          )}

        {/* Cantidad y unidad */}
        {tipo !== "area" &&
          !(
            tipo === "entregable" &&
            (modoEntregable === "continua_hasta_completar" ||
              modoEntregable === "puntual")
          ) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <span className={rotulo}>
                  Cantidad meta{" "}
                  {tipo === "objetivo" ||
                  tipo === "fase" ||
                  (tipo === "entregable" && modoEntregable === "cuantificable")
                    ? "(obligatoria)"
                    : "(opcional)"}
                </span>
                <input
                  type="number"
                  min={1}
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="Ej: 100"
                  className={campo}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className={rotulo}>Unidad</span>
                <input
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  placeholder="Ej: contactos, ARS, videos"
                  className={campo}
                />
              </div>
              {(tipo === "objetivo" || tipo === "fase") && (
                <div className="flex flex-col gap-1">
                  <span className={rotulo}>% Aceptable</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={bandaAceptable}
                    onChange={(e) => setBandaAceptable(e.target.value)}
                    placeholder="75"
                    className={campo}
                  />
                </div>
              )}
            </div>
          )}

        {/* Recurrencia para Entregable */}
        {tipo === "entregable" && modoEntregable !== "puntual" && (
          <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#141417] p-3">
            {modoEntregable === "continua_hasta_completar" ? (
              <span className={rotulo}>
                ¿Qué días querés que aparezca hasta que la des por terminada?
              </span>
            ) : (
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={esRecurrente}
                  onChange={(e) => setEsRecurrente(e.target.checked)}
                />
                Generar automáticamente en días fijos de la semana
              </label>
            )}
            {(modoEntregable === "continua_hasta_completar" ||
              esRecurrente) && (
              <div className="flex flex-wrap gap-1.5">
                {DIAS_SEMANA_OPTS.map((d) => {
                  const activo = diasSemana.includes(d.v);
                  return (
                    <button
                      key={d.v}
                      type="button"
                      onClick={() =>
                        setDiasSemana((prev) =>
                          activo
                            ? prev.filter((x) => x !== d.v)
                            : [...prev, d.v]
                        )
                      }
                      className={`h-8 w-8 rounded-lg border text-xs font-bold ${
                        activo
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                          : "border-[#2A2A2E] text-zinc-500"
                      }`}
                    >
                      {d.l}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};

export const BotonCrearUniversal: React.FC<{
  tipoPorDefecto?: TipoElementoCrear;
}> = ({ tipoPorDefecto = "tarea" }) => {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button onClick={() => setAbierto(true)}>
        <Icono.Plus className="mr-1.5 h-4 w-4" />
        Crear elemento
      </Button>
      {abierto && (
        <ModalCrearElementoPersonal
          abierto
          onCerrar={() => setAbierto(false)}
          tipoInicial={tipoPorDefecto}
        />
      )}
    </>
  );
};
