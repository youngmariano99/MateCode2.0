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
import type { EstructuraSeries } from "../../../../domain/entidades/rutina.entity";
import type { ResultadoEjercicio } from "../../../../domain/entidades/registro-actividad.entity";

const useCase = new GestionarRegistroActividadUseCase();
const SIN_PLANTILLAS: never[] = [];
const SIN_EJERCICIOS: never[] = [];

interface EjecucionSesionProps {
  /** Salta a la estación "Rutinas" — usado por el empty state cuando todavía no hay ninguna creada. */
  onIrARutinas?: () => void;
}

/**
 * Ejecución de sesión — fricción cero pensada para usarse cansado: "Hice lo
 * planificado" es un solo tap. Solo si algo cambió se abre la edición por
 * excepción, y solo pide las repeticiones/peso reales por set, nada más.
 */
export const EjecucionSesion: React.FC<EjecucionSesionProps> = ({
  onIrARutinas,
}) => {
  const { mostrarToast } = useToast();
  const plantillas =
    useLiveQuery(() => db.plantilla_rutina.toArray()) || SIN_PLANTILLAS;
  const activas = plantillas.filter((p) => !p.eliminado);
  const ejercicios =
    useLiveQuery(() => db.catalogo_ejercicio.toArray()) || SIN_EJERCICIOS;
  const bloqueActivo = useLiveQuery(() =>
    db.bloque_entrenamiento.where("estado").equals("activo").first()
  );

  const [plantillaId, setPlantillaId] = useState("");
  const [editando, setEditando] = useState(false);
  const [resultadosEdicion, setResultadosEdicion] = useState<
    ResultadoEjercicio[]
  >([]);
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);

  const plantilla = activas.find((p) => p.id === plantillaId);
  const nombreEjercicio = (id: string) =>
    ejercicios.find((e) => e.id === id)?.nombre || id;

  const iniciarExcepcion = () => {
    if (!plantilla) return;
    if (plantilla.tipoEstructura === "series") {
      const estructura = plantilla.estructura as EstructuraSeries;
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
      obtenerDiaTareaHoy(),
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
      diaTarea: obtenerDiaTareaHoy(),
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
        <Combobox
          value={plantillaId}
          onChange={setPlantillaId}
          options={activas.map((p) => ({ value: p.id, label: p.nombre }))}
          placeholder="Buscá una rutina..."
        />
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
