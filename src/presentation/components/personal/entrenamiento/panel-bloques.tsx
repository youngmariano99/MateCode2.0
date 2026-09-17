"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Button } from "../../button";
import { Select, Combobox } from "../../select";
import { Badge } from "../../badge";
import { Icono } from "../../icons";
import { ModalImportarJson } from "../../contenido/modal-importar-json";
import { useToast } from "../../../hooks/useToast";
import { GestionarBloquesUseCase } from "../../../../application/use-cases/personal/gestionar-bloques.use-case";
import { ImportarBloqueEntrenamientoUseCase } from "../../../../application/use-cases/personal/importar-bloque-entrenamiento.use-case";
import {
  generarPromptSecuenciaBloques,
  generarPromptBloqueCompleto,
} from "../../../../domain/prompts/generar-prompt-entrenamiento";
import { resumenBloqueCompleto } from "./resumen-import-entrenamiento";
import { ConfirmarEliminarBloqueModal } from "./confirmar-eliminar-bloque-modal";
import {
  EJES_PROGRESION,
  type EjeProgresion,
} from "../../../../domain/entidades/ejercicio.entity";
import { calcularMejoraEjercicio } from "../../../../domain/entidades/registro-actividad.entity";
import type {
  PlantillaRutina,
  BloqueEntrenamiento,
} from "../../../../domain/entidades/rutina.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../../domain/entidades/personal.entity";

const PLANTILLA_SECUENCIA = JSON.stringify(
  [
    {
      nombre: "Bloque 1 — Volumen",
      duracionSemanas: 4,
      ejeProgresionDefault: "volumen",
    },
    {
      nombre: "Bloque 2 — Fuerza",
      duracionSemanas: 4,
      ejeProgresionDefault: "carga",
    },
  ],
  null,
  2
);

const useCase = new GestionarBloquesUseCase();
const importarBloqueUseCase = new ImportarBloqueEntrenamientoUseCase();
const SIN_BLOQUES: never[] = [];
const SIN_RUTINAS: PlantillaRutina[] = [];
const SIN_EJERCICIOS: never[] = [];

/** Progreso real del bloque activo, por ejercicio, vía calcularMejoraEjercicio sobre sus RegistroActividad — para que la IA arme el próximo bloque en base a desempeño real, no a la plantilla teórica. */
async function armarResumenProgreso(
  bloqueActivoId: string,
  eje: EjeProgresion,
  nombrePorId: Map<string, string>
): Promise<string> {
  const registros = await db.registro_actividad
    .where("bloqueId")
    .equals(bloqueActivoId)
    .sortBy("diaTarea");
  if (registros.length === 0) return "";

  const ejercicioIds = new Set<string>();
  registros.forEach((r) =>
    r.resultados.forEach((res) => ejercicioIds.add(res.ejercicioId))
  );

  const lineas: string[] = [];
  for (const id of ejercicioIds) {
    const mejora = calcularMejoraEjercicio(registros, id, eje);
    if (!mejora) continue;
    const nombre = nombrePorId.get(id) || id;
    lineas.push(
      `- ${nombre}: arrancó en ${mejora.valorInicial}, llegó a ${mejora.valorFinal} (${mejora.sesiones} sesiones${mejora.mejoro ? ", mejoró" : ""}).`
    );
  }
  return lineas.join("\n");
}

const ETIQUETA_EJE: Record<EjeProgresion, string> = {
  carga: "Carga (kg)",
  volumen: "Volumen (reps/series)",
  progresion: "Progresión (nivel)",
};

const DIAS_SEMANA = [
  { valor: 1, corto: "L" },
  { valor: 2, corto: "M" },
  { valor: 3, corto: "M" },
  { valor: 4, corto: "J" },
  { valor: 5, corto: "V" },
  { valor: 6, corto: "S" },
  { valor: 0, corto: "D" },
];

function textoDias(diasSemana: number[]): string {
  const set = new Set(diasSemana);
  if (DIAS_SEMANA.every((d) => set.has(d.valor))) return "todos los días";
  return DIAS_SEMANA.filter((d) => set.has(d.valor))
    .map((d) => d.corto)
    .join("");
}

interface PanelBloquesProps {
  /** Salta a la estación "Rutinas" — se ofrece apenas se crea el primer bloque. */
  onIrARutinas?: () => void;
}

/**
 * Bloques (mesociclos): declarás UN eje de progresión por defecto para todo
 * el período — cada ejercicio cae solo al eje disponible más cercano si el
 * suyo no aplica (ver ejeEfectivo). Un solo bloque activo a la vez.
 */
export const PanelBloques: React.FC<PanelBloquesProps> = ({ onIrARutinas }) => {
  const { mostrarToast } = useToast();
  const [nombre, setNombre] = useState("");
  const [diaFin, setDiaFin] = useState(sumarDias(obtenerDiaTareaHoy(), 28));
  const [eje, setEje] = useState<EjeProgresion>("volumen");
  const [guardando, setGuardando] = useState(false);
  const [recienCreado, setRecienCreado] = useState(false);

  const [modalSecuenciaAbierto, setModalSecuenciaAbierto] = useState(false);
  const [modalBloqueCompletoAbierto, setModalBloqueCompletoAbierto] =
    useState(false);
  const [rutinaAVincular, setRutinaAVincular] = useState("");
  const [diasAVincular, setDiasAVincular] = useState<number[]>([1, 2, 3, 4, 5]);
  const [bloqueAEliminar, setBloqueAEliminar] =
    useState<BloqueEntrenamiento | null>(null);

  const bloques =
    useLiveQuery(() =>
      db.bloque_entrenamiento.filter((b) => !b.eliminado).toArray()
    ) || SIN_BLOQUES;
  const activo = bloques.find((b) => b.estado === "activo");
  const planificados = bloques
    .filter((b) => b.estado === "planificado")
    .sort((a, b) => (a.diaInicio < b.diaInicio ? -1 : 1));
  const esPrimerBloque = bloques.length === 0;

  const rutinasExistentes =
    useLiveQuery(() =>
      db.plantilla_rutina.filter((p) => !p.eliminado).toArray()
    ) || SIN_RUTINAS;
  const catalogoEjercicios =
    useLiveQuery(() => db.catalogo_ejercicio.toArray()) || SIN_EJERCICIOS;
  const equipamientoPropio =
    useLiveQuery(() =>
      db.catalogo_etiquetas
        .where("categoria")
        .equals("equipamiento_propio")
        .toArray()
    ) || SIN_EJERCICIOS;
  const nombrePorIdEjercicio = new Map(
    catalogoEjercicios.map((e) => [e.id, e.nombre])
  );
  const nombrePorIdRutina = new Map(
    rutinasExistentes.map((r) => [r.id, r.nombre])
  );
  const idsYaProgramados = new Set(
    (activo?.rutinasProgramadas || []).map((r) => r.plantillaId)
  );
  const rutinasDisponiblesParaVincular = rutinasExistentes.filter(
    (r) => !idsYaProgramados.has(r.id)
  );

  const crear = async () => {
    if (!nombre.trim()) return;
    setGuardando(true);
    const res = await useCase.crearBloque({
      nombre,
      diaInicio: obtenerDiaTareaHoy(),
      diaFin,
      ejeProgresionDefault: eje,
    });
    setGuardando(false);
    if (res.ok) {
      setNombre("");
      if (esPrimerBloque) setRecienCreado(true);
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  const cerrar = async (id: string) => {
    const res = await useCase.cerrarBloque(id);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  const handleCopiarPromptSecuencia = () => {
    const prompt = generarPromptSecuenciaBloques(activo || null);
    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt copiado al portapapeles.", "exito");
  };

  const importarSecuencia = async (items: unknown[]) => {
    const res = await useCase.importarSecuencia(
      items as {
        nombre: string;
        duracionSemanas?: number;
        ejeProgresionDefault: EjeProgresion;
      }[]
    );
    if (!res.ok) {
      throw new Error(res.error!.mensaje);
    }
    mostrarToast(`${res.valor} bloque(s) creado(s) en secuencia.`, "exito");
  };

  const handleCopiarPromptBloqueCompleto = async () => {
    const resumenProgreso = activo
      ? await armarResumenProgreso(
          activo.id,
          activo.ejeProgresionDefault,
          nombrePorIdEjercicio
        )
      : "";
    const prompt = generarPromptBloqueCompleto(
      catalogoEjercicios,
      equipamientoPropio.map((e) => e.etiqueta),
      rutinasExistentes,
      bloques,
      resumenProgreso
    );
    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt copiado al portapapeles.", "exito");
  };

  const importarBloqueCompleto = async (items: unknown[]) => {
    const res = await importarBloqueUseCase.importarBloqueCompleto(items);
    if (!res.ok) throw new Error(res.error!.mensaje);
    mostrarToast(res.valor, "exito");
  };

  const vincularRutina = async () => {
    if (!activo || !rutinaAVincular || diasAVincular.length === 0) return;
    const res = await useCase.programarRutina({
      bloqueId: activo.id,
      plantillaId: rutinaAVincular,
      diasSemana: diasAVincular,
    });
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
    else {
      setRutinaAVincular("");
      setDiasAVincular([1, 2, 3, 4, 5]);
    }
  };

  const quitarRutina = async (plantillaId: string) => {
    if (!activo) return;
    const res = await useCase.quitarRutinaDelBloque(activo.id, plantillaId);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  const toggleDia = (dia: number) => {
    setDiasAVincular((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icono.Flame className="h-4 w-4 text-zinc-500" />
          <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Bloque de entrenamiento
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => void handleCopiarPromptBloqueCompleto()}
            className="px-3 py-1.5 text-xs"
            icono={<Icono.Sparkles className="h-3.5 w-3.5" />}
          >
            Copiar prompt (bloque completo)
          </Button>
          <Button
            onClick={() => setModalBloqueCompletoAbierto(true)}
            className="px-3 py-1.5 text-xs"
          >
            Pegar plan generado
          </Button>
          <Button
            variant="outline"
            onClick={handleCopiarPromptSecuencia}
            className="px-3 py-1.5 text-xs"
            icono={<Icono.Copy className="h-3.5 w-3.5" />}
          >
            Solo periodización (sin rutinas)
          </Button>
          <Button
            variant="outline"
            onClick={() => setModalSecuenciaAbierto(true)}
            className="px-3 py-1.5 text-xs"
          >
            Importar secuencia
          </Button>
        </div>
      </div>

      {!activo && (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-[#2A2A2E] p-3">
          {esPrimerBloque && (
            <p className="text-xs text-zinc-500">
              Un bloque es un período de entrenamiento (2-6 semanas). Elegís un
              solo eje para medir tu progreso en todo el bloque — si un
              ejercicio no aplica a ese eje, el sistema usa automáticamente el
              más cercano para ese ejercicio en particular.
            </p>
          )}
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del bloque (ej. Bloque 1 — Volumen)"
            className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
          />
          <div className="flex flex-wrap items-end gap-2">
            <Select
              label="Eje de progresión"
              value={eje}
              onChange={(v) => setEje(v as EjeProgresion)}
              options={EJES_PROGRESION.map((e) => ({
                value: e,
                label: ETIQUETA_EJE[e],
              }))}
            />
            <input
              type="date"
              value={diaFin}
              onChange={(e) => setDiaFin(e.target.value)}
              className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
            <Button
              onClick={crear}
              cargando={guardando}
              disabled={!nombre.trim()}
            >
              Iniciar bloque
            </Button>
          </div>
        </div>
      )}

      {activo && (
        <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-sm font-bold text-zinc-200">
                {activo.nombre}
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge color="emerald">Activo</Badge>
                <Badge color="sky">
                  {ETIQUETA_EJE[activo.ejeProgresionDefault]}
                </Badge>
                <span className="text-xs text-zinc-500">
                  {activo.diaInicio} → {activo.diaFin}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                onClick={() => void cerrar(activo.id)}
                className="rounded border border-zinc-800 px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase hover:text-amber-400"
              >
                Cerrar bloque
              </button>
              <button
                onClick={() => setBloqueAEliminar(activo)}
                className="rounded border border-zinc-800 px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase hover:text-red-400"
              >
                Eliminar
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-emerald-500/10 pt-2">
            <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
              Rutinas de este bloque
            </span>
            {activo.rutinasProgramadas.length === 0 && (
              <span className="text-xs text-zinc-600">
                Sin rutinas vinculadas todavía.
              </span>
            )}
            <div className="flex flex-col gap-1">
              {activo.rutinasProgramadas.map((r) => (
                <div
                  key={r.plantillaId}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#2A2A2E] px-2 py-1"
                >
                  <span className="text-xs text-zinc-300">
                    {nombrePorIdRutina.get(r.plantillaId) || r.plantillaId}{" "}
                    <span className="text-zinc-500">
                      · {textoDias(r.diasSemana)}
                    </span>
                  </span>
                  <button
                    onClick={() => void quitarRutina(r.plantillaId)}
                    className="text-zinc-600 hover:text-red-400"
                    title="Quitar del bloque"
                  >
                    <Icono.Close className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {rutinasDisponiblesParaVincular.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Combobox
                      value={rutinaAVincular}
                      onChange={setRutinaAVincular}
                      options={rutinasDisponiblesParaVincular.map((r) => ({
                        value: r.id,
                        label: r.nombre,
                      }))}
                      placeholder="Vincular una rutina existente..."
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => void vincularRutina()}
                    disabled={!rutinaAVincular || diasAVincular.length === 0}
                    className="px-3 py-1.5 text-xs"
                  >
                    Vincular
                  </Button>
                </div>
                <div className="flex gap-1">
                  {DIAS_SEMANA.map((d) => (
                    <button
                      key={d.valor}
                      onClick={() => toggleDia(d.valor)}
                      className={`h-6 w-6 rounded-md border text-[10px] font-bold ${
                        diasAVincular.includes(d.valor)
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : "border-[#2A2A2E] text-zinc-500"
                      }`}
                    >
                      {d.corto}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {planificados.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-dashed border-[#2A2A2E] p-3">
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            En cola
          </span>
          {planificados.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-2 text-xs text-zinc-400"
            >
              <Badge color="sky">{ETIQUETA_EJE[b.ejeProgresionDefault]}</Badge>
              <span className="font-bold text-zinc-300">{b.nombre}</span>
              <span className="text-zinc-600">
                {b.diaInicio} → {b.diaFin}
              </span>
              <button
                onClick={() => setBloqueAEliminar(b)}
                className="ml-auto text-zinc-700 hover:text-red-400"
                title="Eliminar"
              >
                <Icono.Close className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {activo && recienCreado && onIrARutinas && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
          <span className="text-xs text-zinc-300">
            Bloque listo. Ahora armá tu primera rutina para poder registrar
            sesiones.
          </span>
          <Button
            variant="outline"
            onClick={() => {
              setRecienCreado(false);
              onIrARutinas();
            }}
            icono={<Icono.ArrowRight className="h-4 w-4" />}
          >
            Crear rutina
          </Button>
        </div>
      )}

      <ModalImportarJson
        abierto={modalSecuenciaAbierto}
        onCerrar={() => setModalSecuenciaAbierto(false)}
        titulo="Importar secuencia de bloques desde JSON"
        plantillaEjemplo={PLANTILLA_SECUENCIA}
        onImportar={importarSecuencia}
      />
      <ModalImportarJson
        abierto={modalBloqueCompletoAbierto}
        onCerrar={() => setModalBloqueCompletoAbierto(false)}
        titulo="Armar bloque completo desde JSON"
        renderResumen={resumenBloqueCompleto}
        plantillaEjemplo={JSON.stringify(
          {
            bloque: {
              nombre: "Bloque 2 — Fuerza",
              diaFin: sumarDias(obtenerDiaTareaHoy(), 28),
              ejeProgresionDefault: "carga",
            },
            rutinas: [
              {
                nombre: "Full Body A",
                formato: "tradicional",
                ejercicios: [
                  { nombre: "Flexiones de pecho", series: 4, reps: 10 },
                ],
              },
            ],
            ejerciciosNuevos: [],
          },
          null,
          2
        )}
        onImportar={importarBloqueCompleto}
      />
      {bloqueAEliminar && (
        <ConfirmarEliminarBloqueModal
          abierto
          bloque={bloqueAEliminar}
          onCerrar={() => setBloqueAEliminar(null)}
          onEliminado={() => setBloqueAEliminar(null)}
        />
      )}
    </div>
  );
};
