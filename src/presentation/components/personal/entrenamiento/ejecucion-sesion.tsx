"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Button } from "../../button";
import { Combobox } from "../../select";
import { Icono } from "../../icons";
import { useToast } from "../../../hooks/useToast";
import { GestionarRegistroActividadUseCase } from "../../../../application/use-cases/personal/gestionar-registro-actividad.use-case";
import { obtenerDiaTareaHoy } from "../../../../domain/entidades/personal.entity";
import type {
  ItemCalentamiento,
  PlantillaRutina,
} from "../../../../domain/entidades/rutina.entity";
import type { ResultadoEjercicio } from "../../../../domain/entidades/registro-actividad.entity";
import {
  resultadosDePlan,
  rutinasDelDia,
  type PlanSesion,
} from "../../../../domain/entidades/progresion-entrenamiento.entity";

const useCase = new GestionarRegistroActividadUseCase();
const SIN_PLANTILLAS: never[] = [];
const SIN_EJERCICIOS: never[] = [];

interface EjecucionSesionProps {
  /** Salta a la estación "Rutinas" — usado por el empty state cuando todavía no hay ninguna creada. */
  onIrARutinas?: () => void;
}

/** La entrada en calor como lista con cantidades (o el texto, si la rutina es vieja). */
export const ListaCalentamiento: React.FC<{
  estructura?: ItemCalentamiento[];
  texto?: string;
}> = ({ estructura, texto }) => {
  if (!estructura?.length && !texto) return null;
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-2">
      <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">
        Calentamiento
      </span>
      {estructura?.length ? (
        estructura.map((i, k) => (
          <span key={k} className="text-xs text-zinc-300">
            • {i.nombre}
            {(i.series || i.reps || i.tiempoSeg) && (
              <span className="text-zinc-500">
                {" "}
                {i.series ? `${i.series}x` : ""}
                {i.reps ?? (i.tiempoSeg ? `${i.tiempoSeg}s` : "")}
                {i.nota ? ` ${i.nota}` : ""}
              </span>
            )}
          </span>
        ))
      ) : (
        <span className="text-xs text-zinc-400">{texto}</span>
      )}
    </div>
  );
};

/**
 * Ejecución de sesión — fricción cero pensada para usarse cansado: "Hice lo
 * planificado" es un solo tap. Muestra la rutina como Calentamiento →
 * Desarrollo, con los números YA progresados de esta semana del bloque (y el
 * mínimo). Solo si algo cambió se abre la edición por excepción, y solo pide
 * las repeticiones/peso reales por set. Sirve también para hacer hoy una
 * rutina que no tocaba hoy.
 */
export const EjecucionSesion: React.FC<EjecucionSesionProps> = ({
  onIrARutinas,
}) => {
  const { mostrarToast } = useToast();
  const hoy = obtenerDiaTareaHoy();
  const plantillas =
    useLiveQuery(() => db.plantilla_rutina.toArray()) || SIN_PLANTILLAS;
  const activas = plantillas.filter((p) => !p.eliminado);
  const ejercicios =
    useLiveQuery(() => db.catalogo_ejercicio.toArray()) || SIN_EJERCICIOS;
  const bloqueActivo = useLiveQuery(() =>
    db.bloque_entrenamiento
      .where("estado")
      .equals("activo")
      .and((b) => !b.eliminado)
      .first()
  );
  const registrosHoy =
    useLiveQuery(
      () => db.registro_actividad.where("diaTarea").equals(hoy).toArray(),
      [hoy]
    ) || SIN_EJERCICIOS;

  const [plantillaId, setPlantillaId] = useState("");
  const [editando, setEditando] = useState(false);
  const [resultadosEdicion, setResultadosEdicion] = useState<
    ResultadoEjercicio[]
  >([]);
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);

  const plantilla: PlantillaRutina | undefined = activas.find(
    (p) => p.id === plantillaId
  );
  const nombreEjercicio = (id: string) =>
    ejercicios.find((e) => e.id === id)?.nombre || id;
  const nombreNivel = (ejercicioId: string, nivel?: number) =>
    nivel === undefined
      ? undefined
      : ejercicios
          .find((e) => e.id === ejercicioId)
          ?.niveles.find((n) => n.nivel === nivel)?.nombre;

  // Plan del día con la progresión de esta semana ya aplicada.
  const planInfo = useLiveQuery(
    async () =>
      plantillaId
        ? useCase.planParaSesion(plantillaId, hoy, bloqueActivo?.id)
        : undefined,
    [
      plantillaId,
      hoy,
      bloqueActivo?.id,
      bloqueActivo?.pasosSemana,
      bloqueActivo?.descargas,
    ]
  );
  const plan: PlanSesion | undefined = planInfo?.plan;
  const programada = bloqueActivo?.rutinasProgramadas.find(
    (r) => r.plantillaId === plantillaId
  );

  const tocanHoy = bloqueActivo
    ? rutinasDelDia(bloqueActivo, hoy).map((r) => r.plantillaId)
    : [];
  const hechasHoy = new Set(registrosHoy.map((r) => r.plantillaId));

  const iniciarExcepcion = () => {
    if (!plantilla) return;
    if (plan) {
      setResultadosEdicion(resultadosDePlan(plan));
    } else if (plantilla.tipoEstructura === "series") {
      const estructura = plantilla.estructura as {
        bloques: { ejercicioId: string; sets: ResultadoEjercicio["sets"] }[];
      };
      setResultadosEdicion(
        estructura.bloques.map((b) => ({
          ejercicioId: b.ejercicioId,
          sets: b.sets.map((s) => ({ ...s })),
        }))
      );
    } else {
      setResultadosEdicion([]);
    }
    setEditando(true);
  };

  const finalizar = (idOk?: string) => {
    setPlantillaId("");
    setEditando(false);
    setNotas("");
    setResultadosEdicion([]);
    if (idOk) mostrarToast("Sesión registrada.", "exito");
  };

  const registrarComoPlanificado = async () => {
    if (!plantilla) return;
    setGuardando(true);
    const res = await useCase.registrarComoPlanificado(
      plantilla.id,
      hoy,
      bloqueActivo?.id
    );
    setGuardando(false);
    if (res.ok) finalizar(res.valor);
    else mostrarToast(res.error!.mensaje, "error");
  };

  const guardarExcepcion = async () => {
    if (!plantilla) return;
    setGuardando(true);
    const res = await useCase.registrarConExcepcion({
      plantillaId: plantilla.id,
      bloqueId: bloqueActivo?.id,
      diaTarea: hoy,
      comoPlanificado: false,
      resultados: resultadosEdicion,
      notas: notas || undefined,
    });
    setGuardando(false);
    if (res.ok) finalizar(res.valor);
    else mostrarToast(res.error!.mensaje, "error");
  };

  const actualizarSet = (
    idxEj: number,
    idxSet: number,
    campo: "reps" | "tiempoSeg" | "distanciaM" | "pesoKg",
    valor: string
  ) => {
    const num = valor === "" ? undefined : Number(valor);
    setResultadosEdicion((prev) =>
      prev.map((r, i) =>
        i !== idxEj
          ? r
          : {
              ...r,
              sets: r.sets.map((s, j) =>
                j !== idxSet ? s : { ...s, [campo]: num }
              ),
            }
      )
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center gap-2">
        <Icono.Dumbbell className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Registrar sesión de hoy
        </h3>
      </div>

      {activas.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-[#2A2A2E] p-4">
          <span className="text-sm text-zinc-400">
            Todavía no tenés ninguna rutina creada. Armá la primera para poder
            registrar una sesión acá.
          </span>
          {onIrARutinas && (
            <Button
              variant="outline"
              onClick={onIrARutinas}
              icono={<Icono.Plus className="h-4 w-4" />}
            >
              Crear mi primera rutina
            </Button>
          )}
        </div>
      ) : (
        <>
          {tocanHoy.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                Hoy toca
              </span>
              {tocanHoy.map((id) => (
                <button
                  key={id}
                  onClick={() => setPlantillaId(id)}
                  className={`rounded-lg border px-3 py-1 text-xs font-bold ${
                    plantillaId === id
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                      : hechasHoy.has(id)
                        ? "border-[#2A2A2E] text-zinc-600 line-through"
                        : "border-[#2A2A2E] text-zinc-300 hover:border-emerald-500/40"
                  }`}
                >
                  {activas.find((p) => p.id === id)?.nombre ?? id}
                </button>
              ))}
            </div>
          )}
          <Combobox
            value={plantillaId}
            onChange={setPlantillaId}
            options={activas.map((p) => ({ value: p.id, label: p.nombre }))}
            placeholder="O elegí otra rutina para hacer hoy..."
          />
        </>
      )}

      {plantilla && (
        <div className="flex flex-col gap-2">
          {plan && (
            <span className="text-[11px] text-zinc-500">
              Semana de progresión {plan.paso}
              {plan.esDescarga && (
                <span className="ml-1 font-bold text-sky-400">· descarga</span>
              )}
              {tocanHoy.length > 0 && !tocanHoy.includes(plantilla.id) && (
                <span className="ml-1 text-amber-400">
                  · no tocaba hoy: al registrarla queda hecha hoy
                </span>
              )}
            </span>
          )}
          <ListaCalentamiento
            estructura={
              programada?.calentamientoEstructuraBase ??
              plantilla.calentamientoEstructura
            }
            texto={programada?.calentamientoBase ?? plantilla.calentamiento}
          />
          {plan && plan.ejercicios.length > 0 && (
            <div className="flex flex-col gap-1 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-2">
              <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                Desarrollo
              </span>
              {plan.ejercicios.map((e) => {
                const s = e.sets[0] ?? {};
                const cantidad =
                  s.reps ??
                  (s.tiempoSeg
                    ? `${s.tiempoSeg}s`
                    : s.distanciaM
                      ? `${s.distanciaM}m`
                      : undefined);
                return (
                  <span key={e.ejercicioId} className="text-xs text-zinc-200">
                    {nombreEjercicio(e.ejercicioId)}
                    {cantidad !== undefined && (
                      <span className="text-zinc-400">
                        {" "}
                        {e.sets.length}x{cantidad}
                        {s.pesoKg ? ` @ ${s.pesoKg} kg` : ""}
                      </span>
                    )}
                    {e.nivel !== undefined && (
                      <span className="text-violet-300">
                        {" "}
                        ·{" "}
                        {nombreNivel(e.ejercicioId, e.nivel) ??
                          `nivel ${e.nivel}`}
                      </span>
                    )}
                    {e.minimo && (
                      <span className="text-sky-400">
                        {" "}
                        · mín.{" "}
                        {[
                          e.minimo.series && `${e.minimo.series} series`,
                          e.minimo.reps && `${e.minimo.reps} reps`,
                          e.minimo.pesoKg && `${e.minimo.pesoKg} kg`,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                  </span>
                );
              })}
              {plan.tipoEstructura === "tiempo" && plan.tiempo && (
                <span className="text-xs text-zinc-400">
                  {[
                    plan.tiempo.numeroRondas &&
                      `${plan.tiempo.numeroRondas} rondas`,
                    plan.tiempo.tiempoTrabajoSeg &&
                      `${plan.tiempo.tiempoTrabajoSeg}s trabajo`,
                    plan.tiempo.tiempoDescansoSeg &&
                      `${plan.tiempo.tiempoDescansoSeg}s descanso`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {plantilla && !editando && (
        <div className="flex gap-2">
          <Button
            onClick={registrarComoPlanificado}
            cargando={guardando}
            icono={<Icono.Check className="h-4 w-4" />}
          >
            Hice lo planificado
          </Button>
          <Button variant="outline" onClick={iniciarExcepcion}>
            Fue distinto
          </Button>
        </div>
      )}

      {plantilla && editando && (
        <div className="flex flex-col gap-2 border-t border-[#2A2A2E] pt-3">
          {resultadosEdicion.length === 0 && (
            <span className="text-xs text-zinc-600">
              Esta rutina es por tiempo/rondas — anotá lo que pase en notas.
            </span>
          )}
          {resultadosEdicion.map((r, idxEj) => (
            <div
              key={r.ejercicioId}
              className="flex flex-col gap-1.5 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-2"
            >
              <span className="text-xs font-bold text-zinc-400">
                {nombreEjercicio(r.ejercicioId)}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {r.sets.map((s, idxSet) => {
                  const campo =
                    s.reps !== undefined
                      ? "reps"
                      : s.tiempoSeg !== undefined
                        ? "tiempoSeg"
                        : s.distanciaM !== undefined
                          ? "distanciaM"
                          : "reps";
                  return (
                    <div key={idxSet} className="flex items-center gap-1">
                      <input
                        type="number"
                        value={s[campo] ?? ""}
                        onChange={(e) =>
                          actualizarSet(idxEj, idxSet, campo, e.target.value)
                        }
                        className="w-14 rounded border border-[#2A2A2E] bg-[#111113] px-1.5 py-1 text-xs text-zinc-200"
                      />
                      {s.pesoKg !== undefined && (
                        <input
                          type="number"
                          value={s.pesoKg ?? ""}
                          placeholder="kg"
                          onChange={(e) =>
                            actualizarSet(
                              idxEj,
                              idxSet,
                              "pesoKg",
                              e.target.value
                            )
                          }
                          className="w-14 rounded border border-[#2A2A2E] bg-[#111113] px-1.5 py-1 text-xs text-zinc-200"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas (opcional)"
            rows={2}
            className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditando(false)}
              className="text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
            >
              Cancelar
            </button>
            <Button onClick={guardarExcepcion} cargando={guardando}>
              Guardar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
