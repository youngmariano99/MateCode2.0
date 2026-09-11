"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Button } from "../../button";
import { Select, MultiSelect, Combobox } from "../../select";
import { Icono } from "../../icons";
import { ModalImportarJson } from "../../contenido/modal-importar-json";
import { useToast } from "../../../hooks/useToast";
import { GestionarPlantillasRutinaUseCase } from "../../../../application/use-cases/personal/gestionar-plantillas-rutina.use-case";
import {
  FORMATOS_RUTINA,
  type FormatoRutina,
  type TipoEstructura,
} from "../../../../domain/entidades/rutina.entity";
import {
  PATRONES_MOVIMIENTO,
  type PatronMovimiento,
} from "../../../../domain/entidades/ejercicio.entity";

const useCase = new GestionarPlantillasRutinaUseCase();
const SIN_EJERCICIOS: never[] = [];

const ETIQUETA_PATRON: Record<PatronMovimiento, string> = {
  empuje: "Empuje",
  tiron: "Tirón",
  dominante_rodilla: "Rodilla",
  dominante_cadera: "Cadera",
  core_transporte: "Core / transporte",
  pausa_movilidad: "Pausa / movilidad",
  neat: "NEAT",
};

const ETIQUETA_FORMATO: Record<FormatoRutina, string> = {
  tradicional: "Tradicional (series x reps)",
  piramide: "Pirámide",
  superserie: "Superserie",
  circuito: "Circuito",
  tabata: "Tabata (20s trabajo / 10s descanso)",
  emom: "EMOM (cada minuto)",
  amrap: "AMRAP (rondas en tiempo límite)",
  for_time: "For Time (contrarreloj)",
  liss: "Aeróbico continuo (LISS)",
  pausa_activa: "Pausa activa",
};

const FORMATOS_TIEMPO = new Set<FormatoRutina>([
  "circuito",
  "tabata",
  "emom",
  "amrap",
  "for_time",
  "liss",
  "pausa_activa",
]);

function tipoEstructuraDe(formato: FormatoRutina): TipoEstructura {
  return FORMATOS_TIEMPO.has(formato) ? "tiempo" : "series";
}

interface BloqueSerieForm {
  ejercicioId: string;
  numeroSets: number;
  reps: number;
  pesoKg?: number;
}

/** Chips para acotar el catálogo por patrón de movimiento antes de buscar. */
const FiltroPatron: React.FC<{
  value: PatronMovimiento | "";
  onChange: (v: PatronMovimiento | "") => void;
}> = ({ value, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    <button
      type="button"
      onClick={() => onChange("")}
      className={`min-h-8 rounded-full border px-2.5 text-[10px] font-bold uppercase transition-all ${
        value === ""
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          : "border-[#2A2A2E] text-zinc-500 hover:text-zinc-300"
      }`}
    >
      Todos
    </button>
    {PATRONES_MOVIMIENTO.map((p) => (
      <button
        key={p}
        type="button"
        onClick={() => onChange(value === p ? "" : p)}
        className={`min-h-8 rounded-full border px-2.5 text-[10px] font-bold uppercase transition-all ${
          value === p
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
            : "border-[#2A2A2E] text-zinc-500 hover:text-zinc-300"
        }`}
      >
        {ETIQUETA_PATRON[p]}
      </button>
    ))}
  </div>
);

/**
 * Alta de rutina: el formato elegido determina si se arma "por series"
 * (tradicional/pirámide/superserie — una lista de ejercicios con sets
 * uniformes; la variación real de una pirámide se termina reflejando al
 * ejecutar, no hace falta planificar set por set) o "por tiempo"
 * (Tabata/EMOM/AMRAP/For Time/circuito — un bloque de config con rondas y
 * tiempos, cada formato usa los campos que le corresponden).
 */
export const CrearPlantilla: React.FC = () => {
  const { mostrarToast } = useToast();
  const ejercicios =
    useLiveQuery(() => db.catalogo_ejercicio.toArray()) || SIN_EJERCICIOS;

  const [patronFiltro, setPatronFiltro] = useState<PatronMovimiento | "">("");
  const ejerciciosFiltrados = patronFiltro
    ? ejercicios.filter((e) => e.patron === patronFiltro)
    : ejercicios;
  const opcionesEjercicio = ejerciciosFiltrados.map((e) => ({
    value: e.id,
    label: e.nombre,
  }));

  const [nombre, setNombre] = useState("");
  const [formato, setFormato] = useState<FormatoRutina>("tradicional");
  const tipoEstructura = tipoEstructuraDe(formato);

  const [bloquesSeries, setBloquesSeries] = useState<BloqueSerieForm[]>([]);
  const [ejercicioNuevo, setEjercicioNuevo] = useState("");

  const [ejerciciosTiempo, setEjerciciosTiempo] = useState<string[]>([]);
  const [numeroRondas, setNumeroRondas] = useState("");
  const [tiempoTrabajoSeg, setTiempoTrabajoSeg] = useState("");
  const [tiempoDescansoSeg, setTiempoDescansoSeg] = useState("");
  const [tiempoLimiteMin, setTiempoLimiteMin] = useState("");

  const [guardando, setGuardando] = useState(false);

  const agregarEjercicioSerie = () => {
    if (!ejercicioNuevo) return;
    setBloquesSeries([
      ...bloquesSeries,
      { ejercicioId: ejercicioNuevo, numeroSets: 3, reps: 10 },
    ]);
    setEjercicioNuevo("");
  };

  const actualizarBloqueSerie = (
    idx: number,
    cambios: Partial<BloqueSerieForm>
  ) => {
    setBloquesSeries(
      bloquesSeries.map((b, i) => (i === idx ? { ...b, ...cambios } : b))
    );
  };

  const limpiar = () => {
    setNombre("");
    setBloquesSeries([]);
    setEjerciciosTiempo([]);
    setNumeroRondas("");
    setTiempoTrabajoSeg("");
    setTiempoDescansoSeg("");
    setTiempoLimiteMin("");
  };

  const guardar = async () => {
    if (!nombre.trim()) return;
    setGuardando(true);
    const estructura =
      tipoEstructura === "series"
        ? {
            bloques: bloquesSeries.map((b) => ({
              ejercicioId: b.ejercicioId,
              sets: Array.from({ length: b.numeroSets }, () => ({
                reps: b.reps,
                pesoKg: b.pesoKg,
              })),
            })),
          }
        : {
            ejercicioIds: ejerciciosTiempo,
            numeroRondas: numeroRondas ? Number(numeroRondas) : undefined,
            tiempoTrabajoSeg: tiempoTrabajoSeg
              ? Number(tiempoTrabajoSeg)
              : undefined,
            tiempoDescansoSeg: tiempoDescansoSeg
              ? Number(tiempoDescansoSeg)
              : undefined,
            tiempoLimiteMin: tiempoLimiteMin
              ? Number(tiempoLimiteMin)
              : undefined,
          };
    const res = await useCase.crearPlantilla({
      nombre,
      formato,
      tipoEstructura,
      estructura,
    });
    setGuardando(false);
    if (res.ok) {
      limpiar();
      mostrarToast("Rutina creada.", "exito");
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  const [modalImportarAbierto, setModalImportarAbierto] = useState(false);

  const plantillaEjemploImport = JSON.stringify(
    [
      {
        nombre: "Full Body A",
        formato: "tradicional",
        ejercicios: [
          {
            // Nombre EXACTO tal como figura en el catálogo de esta app —
            // no inventar ejercicios nuevos.
            nombre: ejercicios[0]?.nombre || "Flexiones de pecho",
            series: 3,
            reps: 10,
            pesoKg: null,
          },
        ],
      },
      {
        nombre: "Tabata Full Body",
        formato: "tabata",
        ejercicios: [ejercicios[1]?.nombre || "Sentadillas", "Burpees"],
        numeroRondas: 8,
        tiempoTrabajoSeg: 20,
        tiempoDescansoSeg: 10,
      },
    ],
    null,
    2
  );

  const importarRutinas = async (items: unknown[]) => {
    let creadas = 0;
    const noEncontrados: string[] = [];

    for (const raw of items) {
      const item = raw as {
        nombre?: string;
        formato?: string;
        ejercicios?: unknown[];
        numeroRondas?: number;
        tiempoTrabajoSeg?: number;
        tiempoDescansoSeg?: number;
        tiempoLimiteMin?: number;
      };
      if (!item.nombre || !Array.isArray(item.ejercicios)) continue;

      const formatoResuelto =
        FORMATOS_RUTINA.find(
          (f) => f.toLowerCase() === String(item.formato || "").toLowerCase()
        ) || "tradicional";
      const tipo = tipoEstructuraDe(formatoResuelto);

      const resolverEjercicioPorNombre = (nombreBuscado: string) => {
        const encontrado = ejercicios.find(
          (e) =>
            e.nombre.toLowerCase().trim() === nombreBuscado.toLowerCase().trim()
        );
        if (!encontrado) noEncontrados.push(nombreBuscado);
        return encontrado?.id;
      };

      let estructura: Record<string, unknown>;
      if (tipo === "series") {
        const bloques = (
          item.ejercicios as {
            nombre?: string;
            series?: number;
            reps?: number;
            pesoKg?: number;
          }[]
        )
          .map((ej) => {
            const id = ej.nombre
              ? resolverEjercicioPorNombre(ej.nombre)
              : undefined;
            if (!id) return null;
            return {
              ejercicioId: id,
              sets: Array.from({ length: ej.series || 3 }, () => ({
                reps: ej.reps || 10,
                pesoKg: ej.pesoKg ?? undefined,
              })),
            };
          })
          .filter((b): b is NonNullable<typeof b> => b !== null);
        if (bloques.length === 0) continue;
        estructura = { bloques };
      } else {
        const ejercicioIds = (item.ejercicios as unknown[])
          .map((e) => resolverEjercicioPorNombre(String(e)))
          .filter((id): id is string => !!id);
        if (ejercicioIds.length === 0) continue;
        estructura = {
          ejercicioIds,
          numeroRondas: item.numeroRondas,
          tiempoTrabajoSeg: item.tiempoTrabajoSeg,
          tiempoDescansoSeg: item.tiempoDescansoSeg,
          tiempoLimiteMin: item.tiempoLimiteMin,
        };
      }

      const res = await useCase.crearPlantilla({
        nombre: item.nombre,
        formato: formatoResuelto,
        tipoEstructura: tipo,
        estructura,
      });
      if (res.ok) creadas++;
    }

    if (creadas === 0) {
      throw new Error(
        noEncontrados.length > 0
          ? `No se encontró en el catálogo: ${noEncontrados.join(", ")}. Revisá los nombres exactos.`
          : "No se pudo crear ninguna rutina del JSON pegado."
      );
    }
    mostrarToast(
      noEncontrados.length > 0
        ? `${creadas} rutina(s) creada(s). No se encontraron estos ejercicios: ${noEncontrados.join(", ")}.`
        : `${creadas} rutina(s) creada(s) con éxito.`,
      noEncontrados.length > 0 ? "info" : "exito"
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icono.Plus className="h-4 w-4 text-zinc-500" />
          <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Nueva rutina
          </h3>
        </div>
        <Button
          variant="outline"
          onClick={() => setModalImportarAbierto(true)}
          className="px-3 py-1.5 text-xs"
        >
          Importar JSON
        </Button>
      </div>

      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre de la rutina (ej. Full Body A)"
        className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
      />
      <Select
        label="Formato"
        value={formato}
        onChange={(v) => setFormato(v as FormatoRutina)}
        options={FORMATOS_RUTINA.map((f) => ({
          value: f,
          label: ETIQUETA_FORMATO[f],
        }))}
      />

      {tipoEstructura === "series" ? (
        <div className="flex flex-col gap-2 border-t border-[#2A2A2E] pt-3">
          <p className="text-xs text-zinc-500">
            Elegís ejercicios y armás series x repeticiones. Sirve igual para
            tradicional o pirámide — la variación de reps entre series se
            registra al ejecutar, no hace falta planificarla acá.
          </p>
          <FiltroPatron value={patronFiltro} onChange={setPatronFiltro} />
          <div className="flex gap-2">
            <div className="flex-1">
              <Combobox
                value={ejercicioNuevo}
                onChange={setEjercicioNuevo}
                options={opcionesEjercicio}
                placeholder="Buscá un ejercicio..."
              />
            </div>
            <Button
              variant="outline"
              onClick={agregarEjercicioSerie}
              disabled={!ejercicioNuevo}
            >
              Agregar
            </Button>
          </div>
          {bloquesSeries.map((b, idx) => {
            const ej = ejercicios.find((e) => e.id === b.ejercicioId);
            return (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-2"
              >
                <span className="min-w-[140px] text-sm text-zinc-200">
                  {ej?.nombre || b.ejercicioId}
                </span>
                <input
                  type="number"
                  min={1}
                  value={b.numeroSets}
                  onChange={(e) =>
                    actualizarBloqueSerie(idx, {
                      numeroSets: Number(e.target.value) || 1,
                    })
                  }
                  title="Series"
                  className="w-14 rounded border border-[#2A2A2E] bg-[#111113] px-1.5 py-1 text-xs text-zinc-200"
                />
                <span className="text-xs text-zinc-600">series x</span>
                <input
                  type="number"
                  min={1}
                  value={b.reps}
                  onChange={(e) =>
                    actualizarBloqueSerie(idx, {
                      reps: Number(e.target.value) || 1,
                    })
                  }
                  title={
                    ej?.tipoConteo === "tiempo" ? "Segundos" : "Repeticiones"
                  }
                  className="w-14 rounded border border-[#2A2A2E] bg-[#111113] px-1.5 py-1 text-xs text-zinc-200"
                />
                <span className="text-xs text-zinc-600">
                  {ej?.tipoConteo === "tiempo" ? "seg" : "reps"}
                </span>
                {ej?.permiteCarga && (
                  <input
                    type="number"
                    placeholder="kg"
                    value={b.pesoKg ?? ""}
                    onChange={(e) =>
                      actualizarBloqueSerie(idx, {
                        pesoKg: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    className="w-16 rounded border border-[#2A2A2E] bg-[#111113] px-1.5 py-1 text-xs text-zinc-200"
                  />
                )}
                <button
                  onClick={() =>
                    setBloquesSeries(bloquesSeries.filter((_, i) => i !== idx))
                  }
                  className="ml-auto text-zinc-600 hover:text-red-400"
                >
                  <Icono.Close className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2 border-t border-[#2A2A2E] pt-3">
          <p className="text-xs text-zinc-500">
            Este formato se mide por tiempo o rondas, no por series fijas —
            elegís los ejercicios del circuito y completás solo los campos que
            apliquen a {ETIQUETA_FORMATO[formato]}.
          </p>
          <FiltroPatron value={patronFiltro} onChange={setPatronFiltro} />
          <MultiSelect
            label="Ejercicios"
            value={ejerciciosTiempo}
            onChange={setEjerciciosTiempo}
            options={opcionesEjercicio}
            placeholder="Ejercicios de esta rutina"
          />
          <div className="flex flex-wrap gap-2">
            <input
              type="number"
              placeholder="Rondas"
              value={numeroRondas}
              onChange={(e) => setNumeroRondas(e.target.value)}
              className="w-24 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
            <input
              type="number"
              placeholder="Trabajo (seg)"
              value={tiempoTrabajoSeg}
              onChange={(e) => setTiempoTrabajoSeg(e.target.value)}
              className="w-28 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
            <input
              type="number"
              placeholder="Descanso (seg)"
              value={tiempoDescansoSeg}
              onChange={(e) => setTiempoDescansoSeg(e.target.value)}
              className="w-28 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
            <input
              type="number"
              placeholder="Tiempo límite (min)"
              value={tiempoLimiteMin}
              onChange={(e) => setTiempoLimiteMin(e.target.value)}
              className="w-32 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
          </div>
        </div>
      )}

      <Button
        onClick={guardar}
        cargando={guardando}
        disabled={!nombre.trim()}
        className="self-end"
      >
        Guardar rutina
      </Button>

      <ModalImportarJson
        abierto={modalImportarAbierto}
        onCerrar={() => setModalImportarAbierto(false)}
        titulo="Importar rutinas desde JSON"
        plantillaEjemplo={plantillaEjemploImport}
        onImportar={importarRutinas}
      />
    </div>
  );
};
