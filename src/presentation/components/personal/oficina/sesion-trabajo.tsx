"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Button } from "../../button";
import { Icono } from "../../icons";
import { useToast } from "../../../hooks/useToast";
import { GestionarSesionTrabajoUseCase } from "../../../../application/use-cases/personal/gestionar-sesion-trabajo.use-case";
import { GestionarActividadesUseCase } from "../../../../application/use-cases/personal/gestionar-actividades.use-case";
import {
  bucketDeActividad,
  type Actividad,
} from "../../../../domain/entidades/actividad.entity";
import { useAreaPorObjetivo, type AreaDeTarea } from "../calendario-utils";
import { obtenerDiaTareaHoy } from "../../../../domain/entidades/personal.entity";
import {
  segundosTrabajados,
  type ModoSesionTrabajo,
  type SesionTrabajo as SesionTrabajoRow,
} from "../../../../domain/entidades/sesion-trabajo.entity";
import {
  ID_CONFIGURACION_OFICINA,
  tocaPausaActiva,
  type ConfiguracionOficina,
} from "../../../../domain/entidades/configuracion-oficina.entity";
import type { Resultado } from "../../../../shared/utilidades/resultado";
import { PausaActivaRapida } from "./pausa-activa-rapida";
import { DetalleActividad, useProyectosDeTrabajo } from "../detalle-actividad";
import { avisar, pedirPermisoNotificaciones } from "./avisos";

const sesionUseCase = new GestionarSesionTrabajoUseCase();
const actividadesUseCase = new GestionarActividadesUseCase();
const SIN_ACTIVIDADES: never[] = [];
const PRESETS_MIN = [25, 45, 60];
const SNOOZE_MS = 5 * 60 * 1000;

function formatoHHMMSS(totalSeg: number): string {
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  const dos = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${dos(m)}:${dos(s)}` : `${dos(m)}:${dos(s)}`;
}

interface ConfigNueva {
  modo: ModoSesionTrabajo;
  minutos: string;
}

/** Libre o temporizador (con minutos) — vale para la próxima sesión que se arranque. */
const SelectorModo: React.FC<{
  valor: ConfigNueva;
  onChange: (v: ConfigNueva) => void;
}> = ({ valor, onChange }) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="flex gap-1 rounded-lg border border-[#2A2A2E] p-0.5">
      {(["libre", "temporizador"] as const).map((m) => (
        <button
          key={m}
          onClick={() => {
            if (m === "temporizador") pedirPermisoNotificaciones();
            onChange({ ...valor, modo: m });
          }}
          className={`rounded-md px-2.5 py-1 text-[11px] font-bold uppercase ${
            valor.modo === m
              ? "bg-emerald-500/15 text-emerald-400"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {m === "libre" ? "Libre" : "Temporizador"}
        </button>
      ))}
    </div>
    {valor.modo === "temporizador" && (
      <div className="flex items-center gap-1.5">
        {PRESETS_MIN.map((p) => (
          <button
            key={p}
            onClick={() => onChange({ ...valor, minutos: String(p) })}
            className={`rounded-md border px-2 py-1 text-[11px] font-bold ${
              valor.minutos === String(p)
                ? "border-emerald-500/40 text-emerald-400"
                : "border-[#2A2A2E] text-zinc-500"
            }`}
          >
            {p}
          </button>
        ))}
        <input
          type="number"
          min={1}
          value={valor.minutos}
          onChange={(e) => onChange({ ...valor, minutos: e.target.value })}
          className="w-16 rounded-md border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-500/40"
        />
        <span className="text-[11px] text-zinc-500">min</span>
      </div>
    )}
  </div>
);

function iniciarInput(
  config: ConfigNueva,
  base: {
    actividadId?: string;
    descripcion?: string;
    proyectoTrabajoId?: string;
  }
) {
  return {
    ...base,
    modo: config.modo,
    duracionMin:
      config.modo === "temporizador" ? Number(config.minutos) : undefined,
  };
}

const FilaComenzar: React.FC<{
  actividad: Actividad;
  area: AreaDeTarea;
  config: ConfigNueva;
}> = ({ actividad, area, config }) => {
  const { mostrarToast } = useToast();
  const [iniciando, setIniciando] = useState(false);

  const comenzar = async () => {
    setIniciando(true);
    const res = await sesionUseCase.iniciarSesion(
      iniciarInput(config, { actividadId: actividad.id })
    );
    setIniciando(false);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  return (
    <div
      className="flex items-center justify-between gap-2 rounded-xl border border-l-[3px] border-[#2A2A2E] bg-[#0D0D0F] p-3"
      style={{ borderLeftColor: area.color }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-zinc-200">{actividad.descripcion}</span>
        <span className="flex items-center gap-1 text-[10px] text-zinc-500">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: area.color }}
          />
          {area.nombre}
          {actividad.cantidadObjetivo !== undefined &&
            ` · ${actividad.progresoActual ?? 0}/${actividad.cantidadObjetivo} ${actividad.unidad || ""}`}
        </span>
        <DetalleActividad actividad={actividad} />
      </div>
      <Button
        variant="outline"
        onClick={() => void comenzar()}
        cargando={iniciando}
        className="shrink-0 px-3 py-1.5 text-xs"
        icono={<Icono.Play className="h-3.5 w-3.5" />}
      >
        Comenzar
      </Button>
    </div>
  );
};

/** Sesión sin actividad de por medio: solo se describe en qué se va a trabajar. */
const ComenzarSuelta: React.FC<{ config: ConfigNueva }> = ({ config }) => {
  const { mostrarToast } = useToast();
  const [descripcion, setDescripcion] = useState("");
  const [proyectoId, setProyectoId] = useState("");
  const [iniciando, setIniciando] = useState(false);
  const proyectos = useProyectosDeTrabajo();

  const comenzar = async () => {
    if (!descripcion.trim()) return;
    setIniciando(true);
    const res = await sesionUseCase.iniciarSesion(
      iniciarInput(config, {
        descripcion,
        proyectoTrabajoId: proyectoId || undefined,
      })
    );
    setIniciando(false);
    if (res.ok) setDescripcion("");
    else mostrarToast(res.error!.mensaje, "error");
  };

  return (
    <div className="flex flex-wrap gap-2">
      <input
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void comenzar();
        }}
        placeholder="O empezá algo suelto: ¿en qué vas a trabajar?"
        className="min-w-48 flex-1 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/40"
      />
      <select
        value={proyectoId}
        onChange={(e) => setProyectoId(e.target.value)}
        title="Proyecto al que se dedica (opcional)"
        className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-2 text-xs text-zinc-300 outline-none focus:border-emerald-500/40"
      >
        <option value="">Sin proyecto</option>
        {proyectos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>
      <Button
        variant="outline"
        onClick={() => void comenzar()}
        cargando={iniciando}
        disabled={!descripcion.trim()}
        icono={<Icono.Play className="h-4 w-4" />}
      >
        Comenzar
      </Button>
    </div>
  );
};

/**
 * Lista de tareas de hoy para elegir en qué trabajar — el MISMO orden y los
 * mismos colores de Área que la agenda de Planificación (Prioridad →
 * Mantenimiento → Si llego, este último colapsado). Solo elige y arranca el
 * cronómetro; resolver, mover y reclasificar se hace allá.
 */
const ListaParaComenzar: React.FC<{ config: ConfigNueva }> = ({ config }) => {
  const [siLlegoAbierto, setSiLlegoAbierto] = useState(false);
  const diaTarea = obtenerDiaTareaHoy();
  const areaDe = useAreaPorObjetivo();

  const actividadesHoy =
    useLiveQuery(
      () =>
        db.actividad
          .where({ diaTarea })
          .and((a) => a.estado === "pendiente" && a.tipo !== "backlog")
          .toArray(),
      [diaTarea]
    ) || SIN_ACTIVIDADES;

  const ordenadas = [...actividadesHoy].sort((a, b) => a.creadoEn - b.creadoEn);
  const prioridad = ordenadas.filter(
    (a) => bucketDeActividad(a) === "prioridad"
  );
  const mantenimiento = ordenadas.filter(
    (a) => bucketDeActividad(a) === "mantenimiento"
  );
  const siLlego = ordenadas.filter((a) => bucketDeActividad(a) === "si_llego");

  return (
    <div className="flex flex-col gap-3">
      {actividadesHoy.length === 0 && (
        <p className="text-sm text-zinc-600">
          Sin tareas para hoy — armalas en Planificación, o empezá algo suelto.
        </p>
      )}
      {prioridad.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Prioridad
          </span>
          {prioridad.map((a) => (
            <FilaComenzar
              key={a.id}
              actividad={a}
              area={areaDe(a.objetivoId)}
              config={config}
            />
          ))}
        </div>
      )}
      {mantenimiento.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Mantenimiento
          </span>
          {mantenimiento.map((a) => (
            <FilaComenzar
              key={a.id}
              actividad={a}
              area={areaDe(a.objetivoId)}
              config={config}
            />
          ))}
        </div>
      )}
      {siLlego.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => setSiLlegoAbierto((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-zinc-500 uppercase hover:text-zinc-300"
          >
            {siLlegoAbierto ? (
              <Icono.ChevronUp className="h-3 w-3" />
            ) : (
              <Icono.ChevronDown className="h-3 w-3" />
            )}
            Si llego ({siLlego.length})
          </button>
          {siLlegoAbierto &&
            siLlego.map((a) => (
              <FilaComenzar
                key={a.id}
                actividad={a}
                area={areaDe(a.objetivoId)}
                config={config}
              />
            ))}
        </div>
      )}
      <ComenzarSuelta config={config} />
    </div>
  );
};

interface SesionEnCursoProps {
  sesion: SesionTrabajoRow;
  actividad?: Actividad;
  configuracion?: ConfiguracionOficina;
}

/**
 * Sesión activa o pausada a mano. El tiempo sale de timestamps (no de contar
 * ticks), así que sigue exacto aunque la pestaña quede en segundo plano o el
 * celu se bloquee; el tick de 1s solo redibuja. Avisos (sonido/vibración/
 * notificación) solo suenan si la app está abierta — ver avisos.ts.
 */
/** Proyecto de una sesión suelta: se ve y se puede cambiar mientras corre. */
const ProyectoDeSesion: React.FC<{ sesion: SesionTrabajoRow }> = ({
  sesion,
}) => {
  const proyectos = useProyectosDeTrabajo();
  return (
    <select
      value={sesion.proyectoTrabajoId ?? ""}
      onChange={(e) =>
        void sesionUseCase.asignarProyecto(sesion.id, e.target.value || null)
      }
      className="self-start rounded border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1 text-xs text-zinc-300 outline-none focus:border-emerald-500/40"
    >
      <option value="">Sin proyecto</option>
      {proyectos.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nombre}
        </option>
      ))}
    </select>
  );
};

const SesionEnCurso: React.FC<SesionEnCursoProps> = ({
  sesion,
  actividad,
  configuracion,
}) => {
  const { mostrarToast } = useToast();
  const [ahora, setAhora] = useState(() => Date.now());
  const [ocupado, setOcupado] = useState(false);
  const [terminando, setTerminando] = useState(false);
  const [nota, setNota] = useState("");
  const [completarTarea, setCompletarTarea] = useState(false);
  const [pospuestaHasta, setPospuestaHasta] = useState(0);
  const finAvisadoPara = useRef<number | null>(null);
  const pausaAvisada = useRef(false);

  const activa = sesion.estado === "activa";

  useEffect(() => {
    if (!activa) return;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activa]);

  const trabajados = segundosTrabajados(sesion, ahora);
  const duracion = sesion.duracionPlanificadaSeg;
  const esTemporizador =
    sesion.modo === "temporizador" && duracion !== undefined;
  const excedido = esTemporizador ? Math.max(0, trabajados - duracion) : 0;
  const tiempoCumplido = esTemporizador && trabajados >= duracion;
  const tramo = activa
    ? Math.max(0, Math.floor((ahora - sesion.iniciadoEn) / 1000))
    : 0;
  const pausaDebida =
    activa &&
    configuracion !== undefined &&
    tocaPausaActiva(configuracion, tramo) &&
    ahora >= pospuestaHasta;

  useEffect(() => {
    if (activa && tiempoCumplido && finAvisadoPara.current !== duracion) {
      finAvisadoPara.current = duracion ?? null;
      avisar("Se cumplió el tiempo", "Tu sesión llegó al tiempo planificado.");
    }
  }, [activa, tiempoCumplido, duracion]);

  useEffect(() => {
    if (pausaDebida && !pausaAvisada.current) {
      pausaAvisada.current = true;
      avisar("Toca una pausa activa", "Llevás un rato trabajando.");
    }
    if (!pausaDebida) pausaAvisada.current = false;
  }, [pausaDebida]);

  const ejecutar = async (fn: () => Promise<Resultado<void>>) => {
    setOcupado(true);
    const res = await fn();
    setOcupado(false);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
    return res.ok;
  };

  const terminar = async () => {
    const ok = await ejecutar(() =>
      sesionUseCase.finalizarSesion(sesion.id, nota)
    );
    if (ok && completarTarea && sesion.actividadId) {
      await ejecutar(() =>
        actividadesUseCase.completarActividad(sesion.actividadId!)
      );
    }
  };

  const titulo = actividad?.descripcion ?? sesion.descripcion ?? "Sesión";
  const mostrado =
    esTemporizador && !tiempoCumplido ? duracion - trabajados : trabajados;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <span className="text-sm text-zinc-300">{titulo}</span>
      {actividad ? (
        <DetalleActividad actividad={actividad} />
      ) : (
        <ProyectoDeSesion sesion={sesion} />
      )}

      <div className="flex items-baseline gap-2">
        <span className="font-mono text-3xl font-bold text-emerald-400">
          {formatoHHMMSS(mostrado)}
        </span>
        <span className="text-[11px] text-zinc-500">
          {esTemporizador
            ? tiempoCumplido
              ? `de ${Math.round(duracion / 60)} min · +${formatoHHMMSS(excedido)} de más`
              : `restan · de ${Math.round(duracion / 60)} min`
            : "trabajado"}
          {!activa && " · en pausa"}
        </span>
      </div>

      {tiempoCumplido && !terminando && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
          <span className="text-xs font-bold text-amber-400">
            Se cumplió el tiempo
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="outline"
              onClick={() =>
                void ejecutar(() => sesionUseCase.extenderTiempo(sesion.id, 10))
              }
              className="px-3 py-1.5 text-xs"
            >
              +10 min
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                void ejecutar(() => sesionUseCase.pasarALibre(sesion.id))
              }
              className="px-3 py-1.5 text-xs"
            >
              Seguir sin límite
            </Button>
          </div>
        </div>
      )}

      {pausaDebida && !terminando && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
          <span className="text-xs font-bold text-amber-400">
            Ya toca una pausa activa
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Button
              onClick={() =>
                void ejecutar(() =>
                  sesionUseCase.pausarParaDescanso(sesion.id, "pausa_activa")
                )
              }
              cargando={ocupado}
              className="px-3 py-1.5 text-xs"
              icono={<Icono.Coffee className="h-3.5 w-3.5" />}
            >
              Hacer pausa activa
            </Button>
            <Button
              variant="outline"
              onClick={() => setPospuestaHasta(Date.now() + SNOOZE_MS)}
              className="px-3 py-1.5 text-xs"
            >
              Más tarde (5 min)
            </Button>
          </div>
        </div>
      )}

      {!terminando ? (
        <div className="flex flex-wrap gap-2">
          {activa ? (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  void ejecutar(() =>
                    sesionUseCase.pausarParaDescanso(sesion.id, "manual")
                  )
                }
                cargando={ocupado}
                className="px-3 py-1.5 text-xs"
                icono={<Icono.Pause className="h-3.5 w-3.5" />}
              >
                Pausar
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  void ejecutar(() =>
                    sesionUseCase.pausarParaDescanso(sesion.id, "pausa_activa")
                  )
                }
                cargando={ocupado}
                className="px-3 py-1.5 text-xs"
                icono={<Icono.Coffee className="h-3.5 w-3.5" />}
              >
                Pausa activa
              </Button>
            </>
          ) : (
            <Button
              onClick={() =>
                void ejecutar(() => sesionUseCase.reanudarSesion(sesion.id))
              }
              cargando={ocupado}
              className="px-3 py-1.5 text-xs"
              icono={<Icono.Play className="h-3.5 w-3.5" />}
            >
              Seguir
            </Button>
          )}
          <Button
            onClick={() => setTerminando(true)}
            className="px-3 py-1.5 text-xs"
            icono={<Icono.Check className="h-3.5 w-3.5" />}
          >
            Terminar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 border-t border-emerald-500/20 pt-3">
          <span className="text-xs text-zinc-400">
            Se guardan {formatoHHMMSS(trabajados)} trabajados
            {esTemporizador && trabajados < duracion
              ? ` (de ${Math.round(duracion / 60)} min planificados)`
              : ""}
            .
          </span>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="¿Qué hiciste? (opcional)"
            className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/40"
          />
          {sesion.actividadId && (
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={completarTarea}
                onChange={(e) => setCompletarTarea(e.target.checked)}
              />
              Además marcar la tarea como hecha
            </label>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => void terminar()}
              cargando={ocupado}
              className="px-3 py-1.5 text-xs"
            >
              Guardar sesión
            </Button>
            <button
              onClick={() => setTerminando(false)}
              className="text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
            >
              Volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const SesionTrabajo: React.FC = () => {
  const [configNueva, setConfigNueva] = useState<ConfigNueva>({
    modo: "libre",
    minutos: "25",
  });

  const sesion = useLiveQuery(() =>
    db.sesion_trabajo.where("estado").anyOf(["activa", "pausada"]).first()
  );
  const actividad = useLiveQuery(
    () =>
      sesion?.actividadId ? db.actividad.get(sesion.actividadId) : undefined,
    [sesion?.actividadId]
  );
  const configuracion = useLiveQuery(() =>
    db.configuracion_oficina.get(ID_CONFIGURACION_OFICINA)
  );

  const debePausa =
    !sesion && configuracion !== undefined && tocaPausaActiva(configuracion, 0);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center gap-2">
        <Icono.Clock className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Sesión de trabajo
        </h3>
      </div>

      {!sesion && (
        <>
          {debePausa && (
            <PausaActivaRapida titulo="Ya trabajaste lo suficiente — ¿hacés una pausa activa?" />
          )}
          <SelectorModo valor={configNueva} onChange={setConfigNueva} />
          <ListaParaComenzar config={configNueva} />
        </>
      )}

      {sesion &&
        (sesion.estado === "pausada" &&
        (sesion.tipoPausa ?? "pausa_activa") === "pausa_activa" ? (
          <PausaActivaRapida sesionId={sesion.id} />
        ) : (
          <SesionEnCurso
            key={sesion.id}
            sesion={sesion}
            actividad={actividad}
            configuracion={configuracion}
          />
        ))}
    </div>
  );
};
