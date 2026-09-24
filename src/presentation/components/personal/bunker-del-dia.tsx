"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { DetalleActividad } from "./detalle-actividad";
import { ChipsMotivoDesvio } from "./chips-motivo-desvio";
import { Icono } from "../icons";
import { Badge, type BadgeColor } from "../badge";
import { useToast } from "../../hooks/useToast";
import { GestionarActividadesUseCase } from "../../../application/use-cases/personal/gestionar-actividades.use-case";
import {
  MAX_TAREAS_ENFOQUE_POR_DIA,
  MAX_TAREAS_MANTENIMIENTO_POR_DIA,
  BUCKETS_DIA,
  ETIQUETA_BUCKET,
  bucketDeActividad,
  type Actividad,
  type BucketDia,
  type DestinoFaltante,
  type EstadoActividad,
  type MotivoDesvio,
} from "../../../domain/entidades/actividad.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";
import { useAreaPorObjetivo, type AreaDeTarea } from "./calendario-utils";

const useCase = new GestionarActividadesUseCase();
const SIN_ACTIVIDADES: Actividad[] = [];

const ETIQUETA_ESTADO_RESUELTO: Partial<Record<EstadoActividad, string>> = {
  completada: "Hecha",
  cancelada: "Cancelada",
  migrada: "Pasó a otro día",
  descartada: "Descartada",
};

const COLOR_ESTADO_RESUELTO: Partial<Record<EstadoActividad, BadgeColor>> = {
  completada: "emerald",
  cancelada: "zinc",
  migrada: "sky",
  descartada: "zinc",
};

const porCreacion = (a: Actividad, b: Actividad) => a.creadoEn - b.creadoEn;

/** Área de la tarea: punto de color + nombre — la forma de distinguir de un vistazo a qué frente pertenece. */
const ChipArea: React.FC<{ area: AreaDeTarea }> = ({ area }) => (
  <span className="flex items-center gap-1 text-[10px] text-zinc-500">
    <span
      className="h-2 w-2 rounded-full"
      style={{ backgroundColor: area.color }}
    />
    {area.nombre}
  </span>
);

/**
 * Input de avance parcial — solo aparece en Actividades cuantificables
 * (`cantidadObjetivo` declarado): "hice 1 de 2" es tan válido como "hice los
 * 2", y se puede seguir sumando (registrarAvance acumula, no reemplaza).
 */
const AvanceParcial: React.FC<{ actividad: Actividad }> = ({ actividad }) => {
  const { mostrarToast } = useToast();
  const [cantidad, setCantidad] = useState("");
  const [guardando, setGuardando] = useState(false);

  const agregar = async () => {
    const valor = Number(cantidad);
    if (!Number.isFinite(valor) || valor === 0) return;
    setGuardando(true);
    const res = await useCase.registrarAvance(actividad.id, valor);
    setGuardando(false);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
    else setCantidad("");
  };

  const progreso = actividad.progresoActual ?? 0;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-zinc-500">
        {progreso}/{actividad.cantidadObjetivo} {actividad.unidad || ""}
        {actividad.cantidadMinima !== undefined &&
          actividad.cantidadMinima < (actividad.cantidadObjetivo ?? 0) && (
            <span className="ml-1 text-sky-400">
              · mín. {actividad.cantidadMinima}
            </span>
          )}
      </span>
      <input
        type="number"
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void agregar();
        }}
        placeholder="+cant."
        className="w-14 rounded border border-[#2A2A2E] bg-transparent px-1.5 py-0.5 text-[10px] text-zinc-200 placeholder-zinc-700 outline-none focus:border-emerald-500/40"
      />
      <button
        onClick={() => void agregar()}
        disabled={guardando || !cantidad}
        title="Agregar avance"
        className="rounded border border-emerald-500/20 bg-emerald-500/10 p-1 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40"
      >
        <Icono.Plus className="h-3 w-3" />
      </button>
    </div>
  );
};

/**
 * Cierre de una tarea cuantificable: "¿cuánto hiciste?" — si quedó por debajo
 * de la meta, se elige qué hacer con lo que faltó (pasarlo a mañana sumándolo
 * a la tarea de ese día, dejarlo en el fondo de faltantes, o descartarlo).
 * Nada se pierde en silencio: lo hecho queda como parcial y el faltante va
 * a donde se elija.
 */
const CierreConCantidad: React.FC<{
  actividad: Actividad;
  onListo: () => void;
}> = ({ actividad, onListo }) => {
  const { mostrarToast } = useToast();
  const meta = actividad.cantidadObjetivo ?? 0;
  const [hecha, setHecha] = useState(String(actividad.progresoActual ?? meta));
  const [destino, setDestino] = useState<DestinoFaltante | null>(null);
  const [guardando, setGuardando] = useState(false);

  const hechaNum = Number(hecha);
  const valida = hecha !== "" && Number.isFinite(hechaNum) && hechaNum >= 0;
  const faltante = valida ? Math.max(0, meta - hechaNum) : 0;
  const puedeCerrar = valida && (faltante === 0 || destino !== null);

  const cerrar = async () => {
    setGuardando(true);
    const res = await useCase.cerrarConCantidad({
      id: actividad.id,
      hecha: hechaNum,
      destino: faltante > 0 ? (destino ?? undefined) : undefined,
    });
    setGuardando(false);
    if (res.ok) onListo();
    else mostrarToast(res.error!.mensaje, "error");
  };

  const OPCIONES: { id: DestinoFaltante; label: string }[] = [
    { id: "manana", label: "Pasarlo a mañana (se suma)" },
    { id: "fondo", label: "Dejarlo en el fondo de faltantes" },
    { id: "descartar", label: "Descartarlo" },
  ];

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
      <span className="text-sm text-zinc-300">{actividad.descripcion}</span>
      <label className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        ¿Cuánto hiciste?
        <input
          type="number"
          min={0}
          value={hecha}
          onChange={(e) => setHecha(e.target.value)}
          className="w-20 rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
        />
        <span>
          de {meta} {actividad.unidad || ""}
        </span>
        {actividad.cantidadMinima !== undefined &&
          actividad.cantidadMinima < meta && (
            <button
              onClick={() => {
                setHecha(String(actividad.cantidadMinima));
                setDestino("fondo");
              }}
              className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-300 uppercase hover:bg-sky-500/20"
            >
              Solo el mínimo ({actividad.cantidadMinima})
            </button>
          )}
      </label>
      {faltante > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-amber-400">
            Faltan {faltante} {actividad.unidad || ""} — ¿qué hacemos con eso?
          </span>
          <div className="flex flex-wrap gap-1.5">
            {OPCIONES.map((o) => (
              <button
                key={o.id}
                onClick={() => setDestino(o.id)}
                className={`flex min-h-11 items-center rounded border px-3 text-[10px] font-bold uppercase ${
                  destino === o.id
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-[#2A2A2E] text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <Button
          onClick={() => void cerrar()}
          cargando={guardando}
          disabled={!puedeCerrar}
          className="px-3 py-1.5 text-xs"
        >
          Cerrar tarea
        </Button>
        <button
          onClick={onListo}
          className="text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
        >
          Volver
        </button>
      </div>
    </div>
  );
};

/** Categoría de la tarea con cambio en dos toques: tocás la etiqueta y elegís otra (Prioridad / Mantenimiento / Si llego). */
const SelectorCategoria: React.FC<{ actividad: Actividad }> = ({
  actividad,
}) => {
  const { mostrarToast } = useToast();
  const [abierto, setAbierto] = useState(false);
  const actual = bucketDeActividad(actividad);

  const elegir = async (destino: BucketDia) => {
    setAbierto(false);
    if (destino === actual) return;
    const res = await useCase.reclasificarActividad(actividad.id, destino);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        title="Cambiar categoría"
        className="flex items-center gap-0.5 rounded border border-[#2A2A2E] px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 uppercase hover:border-zinc-600"
      >
        {ETIQUETA_BUCKET[actual]}
        <Icono.ChevronDown className="h-3 w-3" />
      </button>
    );
  }
  return (
    <div className="flex gap-1">
      {BUCKETS_DIA.map((b) => (
        <button
          key={b}
          onClick={() => void elegir(b)}
          className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${
            b === actual
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-[#2A2A2E] text-zinc-400 hover:border-emerald-500/40"
          }`}
        >
          {ETIQUETA_BUCKET[b]}
        </button>
      ))}
    </div>
  );
};

type ModoFila = "hoy" | "anterior" | "proxima";

/**
 * Tarea pendiente — acciones con texto visible: "Hecha" la manda al final
 * tachada, "Mañana" (o "A hoy" si quedó de antes o es de un día futuro) la
 * mueve, "Cancelar" la deja marcada — ninguna borra nada. El color y el
 * nombre del Área, y la categoría (con cambio rápido) se ven sin abrir nada.
 */
const FilaActividad: React.FC<{
  actividad: Actividad;
  area: AreaDeTarea;
  modo: ModoFila;
  hoy: string;
}> = ({ actividad, area, modo, hoy }) => {
  const { mostrarToast } = useToast();
  const [cerrando, setCerrando] = useState(false);
  // Al pasar a mañana o cancelar se pregunta el motivo (opcional, un tap) —
  // queda en el historial para ver patrones de desvío en el repaso semanal.
  const [pidiendoMotivo, setPidiendoMotivo] = useState<
    "migrar" | "cancelar" | null
  >(null);

  const completar = async () => {
    if (actividad.cantidadObjetivo !== undefined) {
      setCerrando(true);
      return;
    }
    const res = await useCase.completarActividad(actividad.id);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  const aHoy = async () => {
    const res = await useCase.migrarActividad({
      id: actividad.id,
      nuevoDiaTarea: hoy,
    });
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  const resolverConMotivo = async (motivo?: MotivoDesvio) => {
    const accion = pidiendoMotivo;
    setPidiendoMotivo(null);
    const res =
      accion === "migrar"
        ? await useCase.migrarActividad({
            id: actividad.id,
            nuevoDiaTarea: sumarDias(actividad.diaTarea ?? hoy, 1),
            motivo,
          })
        : await useCase.cancelarActividad(actividad.id, motivo);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  if (cerrando) {
    return (
      <CierreConCantidad
        actividad={actividad}
        onListo={() => setCerrando(false)}
      />
    );
  }

  if (pidiendoMotivo) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
        <span className="text-sm text-zinc-300">
          {actividad.descripcion}{" "}
          <span className="text-zinc-600">
            —{" "}
            {pidiendoMotivo === "migrar"
              ? "pasa a mañana"
              : "se cancela (no se borra)"}
            . ¿Por qué?
          </span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          <ChipsMotivoDesvio onElegir={(m) => void resolverConMotivo(m)} />
          <button
            onClick={() => void resolverConMotivo(undefined)}
            className="flex min-h-11 items-center rounded px-3 text-[10px] font-bold text-zinc-600 uppercase hover:text-zinc-300"
          >
            Omitir
          </button>
          <button
            onClick={() => setPidiendoMotivo(null)}
            className="flex min-h-11 items-center rounded px-3 text-[10px] font-bold text-zinc-600 uppercase hover:text-zinc-300"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-l-[3px] border-[#2A2A2E] bg-[#0D0D0F] p-3 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderLeftColor: area.color }}
    >
      <div className="flex flex-col gap-1">
        <span className="text-sm text-zinc-200">{actividad.descripcion}</span>
        <div className="flex flex-wrap items-center gap-2">
          <ChipArea area={area} />
          <SelectorCategoria actividad={actividad} />
          {modo !== "hoy" && actividad.diaTarea && (
            <span className="text-[10px] text-amber-400">
              del {actividad.diaTarea}
            </span>
          )}
        </div>
        {actividad.cantidadObjetivo !== undefined && (
          <AvanceParcial actividad={actividad} />
        )}
        <DetalleActividad actividad={actividad} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => void completar()}
          title="Marcar como hecha"
          className="flex min-h-11 items-center justify-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 text-[10px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
        >
          <Icono.Check className="h-3.5 w-3.5" />
          Hecha
        </button>
        <button
          onClick={() =>
            modo === "hoy" ? setPidiendoMotivo("migrar") : void aHoy()
          }
          title={modo === "hoy" ? "Pasar a mañana" : "Traer a hoy"}
          className="flex min-h-11 items-center justify-center gap-1 rounded border border-sky-500/20 bg-sky-500/10 px-3 text-[10px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
        >
          <Icono.ArrowRight className="h-3.5 w-3.5" />
          {modo === "hoy" ? "Mañana" : "A hoy"}
        </button>
        <button
          onClick={() => setPidiendoMotivo("cancelar")}
          title="Cancelar — no se borra, queda marcada abajo (decisión estratégica, no fracaso)"
          className="flex min-h-11 items-center justify-center gap-1 rounded border border-zinc-800 px-3 text-[10px] font-bold text-zinc-500 uppercase hover:border-red-500/30 hover:text-red-400"
        >
          <Icono.Close className="h-3.5 w-3.5" />
          Cancelar
        </button>
      </div>
    </div>
  );
};

/** Tarea ya resuelta — tachada y al final del listado, con una etiqueta de qué pasó (nunca desaparece del día). */
const FilaResuelta: React.FC<{ actividad: Actividad; area: AreaDeTarea }> = ({
  actividad,
  area,
}) => {
  const esParcial =
    actividad.estado === "completada" &&
    actividad.cantidadObjetivo !== undefined &&
    (actividad.progresoActual ?? 0) < actividad.cantidadObjetivo;
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-xl border border-l-[3px] border-[#2A2A2E]/60 bg-[#0D0D0F]/50 p-3"
      style={{ borderLeftColor: area.color }}
    >
      <div className="flex flex-col gap-1">
        <span className="text-sm text-zinc-500 line-through">
          {actividad.descripcion}
        </span>
        <DetalleActividad actividad={actividad} />
      </div>
      <Badge
        color={
          esParcial
            ? "amber"
            : COLOR_ESTADO_RESUELTO[actividad.estado] || "zinc"
        }
      >
        {esParcial
          ? `Parcial ${actividad.progresoActual}/${actividad.cantidadObjetivo}`
          : ETIQUETA_ESTADO_RESUELTO[actividad.estado] || actividad.estado}
      </Badge>
    </div>
  );
};

/** Un solo formulario para agregar: escribís, elegís categoría (Mantenimiento por defecto) y Enter. */
const NuevaTarea: React.FC<{ diaTarea: string }> = ({ diaTarea }) => {
  const { mostrarToast } = useToast();
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState<BucketDia>("mantenimiento");
  const [guardando, setGuardando] = useState(false);

  const crear = async () => {
    if (!descripcion.trim()) return;
    setGuardando(true);
    const res = await useCase.crearActividad({
      diaTarea,
      tipo: categoria === "prioridad" ? "enfoque" : "mantenimiento",
      prioridad: categoria === "si_llego" ? "puede_esperar" : undefined,
      descripcion,
    });
    setGuardando(false);
    if (res.ok) setDescripcion("");
    else mostrarToast(res.error!.mensaje, "error");
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void crear();
          }}
          placeholder="Agregar una tarea a hoy..."
          className="flex-1 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/40"
        />
        <Button
          onClick={crear}
          cargando={guardando}
          disabled={!descripcion.trim()}
          variant="outline"
          icono={<Icono.Plus className="h-4 w-4" />}
        >
          Agregar
        </Button>
      </div>
      <div className="flex gap-1">
        {BUCKETS_DIA.map((b) => (
          <button
            key={b}
            onClick={() => setCategoria(b)}
            className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
              categoria === b
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-[#2A2A2E] text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {ETIQUETA_BUCKET[b]}
          </button>
        ))}
      </div>
    </div>
  );
};

const TituloSeccion: React.FC<{
  children: React.ReactNode;
  nota?: string;
}> = ({ children, nota }) => (
  <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
    {children}
    {nota && <span className="ml-1.5 font-normal text-zinc-600">{nota}</span>}
  </span>
);

/**
 * Agenda de hoy — la planilla del día, una sola: primero lo que quedó sin
 * cerrar de días anteriores (con "Pasar todas a hoy"), después lo de hoy
 * ordenado por importancia (Prioridad → Mantenimiento → Si llego), cada
 * tarea con el color y nombre de su Área, y filtro por Área cuando hay más
 * de una. Todo se resuelve inline (hecha / mañana / cancelar) y se
 * reclasifica en dos toques. Lo resuelto baja a "Resueltas hoy" tachado.
 */
export const BunkerDelDia: React.FC = () => {
  const { mostrarToast } = useToast();
  const hoy = obtenerDiaTareaHoy();
  const areaDe = useAreaPorObjetivo();
  const [areaFiltro, setAreaFiltro] = useState<string | null>(null);
  const [verAnteriores, setVerAnteriores] = useState(false);
  const [verSiLlego, setVerSiLlego] = useState(false);
  const [verProximas, setVerProximas] = useState(false);
  const [pasandoTodas, setPasandoTodas] = useState(false);

  const actividadesHoy =
    useLiveQuery(
      () =>
        db.actividad
          .where({ diaTarea: hoy })
          .and((a) => a.tipo !== "backlog")
          .toArray(),
      [hoy]
    ) || SIN_ACTIVIDADES;

  const anteriores =
    useLiveQuery(
      () =>
        db.actividad
          .where("diaTarea")
          .below(hoy)
          .and((a) => a.estado === "pendiente" && a.tipo !== "backlog")
          .sortBy("diaTarea"),
      [hoy]
    ) || SIN_ACTIVIDADES;

  const proximas =
    useLiveQuery(
      () =>
        db.actividad
          .where("diaTarea")
          .above(hoy)
          .and((a) => a.estado === "pendiente" && a.tipo !== "backlog")
          .sortBy("diaTarea"),
      [hoy]
    ) || SIN_ACTIVIDADES;

  const pasa = (a: Actividad) =>
    !areaFiltro || areaDe(a.objetivoId).id === areaFiltro;

  // Áreas presentes hoy (para el filtro) — solo se muestra si hay 2 o más.
  const areasPresentes = new Map<string, AreaDeTarea>();
  [...anteriores, ...actividadesHoy].forEach((a) => {
    const area = areaDe(a.objetivoId);
    areasPresentes.set(area.id, area);
  });

  const pendientesHoy = actividadesHoy
    .filter((a) => a.estado === "pendiente" && pasa(a))
    .sort(porCreacion);
  const enBucket = (b: BucketDia) =>
    pendientesHoy.filter((a) => bucketDeActividad(a) === b);
  const prioridad = enBucket("prioridad");
  const mantenimiento = enBucket("mantenimiento");
  const siLlego = enBucket("si_llego");
  const resueltas = actividadesHoy
    .filter((a) => a.estado !== "pendiente" && pasa(a))
    .sort((a, b) => b.actualizadoEn - a.actualizadoEn);
  const anterioresVisibles = anteriores.filter(pasa);
  const proximasVisibles = proximas.filter(pasa);

  // Progreso del día: lo que cuenta es lo pendiente + lo hecho (lo cancelado
  // o pasado a otro día ya no es parte del compromiso de hoy).
  const compromisos = actividadesHoy.filter(
    (a) => a.estado === "pendiente" || a.estado === "completada"
  );
  const hechas = compromisos.filter((a) => a.estado === "completada").length;
  const porcentaje =
    compromisos.length > 0
      ? Math.round((hechas / compromisos.length) * 100)
      : 0;

  const pasarTodasAHoy = async () => {
    setPasandoTodas(true);
    const res = await useCase.pasarPendientesAHoy(hoy);
    setPasandoTodas(false);
    if (!res.ok) {
      mostrarToast(res.error!.mensaje, "error");
      return;
    }
    const { pasadas, completadas, errores } = res.valor!;
    mostrarToast(
      `${pasadas} pasada(s) a hoy` +
        (completadas > 0 ? `, ${completadas} ya cumplida(s) cerrada(s)` : "") +
        (errores.length > 0 ? `. Con errores: ${errores.join(" — ")}` : "."),
      errores.length > 0 ? "error" : "exito"
    );
  };

  const nadaPendiente =
    prioridad.length + mantenimiento.length + siLlego.length === 0;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icono.Sunrise className="h-4 w-4 text-zinc-500" />
            <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
              Agenda de hoy
            </h3>
          </div>
          {compromisos.length > 0 && (
            <span className="text-xs text-zinc-500">
              {hechas}/{compromisos.length} hechas
            </span>
          )}
        </div>
        {compromisos.length > 0 && (
          <div className="h-1.5 w-full rounded-full bg-[#0D0D0F]">
            <div
              className="h-1.5 rounded-full bg-emerald-500/70 transition-all"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        )}
        {areasPresentes.size >= 2 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setAreaFiltro(null)}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                areaFiltro === null
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-[#2A2A2E] text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Todas
            </button>
            {[...areasPresentes.values()].map((ar) => (
              <button
                key={ar.id}
                onClick={() =>
                  setAreaFiltro(areaFiltro === ar.id ? null : ar.id)
                }
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                  areaFiltro === ar.id
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-[#2A2A2E] text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: ar.color }}
                />
                {ar.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {anterioresVisibles.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">
              {anterioresVisibles.length} sin cerrar de días anteriores
            </span>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => void pasarTodasAHoy()}
                cargando={pasandoTodas}
                className="px-3 py-1.5 text-xs"
                icono={<Icono.ArrowRight className="h-3.5 w-3.5" />}
              >
                Pasar todas a hoy
              </Button>
              <button
                onClick={() => setVerAnteriores((v) => !v)}
                className="text-[10px] font-bold text-zinc-500 uppercase hover:text-zinc-300"
              >
                {verAnteriores ? "Ocultar" : "Revisar una por una"}
              </button>
            </div>
          </div>
          {verAnteriores &&
            anterioresVisibles.map((a) => (
              <FilaActividad
                key={a.id}
                actividad={a}
                area={areaDe(a.objetivoId)}
                modo="anterior"
                hoy={hoy}
              />
            ))}
        </div>
      )}

      {prioridad.length > 0 && (
        <div className="flex flex-col gap-2">
          <TituloSeccion
            nota={
              prioridad.length > MAX_TAREAS_ENFOQUE_POR_DIA
                ? `(${prioridad.length}, recomendado ${MAX_TAREAS_ENFOQUE_POR_DIA})`
                : undefined
            }
          >
            Prioridad — lo que sí o sí
          </TituloSeccion>
          {prioridad.map((a) => (
            <FilaActividad
              key={a.id}
              actividad={a}
              area={areaDe(a.objetivoId)}
              modo="hoy"
              hoy={hoy}
            />
          ))}
        </div>
      )}

      {mantenimiento.length > 0 && (
        <div className="flex flex-col gap-2">
          <TituloSeccion
            nota={
              mantenimiento.length > MAX_TAREAS_MANTENIMIENTO_POR_DIA
                ? `(${mantenimiento.length}, recomendado ${MAX_TAREAS_MANTENIMIENTO_POR_DIA})`
                : undefined
            }
          >
            Mantenimiento
          </TituloSeccion>
          {mantenimiento.map((a) => (
            <FilaActividad
              key={a.id}
              actividad={a}
              area={areaDe(a.objetivoId)}
              modo="hoy"
              hoy={hoy}
            />
          ))}
        </div>
      )}

      {nadaPendiente && (
        <p className="text-sm text-zinc-500">
          {compromisos.length > 0 && hechas === compromisos.length
            ? "Día completo — no queda nada pendiente."
            : "No hay nada pendiente para hoy."}
        </p>
      )}

      {siLlego.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setVerSiLlego((v) => !v)}
            className="flex items-center gap-1 text-left text-[10px] font-bold tracking-wider text-zinc-500 uppercase hover:text-zinc-300"
          >
            {verSiLlego ? (
              <Icono.ChevronUp className="h-3 w-3" />
            ) : (
              <Icono.ChevronDown className="h-3 w-3" />
            )}
            Si llego ({siLlego.length})
          </button>
          {verSiLlego &&
            siLlego.map((a) => (
              <FilaActividad
                key={a.id}
                actividad={a}
                area={areaDe(a.objetivoId)}
                modo="hoy"
                hoy={hoy}
              />
            ))}
        </div>
      )}

      <NuevaTarea diaTarea={hoy} />

      {resueltas.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-[#2A2A2E] pt-3">
          <TituloSeccion>Resueltas hoy ({resueltas.length})</TituloSeccion>
          {resueltas.map((a) => (
            <FilaResuelta
              key={a.id}
              actividad={a}
              area={areaDe(a.objetivoId)}
            />
          ))}
        </div>
      )}

      {proximasVisibles.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-[#2A2A2E] pt-3">
          <button
            onClick={() => setVerProximas((v) => !v)}
            className="flex items-center gap-1 text-left text-[10px] font-bold tracking-wider text-zinc-500 uppercase hover:text-zinc-300"
          >
            {verProximas ? (
              <Icono.ChevronUp className="h-3 w-3" />
            ) : (
              <Icono.ChevronDown className="h-3 w-3" />
            )}
            Próximos días ({proximasVisibles.length})
          </button>
          {verProximas &&
            proximasVisibles.map((a) => (
              <FilaActividad
                key={a.id}
                actividad={a}
                area={areaDe(a.objetivoId)}
                modo="proxima"
                hoy={hoy}
              />
            ))}
        </div>
      )}
    </div>
  );
};
