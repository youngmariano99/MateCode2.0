"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { Icono } from "../icons";
import { Badge } from "../badge";
import { useToast } from "../../hooks/useToast";
import { ModalImportarJson } from "../contenido/modal-importar-json";
import { resumenArbolCompleto } from "./resumen-import-jerarquia";
import {
  DistribuirProyectoModal,
  RepartirEnDiasModal,
} from "./asistente-distribuir";
import { GenerarFasesModal } from "./generar-fases-modal";
import { GestionarAreasUseCase } from "../../../application/use-cases/personal/gestionar-areas.use-case";
import { GestionarObjetivosUseCase } from "../../../application/use-cases/personal/gestionar-objetivos.use-case";
import { GestionarProyectosPersonalUseCase } from "../../../application/use-cases/personal/gestionar-proyectos-personal.use-case";
import { GestionarEntregablesUseCase } from "../../../application/use-cases/personal/gestionar-entregables.use-case";
import { ImportarArbolPersonalUseCase } from "../../../application/use-cases/personal/importar-arbol-personal.use-case";
import { generarPromptPlanificacionEnFases } from "../../../domain/prompts/generar-prompt-jerarquia-personal";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";
import type { ProyectoPersonal } from "../../../domain/entidades/proyecto-personal.entity";
import type { Entregable } from "../../../domain/entidades/entregable.entity";

const areasUseCase = new GestionarAreasUseCase();
const objetivosUseCase = new GestionarObjetivosUseCase();
const proyectosUseCase = new GestionarProyectosPersonalUseCase();
const entregablesUseCase = new GestionarEntregablesUseCase();
const importarUseCase = new ImportarArbolPersonalUseCase();

const PASOS_WIZARD = [
  { num: 1, titulo: "1. Área y Objetivo", sub: "El norte cuantificable" },
  { num: 2, titulo: "2. Proyectos", sub: "Frentes de trabajo" },
  { num: 3, titulo: "3. Entregables", sub: "Acciones y entregas" },
  { num: 4, titulo: "4. Fases y Días", sub: "Ritmo semanal y diario" },
] as const;

const campo =
  "w-full rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500/50";
const rotulo = "text-[11px] font-bold tracking-wider text-zinc-500 uppercase";

export interface WizardPlanificacionPersonalProps {
  abierto: boolean;
  onCerrar: () => void;
}

export const WizardPlanificacionPersonal: React.FC<
  WizardPlanificacionPersonalProps
> = ({ abierto, onCerrar }) => {
  const { mostrarToast } = useToast();
  const hoy = obtenerDiaTareaHoy();

  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1);
  const [areaId, setAreaId] = useState("");
  const [objetivoId, setObjetivoId] = useState("");
  const [proyectoId, setProyectoId] = useState("");

  // Estado alta rápida dentro del wizard
  const [nuevaAreaNombre, setNuevaAreaNombre] = useState("");
  const [objTitulo, setObjTitulo] = useState("");
  const [objCantidad, setObjCantidad] = useState("");
  const [objUnidad, setObjUnidad] = useState("");
  const [objLimite, setObjLimite] = useState(sumarDias(hoy, 90));

  const [proyTitulo, setProyTitulo] = useState("");
  const [proyLimite, setProyLimite] = useState(sumarDias(hoy, 30));
  const [proyCantidad, setProyCantidad] = useState("");
  const [proyUnidad, setProyUnidad] = useState("");

  const [entTitulo, setEntTitulo] = useState("");
  const [entLimite, setEntLimite] = useState(sumarDias(hoy, 30));
  const [entCantidad, setEntCantidad] = useState("");
  const [entUnidad, setEntUnidad] = useState("");

  // Modales auxiliares del Paso 3 y 4
  const [modalIA, setModalIA] = useState(false);
  const [distribuirProy, setDistribuirProy] = useState<ProyectoPersonal | null>(
    null
  );
  const [generarFasesEnt, setGenerarFasesEnt] = useState<Entregable | null>(
    null
  );
  const [repartirDiasEnt, setRepartirDiasEnt] = useState<Entregable | null>(
    null
  );

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

  const areaActual = areas.find((a) => a.id === areaId);
  const objetivosDelArea = areaId
    ? objetivos.filter((o) => o.areaId === areaId)
    : objetivos;
  const objetivoActual = objetivos.find((o) => o.id === objetivoId);
  const proyectosDelObjetivo = proyectos.filter(
    (p) => p.objetivoId === objetivoId
  );
  const proyectoActual =
    proyectos.find((p) => p.id === proyectoId) ?? proyectosDelObjetivo[0];
  const entregablesDelProyecto = proyectoActual
    ? entregables.filter((e) => e.proyectoId === proyectoActual.id)
    : [];

  const crearAreaRapida = async () => {
    if (!nuevaAreaNombre.trim()) return;
    const res = await areasUseCase.crearArea({ nombre: nuevaAreaNombre });
    if (!res.ok) {
      mostrarToast(res.error!.mensaje, "error");
      return;
    }
    setAreaId(res.valor!);
    setNuevaAreaNombre("");
    mostrarToast("Área creada y seleccionada.", "exito");
  };

  const crearObjetivoRapido = async () => {
    const res = await objetivosUseCase.crearObjetivo({
      titulo: objTitulo,
      areaId: areaId || undefined,
      cantidadObjetivo: Number(objCantidad),
      unidad: objUnidad,
      diaInicio: hoy,
      diaLimite: objLimite,
    });
    if (!res.ok) {
      mostrarToast(res.error!.mensaje, "error");
      return;
    }
    setObjetivoId(res.valor!);
    setObjTitulo("");
    setObjCantidad("");
    setObjUnidad("");
    mostrarToast("Objetivo creado. Pasando a Proyectos…", "exito");
    setPaso(2);
  };

  const crearProyectoRapido = async () => {
    if (!objetivoId) return;
    const res = await proyectosUseCase.crearProyecto({
      objetivoId,
      titulo: proyTitulo,
      diaInicio: hoy,
      diaLimite: proyLimite,
      cantidadObjetivo: proyCantidad ? Number(proyCantidad) : undefined,
      unidad: proyCantidad ? proyUnidad : undefined,
    });
    if (!res.ok) {
      mostrarToast(res.error!.mensaje, "error");
      return;
    }
    setProyectoId(res.valor!);
    setProyTitulo("");
    setProyCantidad("");
    setProyUnidad("");
    mostrarToast("Proyecto agregado al objetivo.", "exito");
  };

  const crearEntregableRapido = async () => {
    if (!proyectoActual) return;
    const res = await entregablesUseCase.crearEntregable({
      proyectoId: proyectoActual.id,
      objetivoId: proyectoActual.objetivoId,
      titulo: entTitulo,
      diaInicio: hoy,
      diaLimite: entLimite,
      cantidadObjetivo: entCantidad ? Number(entCantidad) : undefined,
      unidad: entCantidad ? entUnidad : undefined,
    });
    if (!res.ok) {
      mostrarToast(res.error!.mensaje, "error");
      return;
    }
    setEntTitulo("");
    setEntCantidad("");
    setEntUnidad("");
    mostrarToast("Entregable agregado al proyecto.", "exito");
  };

  const copiarPromptIA = () => {
    const resumenHistorico =
      objetivos.length > 0
        ? objetivos.map((o) => `- ${o.titulo}`).join("\n")
        : "Sin objetivos cargados todavía.";
    const resumenFases =
      fases.length > 0
        ? fases
            .slice(-10)
            .map((f) => `- ${f.titulo} (${f.diaInicio} → ${f.diaLimite})`)
            .join("\n")
        : "Sin fases recientes.";
    const prompt = generarPromptPlanificacionEnFases(
      resumenHistorico,
      areas.map((a) => a.nombre),
      resumenFases
    );
    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt por etapas copiado al portapapeles.", "exito");
  };

  const importarConIA = async (items: unknown[]) => {
    const res = await importarUseCase.importarArbol(items);
    if (!res.ok) throw new Error(res.error!.mensaje);
    mostrarToast(res.valor, "exito");
    onCerrar();
  };

  return (
    <Dialog
      abierto={abierto}
      onClose={onCerrar}
      titulo="Asistente de Planificación Paso a Paso"
      maxWidth="xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div>
            {paso > 1 && (
              <Button
                variant="outline"
                onClick={() => setPaso((p) => (p - 1) as 1 | 2 | 3 | 4)}
              >
                ← Paso anterior
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onCerrar}
              className="min-h-11 rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
            >
              Cerrar
            </button>
            {paso < 4 ? (
              <Button
                onClick={() => setPaso((p) => (p + 1) as 1 | 2 | 3 | 4)}
                disabled={
                  (paso === 1 && !objetivoId) ||
                  (paso === 2 && proyectosDelObjetivo.length === 0) ||
                  (paso === 3 && entregablesDelProyecto.length === 0)
                }
              >
                Siguiente paso →
              </Button>
            ) : (
              <Button onClick={onCerrar}>Finalizar planificación</Button>
            )}
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Barra de progreso de los 4 pasos */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PASOS_WIZARD.map((p) => {
            const activo = paso === p.num;
            const completado = paso > p.num;
            return (
              <button
                key={p.num}
                type="button"
                onClick={() => {
                  if (p.num === 1 || objetivoId) setPaso(p.num);
                }}
                className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                  activo
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : completado
                      ? "border-emerald-500/20 bg-[#141417]"
                      : "border-[#2A2A2E] bg-[#0D0D0F] opacity-60"
                }`}
              >
                <span
                  className={`text-xs font-bold ${
                    activo
                      ? "text-emerald-400"
                      : completado
                        ? "text-emerald-300"
                        : "text-zinc-400"
                  }`}
                >
                  {p.titulo}
                </span>
                <span className="text-[10px] text-zinc-500">{p.sub}</span>
              </button>
            );
          })}
        </div>

        {/* Atajo IA siempre accesible en el Paso 1 */}
        {paso === 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div>
              <span className="text-xs font-bold text-emerald-300">
                ¿Preferís armar todo el árbol conversando con la IA?
              </span>
              <p className="text-[11px] text-zinc-400">
                Copiá el prompt guiado por etapas, conversalo con Claude/ChatGPT
                y pegá el JSON final acá.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={copiarPromptIA}
                icono={<Icono.Sparkles className="h-3.5 w-3.5" />}
              >
                1. Copiar prompt IA
              </Button>
              <Button variant="outline" onClick={() => setModalIA(true)}>
                2. Pegar plan JSON
              </Button>
            </div>
          </div>
        )}

        {/* PASO 1: Área y Objetivo */}
        {paso === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#141417] p-3.5">
              <span className={rotulo}>1A. Elegí o creá el Área</span>
              <div className="flex flex-wrap gap-1.5">
                {areas.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAreaId(a.id)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                      areaId === a.id
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                        : "border-[#2A2A2E] bg-[#0D0D0F] text-zinc-400"
                    }`}
                  >
                    {a.nombre}
                  </button>
                ))}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 sm:flex-nowrap">
                <input
                  value={nuevaAreaNombre}
                  onChange={(e) => setNuevaAreaNombre(e.target.value)}
                  placeholder="O crear nueva área (ej. Agencia, Salud)…"
                  className={campo}
                />
                <Button
                  variant="outline"
                  onClick={() => void crearAreaRapida()}
                  disabled={!nuevaAreaNombre.trim()}
                >
                  + Crear Área
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-[#2A2A2E] bg-[#141417] p-3.5">
              <span className={rotulo}>
                1B. Elegí un Objetivo existente o creá uno nuevo
                {areaActual ? ` en "${areaActual.nombre}"` : ""}
              </span>
              {objetivosDelArea.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {objetivosDelArea.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setObjetivoId(o.id)}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 text-left text-xs ${
                        objetivoId === o.id
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                          : "border-[#2A2A2E] bg-[#0D0D0F] text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      <span className="min-w-0 font-bold">{o.titulo}</span>
                      <span className="text-zinc-500">
                        {o.progresoActual}/{o.cantidadObjetivo} {o.unidad} ·
                        vence {o.diaLimite}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-[#232326] pt-3">
                <span className="text-xs font-bold text-zinc-400">
                  Crear nuevo Objetivo:
                </span>
                <input
                  value={objTitulo}
                  onChange={(e) => setObjTitulo(e.target.value)}
                  placeholder="Título del objetivo (ej. Llegar a 250 contactos o $2.900.000 ARS)"
                  className={campo}
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    type="number"
                    min={1}
                    value={objCantidad}
                    onChange={(e) => setObjCantidad(e.target.value)}
                    placeholder="Cantidad meta (ej. 250)"
                    className={campo}
                  />
                  <input
                    value={objUnidad}
                    onChange={(e) => setObjUnidad(e.target.value)}
                    placeholder="Unidad (ej. contactos)"
                    className={campo}
                  />
                  <input
                    type="date"
                    value={objLimite}
                    onChange={(e) => setObjLimite(e.target.value)}
                    className={campo}
                  />
                </div>
                <Button
                  onClick={() => void crearObjetivoRapido()}
                  disabled={
                    !objTitulo.trim() || !objCantidad || !objUnidad.trim()
                  }
                  className="self-end"
                >
                  Crear Objetivo y seguir →
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* PASO 2: Proyectos del Objetivo */}
        {paso === 2 && objetivoActual && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
              <span className="text-[10px] font-bold text-emerald-400 uppercase">
                Objetivo seleccionado
              </span>
              <p className="text-sm font-bold text-zinc-100">
                {objetivoActual.titulo} ({objetivoActual.cantidadObjetivo}{" "}
                {objetivoActual.unidad} · hasta {objetivoActual.diaLimite})
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className={rotulo}>
                Proyectos de este Objetivo ({proyectosDelObjetivo.length})
              </span>
              {proyectosDelObjetivo.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  Todavía no hay proyectos bajo este objetivo. Agregá al menos
                  uno abajo.
                </p>
              ) : (
                proyectosDelObjetivo.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setProyectoId(p.id)}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${
                      proyectoActual?.id === p.id
                        ? "border-emerald-500/50 bg-emerald-500/10"
                        : "border-[#2A2A2E] bg-[#0D0D0F]"
                    }`}
                  >
                    <div>
                      <span className="text-sm font-bold text-zinc-200">
                        {p.titulo}
                      </span>
                      <span className="ml-2 text-xs text-zinc-500">
                        vence {p.diaLimite}
                      </span>
                    </div>
                    <Badge
                      color={proyectoActual?.id === p.id ? "emerald" : "zinc"}
                    >
                      {proyectoActual?.id === p.id ? "Seleccionado" : "Elegir"}
                    </Badge>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#141417] p-3.5">
              <span className={rotulo}>+ Agregar Proyecto al Objetivo</span>
              <input
                value={proyTitulo}
                onChange={(e) => setProyTitulo(e.target.value)}
                placeholder="Ej: Motor de Prospección (Contacto en Frío)"
                className={campo}
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  type="date"
                  value={proyLimite}
                  onChange={(e) => setProyLimite(e.target.value)}
                  className={campo}
                />
                <input
                  type="number"
                  min={1}
                  value={proyCantidad}
                  onChange={(e) => setProyCantidad(e.target.value)}
                  placeholder="Meta opcional (ej. 250)"
                  className={campo}
                />
                <input
                  value={proyUnidad}
                  onChange={(e) => setProyUnidad(e.target.value)}
                  placeholder="Unidad opcional"
                  className={campo}
                />
              </div>
              <Button
                onClick={() => void crearProyectoRapido()}
                disabled={!proyTitulo.trim()}
                className="self-end"
              >
                + Guardar Proyecto
              </Button>
            </div>
          </div>
        )}

        {/* PASO 3: Entregables del Proyecto */}
        {paso === 3 && proyectoActual && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase">
                  Proyecto activo en desglose
                </span>
                <p className="text-sm font-bold text-zinc-100">
                  {proyectoActual.titulo}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setDistribuirProy(proyectoActual)}
              >
                Dividir proyecto en semanas automáticamente
              </Button>
            </div>

            {proyectosDelObjetivo.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {proyectosDelObjetivo.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProyectoId(p.id)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                      proyectoActual.id === p.id
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                        : "border-[#2A2A2E] text-zinc-400"
                    }`}
                  >
                    {p.titulo}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className={rotulo}>
                Entregables de &quot;{proyectoActual.titulo}&quot; (
                {entregablesDelProyecto.length})
              </span>
              {entregablesDelProyecto.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3"
                >
                  <span className="min-w-0 text-sm font-bold text-zinc-200">
                    {e.titulo}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {e.cantidadObjetivo
                      ? `${e.progresoActual}/${e.cantidadObjetivo} ${e.unidad}`
                      : `vence ${e.diaLimite}`}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#141417] p-3.5">
              <span className={rotulo}>+ Agregar Entregable manual</span>
              <input
                value={entTitulo}
                onChange={(e) => setEntTitulo(e.target.value)}
                placeholder="Ej: Búsqueda y armado de pitch (Mañana)"
                className={campo}
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  type="date"
                  value={entLimite}
                  onChange={(e) => setEntLimite(e.target.value)}
                  className={campo}
                />
                <input
                  type="number"
                  min={1}
                  value={entCantidad}
                  onChange={(e) => setEntCantidad(e.target.value)}
                  placeholder="Cantidad total (ej. 970)"
                  className={campo}
                />
                <input
                  value={entUnidad}
                  onChange={(e) => setEntUnidad(e.target.value)}
                  placeholder="Unidad (ej. contactos)"
                  className={campo}
                />
              </div>
              <Button
                onClick={() => void crearEntregableRapido()}
                disabled={!entTitulo.trim()}
                className="self-end"
              >
                + Guardar Entregable
              </Button>
            </div>
          </div>
        )}

        {/* PASO 4: Fases y Reparto en Días */}
        {paso === 4 && proyectoActual && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-zinc-400">
              Para cada Entregable de{" "}
              <strong className="text-zinc-200">{proyectoActual.titulo}</strong>
              , podés generar sus Fases semanales/progresivas o repartir sus
              actividades directamente en los días de la semana:
            </p>
            {entregablesDelProyecto.map((e) => {
              const fasesEnt = fases.filter((f) => f.entregableId === e.id);
              return (
                <div
                  key={e.id}
                  className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-bold text-zinc-100">
                        {e.titulo}
                      </span>
                      <span className="ml-2 text-xs text-zinc-500">
                        {e.cantidadObjetivo
                          ? `${e.cantidadObjetivo} ${e.unidad}`
                          : "Sin meta numérica"}{" "}
                        · {fasesEnt.length} fase(s) creada(s)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setGenerarFasesEnt(e)}
                      >
                        Generar Fases (semanas/progresión)
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setRepartirDiasEnt(e)}
                      >
                        Repartir en días (Lun–Dom)
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ModalImportarJson
        abierto={modalIA}
        onCerrar={() => setModalIA(false)}
        titulo="Importar árbol de planificación generado por IA"
        plantillaEjemplo='{"areaTitulo":"Agencia","objetivosNuevos":[]}'
        onImportar={importarConIA}
        renderResumen={resumenArbolCompleto}
      />

      {distribuirProy && (
        <DistribuirProyectoModal
          abierto
          proyecto={distribuirProy}
          onCerrar={() => setDistribuirProy(null)}
        />
      )}

      {generarFasesEnt && (
        <GenerarFasesModal
          abierto
          onCerrar={() => setGenerarFasesEnt(null)}
          entregableId={generarFasesEnt.id}
          tituloEntregable={generarFasesEnt.titulo}
          unidad={generarFasesEnt.unidad ?? "unidades"}
          diaInicioSugerido={generarFasesEnt.diaInicio}
          diaLimiteSugerido={generarFasesEnt.diaLimite}
          cantidadSugerida={generarFasesEnt.cantidadObjetivo ?? 100}
          onGenerado={() => setGenerarFasesEnt(null)}
        />
      )}

      {repartirDiasEnt && (
        <RepartirEnDiasModal
          abierto
          entregable={repartirDiasEnt}
          onCerrar={() => setRepartirDiasEnt(null)}
        />
      )}
    </Dialog>
  );
};
