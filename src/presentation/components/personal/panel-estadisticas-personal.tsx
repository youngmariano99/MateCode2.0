"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import { calcularEstadisticas } from "../../../application/servicios/estadisticas-personal.service";
import {
  moverPeriodo,
  periodoDe,
  type FilaAgrupada,
  type Periodo,
  type TipoPeriodo,
} from "../../../domain/entidades/estadisticas-personal.entity";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";

function horas(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

const Tarjeta: React.FC<{
  titulo: string;
  children: React.ReactNode;
  ayuda?: string;
}> = ({ titulo, children, ayuda }) => (
  <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
    <div>
      <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
        {titulo}
      </h3>
      {ayuda && <p className="mt-0.5 text-[11px] text-zinc-600">{ayuda}</p>}
    </div>
    {children}
  </div>
);

const Cifra: React.FC<{
  valor: string | number;
  etiqueta: string;
  color?: string;
  sub?: string;
}> = ({ valor, etiqueta, color = "text-zinc-100", sub }) => (
  <div className="flex min-w-24 flex-1 flex-col rounded-xl bg-[#0D0D0F] p-3">
    <span className={`text-2xl font-extrabold ${color}`}>{valor}</span>
    <span className="text-[11px] text-zinc-500">{etiqueta}</span>
    {sub && <span className="text-[10px] text-zinc-600">{sub}</span>}
  </div>
);

/** Barra horizontal de un porcentaje (con etiqueta y conteo). */
const BarraFila: React.FC<{ fila: FilaAgrupada }> = ({ fila }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="w-28 shrink-0 truncate text-zinc-300">{fila.clave}</span>
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
      <div
        className={`h-full rounded-full ${fila.tasa >= 75 ? "bg-emerald-500" : fila.tasa >= 50 ? "bg-amber-500" : "bg-red-500"}`}
        style={{ width: `${fila.tasa}%` }}
      />
    </div>
    <span className="w-24 shrink-0 text-right text-zinc-500">
      {fila.tasa}% · {fila.cumplidas}/{fila.juzgables}
    </span>
  </div>
);

const ORDEN_DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

/**
 * Estadísticas del área Personal, por semana, mes o año (y cualquier período
 * anterior o siguiente): cumplimiento, qué no se hizo y por qué, mínimos vs
 * meta, áreas y días flojos, hábitos, tiempo, y una lectura en frases de qué
 * mejorar. Muestra siempre lo que falta registrar, para no tomar por bueno un
 * período con datos incompletos.
 */
export const PanelEstadisticasPersonal: React.FC = () => {
  const hoy = obtenerDiaTareaHoy();
  const [tipo, setTipo] = useState<TipoPeriodo>("semana");
  const [periodo, setPeriodo] = useState<Periodo>(() =>
    periodoDe("semana", hoy)
  );

  const datos = useLiveQuery(async () => {
    // Se recalcula ante cualquier cambio en lo que alimenta las estadísticas.
    await Promise.all([
      db.actividad.count(),
      db.personal_historial.count(),
      db.habito_registro.count(),
      db.sesion_trabajo.count(),
    ]);
    return calcularEstadisticas(periodo, hoy);
  }, [periodo.desde, periodo.hasta, hoy]);

  const cambiarTipo = (t: TipoPeriodo) => {
    setTipo(t);
    setPeriodo(periodoDe(t, hoy));
  };

  const r = datos?.resumen;
  const dif =
    datos && datos.anterior.juzgables > 0
      ? datos.resumen.cumplimiento - datos.anterior.cumplimiento
      : undefined;
  const maxSerie = Math.max(
    1,
    ...(datos?.serie.map((s) => s.juzgables) ?? [1])
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Selector de período */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-[#2A2A2E] bg-[#18181B] p-1">
          {(["semana", "mes", "anio"] as const).map((t) => (
            <button
              key={t}
              onClick={() => cambiarTipo(t)}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold uppercase ${
                tipo === t
                  ? "bg-[#10B981] text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t === "anio" ? "Año" : t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPeriodo(moverPeriodo(periodo, -1))}
            className="rounded-lg border border-[#2A2A2E] p-1.5 text-zinc-500 hover:text-zinc-300"
          >
            <Icono.ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPeriodo(periodoDe(tipo, hoy))}
            className="rounded-lg border border-[#2A2A2E] px-2 py-1.5 text-[10px] font-bold text-zinc-500 uppercase hover:text-zinc-300"
          >
            Hoy
          </button>
          <button
            onClick={() => setPeriodo(moverPeriodo(periodo, 1))}
            className="rounded-lg border border-[#2A2A2E] p-1.5 text-zinc-500 hover:text-zinc-300"
          >
            <Icono.ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-2 text-sm font-bold text-zinc-200">
            {periodo.etiqueta}
          </span>
        </div>
      </div>

      {!datos || !r ? (
        <p className="text-sm text-zinc-500">Calculando…</p>
      ) : (
        <>
          {/* Lo que hay que mejorar, en frases */}
          <Tarjeta titulo="Lectura del período">
            <ul className="flex flex-col gap-1.5">
              {datos.lecturas.map((l, i) => (
                <li key={i} className="text-sm text-zinc-300">
                  • {l}
                </li>
              ))}
            </ul>
          </Tarjeta>

          {/* Cifras */}
          <Tarjeta
            titulo="Cumplimiento"
            ayuda="Cuenta lo hecho a la meta o al mínimo sobre todo lo que ya se podía juzgar. Lo pendiente de días pasados cuenta como no cumplido; lo de hoy o futuro y lo descartado no entran."
          >
            <div className="flex flex-wrap gap-2">
              <Cifra
                valor={`${r.cumplimiento}%`}
                etiqueta="cumplido (meta o mínimo)"
                color={
                  r.cumplimiento >= 75
                    ? "text-emerald-400"
                    : r.cumplimiento >= 50
                      ? "text-amber-400"
                      : "text-red-400"
                }
                sub={
                  dif !== undefined
                    ? `${dif >= 0 ? "+" : ""}${dif} pts vs período anterior`
                    : "sin período anterior para comparar"
                }
              />
              <Cifra
                valor={`${r.cumplimientoPleno}%`}
                etiqueta="a la meta completa"
              />
              <Cifra valor={r.juzgables} etiqueta="actividades evaluadas" />
              <Cifra
                valor={r.abiertas}
                etiqueta="abiertas (todavía no cuentan)"
                color="text-zinc-400"
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-emerald-500/10 px-2 py-1 text-emerald-400">
                {r.hechas} hechas
              </span>
              <span className="rounded bg-sky-500/10 px-2 py-1 text-sky-400">
                {r.alMinimo} al mínimo
              </span>
              <span className="rounded bg-amber-500/10 px-2 py-1 text-amber-400">
                {r.parciales} parciales
              </span>
              <span className="rounded bg-red-500/10 px-2 py-1 text-red-400">
                {r.vencidas} sin cerrar
              </span>
              <span className="rounded bg-violet-500/10 px-2 py-1 text-violet-400">
                {r.migradas} pasadas a otro día
              </span>
              <span className="rounded bg-zinc-500/10 px-2 py-1 text-zinc-400">
                {r.canceladas} canceladas
              </span>
              {r.descartadas > 0 && (
                <span className="rounded bg-zinc-500/10 px-2 py-1 text-zinc-500">
                  {r.descartadas} descartadas
                </span>
              )}
            </div>
            {/* Barras: por día (semana/mes) o por mes (año) */}
            <div className="flex h-24 items-end gap-1">
              {datos.serie.map((s, i) => (
                <div
                  key={i}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${s.etiqueta}: ${s.cumplidas}/${s.juzgables}`}
                >
                  <div className="flex w-full flex-1 flex-col justify-end overflow-hidden rounded bg-zinc-800/60">
                    <div
                      className="w-full bg-red-500/40"
                      style={{
                        height: `${((s.juzgables - s.cumplidas) / maxSerie) * 100}%`,
                      }}
                    />
                    <div
                      className="w-full bg-emerald-500"
                      style={{ height: `${(s.cumplidas / maxSerie) * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-600">{s.etiqueta}</span>
                </div>
              ))}
            </div>
          </Tarjeta>

          {/* Lo que falta registrar: nunca escondido */}
          {(datos.sinRegistro.length > 0 || r.vencidas > 0) && (
            <Tarjeta
              titulo="Información incompleta"
              ayuda="Para que las estadísticas sean confiables, conviene completar esto."
            >
              {r.vencidas > 0 && (
                <p className="text-sm text-amber-300">
                  {r.vencidas} actividad(es) quedaron sin cerrar de días que ya
                  pasaron. Resolvelas desde Hoy («sin cerrar de días
                  anteriores»).
                </p>
              )}
              {datos.sinRegistro.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-amber-300">
                    {datos.sinRegistro.length} compromiso(s) recurrente(s)
                    tocaban en días en que no abriste la app, así que no quedó
                    registro (no cuentan ni como hechos ni como fallos):
                  </p>
                  <details>
                    <summary className="cursor-pointer text-xs text-zinc-500">
                      Ver cuáles
                    </summary>
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {datos.sinRegistro.slice(0, 40).map((x) => (
                        <li
                          key={`${x.entregableId}-${x.dia}`}
                          className="text-xs text-zinc-500"
                        >
                          {x.dia} · {x.titulo}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
            </Tarjeta>
          )}

          {/* Por qué no se hizo */}
          <Tarjeta
            titulo="Por qué no se hizo"
            ayuda="Motivos elegidos al cancelar o pasar a otro día. Lo que se omitió figura como «sin motivo»."
          >
            {datos.motivos.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No hubo actividades canceladas ni pasadas a otro día.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {datos.motivos.map((m) => (
                  <div
                    key={m.motivo}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="w-40 shrink-0 text-zinc-300">
                      {m.etiqueta}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{
                          width: `${(m.cantidad / datos.motivos[0].cantidad) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right text-zinc-500">
                      {m.cantidad}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Tarjeta>

          {/* Meta vs mínimo */}
          {datos.metaVsMinimo.meta +
            datos.metaVsMinimo.minimo +
            datos.metaVsMinimo.corto +
            datos.metaVsMinimo.sinCerrar >
            0 && (
            <Tarjeta
              titulo="Meta vs mínimo"
              ayuda="Solo actividades con cantidad (ej. contactos, sesiones)."
            >
              <div className="flex flex-wrap gap-2">
                <Cifra
                  valor={datos.metaVsMinimo.meta}
                  etiqueta="a la meta"
                  color="text-emerald-400"
                />
                <Cifra
                  valor={datos.metaVsMinimo.minimo}
                  etiqueta="solo al mínimo"
                  color="text-sky-400"
                />
                <Cifra
                  valor={datos.metaVsMinimo.corto}
                  etiqueta="por debajo del mínimo"
                  color="text-amber-400"
                />
                <Cifra
                  valor={datos.metaVsMinimo.sinCerrar}
                  etiqueta="sin cerrar"
                  color="text-red-400"
                />
              </div>
              {datos.riesgosMinimos > 0 && (
                <p className="text-xs text-amber-300">
                  {datos.riesgosMinimos} mínimo(s) en riesgo ahora mismo (ver el
                  aviso en Hoy).
                </p>
              )}
            </Tarjeta>
          )}

          {/* Por área / día / tipo */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Tarjeta titulo="Por área">
              {datos.porArea.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin datos.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {datos.porArea.map((f) => (
                    <BarraFila key={f.clave} fila={f} />
                  ))}
                </div>
              )}
            </Tarjeta>
            <Tarjeta titulo="Por día de la semana">
              {datos.porDiaSemana.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin datos.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {[...datos.porDiaSemana]
                    .sort(
                      (a, b) =>
                        ORDEN_DIAS.indexOf(a.clave) -
                        ORDEN_DIAS.indexOf(b.clave)
                    )
                    .map((f) => (
                      <BarraFila key={f.clave} fila={f} />
                    ))}
                </div>
              )}
              {datos.porTipo.length > 0 && (
                <div className="flex flex-col gap-1.5 border-t border-[#2A2A2E] pt-2">
                  {datos.porTipo.map((f) => (
                    <BarraFila key={f.clave} fila={f} />
                  ))}
                </div>
              )}
            </Tarjeta>
          </div>

          {/* Hábitos */}
          {datos.habitos.length > 0 && (
            <Tarjeta
              titulo="Hábitos"
              ayuda="Cumplimiento sobre los días con registro. Los días sin registro se cuentan aparte."
            >
              <div className="flex flex-col gap-2">
                {datos.habitos.map((h) => (
                  <div
                    key={h.habitoId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#0D0D0F] p-3 text-xs"
                  >
                    <span className="font-bold text-zinc-200">{h.nombre}</span>
                    <span className="text-zinc-500">
                      {h.cumplimiento}% · MIN {h.min} · MED {h.med} · MAX{" "}
                      {h.max} · no cumplido {h.noCumplido}
                      {h.sinRegistro > 0 && (
                        <span className="text-amber-400">
                          {" "}
                          · sin registro {h.sinRegistro}
                        </span>
                      )}
                      {h.motivoTop && ` · motivo: ${h.motivoTop}`}
                    </span>
                  </div>
                ))}
              </div>
            </Tarjeta>
          )}

          {/* Tiempo */}
          {datos.tiempo.totalSegundos > 0 && (
            <Tarjeta
              titulo="Tiempo trabajado"
              ayuda="Sesiones del cronómetro de Oficina."
            >
              <div className="flex flex-wrap gap-2">
                <Cifra
                  valor={horas(datos.tiempo.totalSegundos)}
                  etiqueta="total del período"
                  sub={
                    datos.tiempo.totalSegundosAnterior > 0
                      ? `antes: ${horas(datos.tiempo.totalSegundosAnterior)}`
                      : undefined
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-bold text-zinc-400 uppercase">
                    Por área
                  </span>
                  {datos.tiempo.porArea.map((a) => (
                    <div
                      key={a.area}
                      className="flex justify-between text-zinc-300"
                    >
                      <span>{a.area}</span>
                      <span className="text-zinc-500">{horas(a.segundos)}</span>
                    </div>
                  ))}
                </div>
                {datos.tiempo.porProyecto.length > 0 && (
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="font-bold text-zinc-400 uppercase">
                      Por proyecto
                    </span>
                    {datos.tiempo.porProyecto.map((p) => (
                      <div
                        key={p.proyectoId}
                        className="flex justify-between text-zinc-300"
                      >
                        <span>{p.nombre}</span>
                        <span className="text-zinc-500">
                          {horas(p.segundos)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Tarjeta>
          )}

          {/* Fondo */}
          {(datos.fondo.backlogSinAsignar > 0 ||
            datos.fondo.faltantesPendientes > 0) && (
            <Tarjeta titulo="Esperando ser asignado (hoy)">
              <p className="text-sm text-zinc-400">
                {datos.fondo.faltantesPendientes} faltante(s) en el fondo y{" "}
                {datos.fondo.backlogSinAsignar} tarea(s) de backlog sin día.
              </p>
            </Tarjeta>
          )}
        </>
      )}
    </div>
  );
};
