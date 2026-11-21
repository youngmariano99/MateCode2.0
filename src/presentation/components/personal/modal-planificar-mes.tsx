"use client";

import React, { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { Badge } from "../badge";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";
import { rangoDelMes } from "../../../domain/entidades/diagnostico-planificacion.entity";
import { registrarHistorialPersonal } from "../../../application/servicios/registrar-historial-personal.service";
import { QueueService } from "../../../offline/services/queue.service";
import { generarPromptEtapa2Proyectos } from "../../../domain/prompts/generar-prompt-jerarquia-personal";
import type { ProyectoPersonal } from "../../../domain/entidades/proyecto-personal.entity";

export interface ModalPlanificarMesProps {
  abierto: boolean;
  onCerrar: () => void;
}

export const ModalPlanificarMes: React.FC<ModalPlanificarMesProps> = ({
  abierto,
  onCerrar,
}) => {
  const { mostrarToast } = useToast();
  const hoy = obtenerDiaTareaHoy();

  // Calcular mes actual y próximo mes
  const { inicioMes: inicioMesActual, finMes: finMesActual } = rangoDelMes(hoy);
  const [aHoy, mHoy] = hoy.split("-").map(Number);
  const anioProximo = mHoy === 12 ? aHoy + 1 : aHoy;
  const mesProximo = mHoy === 12 ? 1 : mHoy + 1;
  const diaProximoMesEjemplo = `${anioProximo}-${String(mesProximo).padStart(2, "0")}-01`;
  const { inicioMes: inicioMesProximo, finMes: finMesProximo } =
    rangoDelMes(diaProximoMesEjemplo);

  const [mesSeleccionado, setMesSeleccionado] = useState<"actual" | "proximo">(
    "proximo"
  );
  const [areaId, setAreaId] = useState<string>("");
  const [objetivoId, setObjetivoId] = useState<string>("");
  const [tituloProyecto, setTituloProyecto] = useState<string>("");
  const [guardando, setGuardando] = useState(false);

  // Consultas reactivas en Dexie
  const areas = useLiveQuery(() => db.area_personal.toArray()) ?? [];
  const objetivos =
    useLiveQuery(() => db.objetivo_cuantificable.toArray()) ?? [];
  const proyectos = useLiveQuery(() => db.proyecto_personal.toArray()) ?? [];

  // Objetivos del área elegida
  const objetivosFiltrados = useMemo(() => {
    if (!areaId) return objetivos.filter((o) => o.estado === "activo");
    return objetivos.filter(
      (o) => o.areaId === areaId && o.estado === "activo"
    );
  }, [areaId, objetivos]);

  // Proyectos del mes actual
  const proyectosMesActual = useMemo(() => {
    return proyectos.filter(
      (p) =>
        p.estado === "activo" &&
        p.diaInicio <= finMesActual &&
        p.diaLimite >= inicioMesActual
    );
  }, [proyectos, inicioMesActual, finMesActual]);

  const rangoElegido =
    mesSeleccionado === "actual"
      ? { inicio: inicioMesActual, fin: finMesActual, label: "Mes en Curso" }
      : { inicio: inicioMesProximo, fin: finMesProximo, label: "Próximo Mes" };

  const crearProyectoMes = async () => {
    if (!tituloProyecto.trim()) {
      mostrarToast("Ingresá el título del proyecto de construcción.", "error");
      return;
    }
    if (!objetivoId) {
      mostrarToast(
        "Seleccioná el objetivo SMART padre al que responde.",
        "error"
      );
      return;
    }

    setGuardando(true);
    try {
      const nuevoId = `proy_${Date.now()}`;
      const nuevoProyecto: ProyectoPersonal = {
        id: nuevoId,
        objetivoId,
        titulo: tituloProyecto.trim(),
        diaInicio: rangoElegido.inicio,
        diaLimite: rangoElegido.fin,
        progresoActual: 0,
        bandaAceptable: 70, // Estándar obligatorio del 70%
        estado: "activo",
        tieneHijos: false,
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
      };

      await db.proyecto_personal.add(nuevoProyecto);
      await QueueService.encolar("proyecto_personal", "crear", nuevoId, {
        ...nuevoProyecto,
      });
      await registrarHistorialPersonal({
        entidadTipo: "proyecto",
        entidadId: nuevoId,
        accion: "crear",
        descripcion: `Proyecto mensual de construcción creado: "${nuevoProyecto.titulo}" (${rangoElegido.inicio} al ${rangoElegido.fin})`,
        campoNuevo: { ...nuevoProyecto },
      });

      mostrarToast(
        `¡Proyecto creado exitosamente! Límite mensual fijado hasta ${rangoElegido.fin} con banda del 70%.`,
        "exito"
      );
      setTituloProyecto("");
      onCerrar();
    } catch (err) {
      console.error(err);
      mostrarToast("Error al crear el proyecto.", "error");
    } finally {
      setGuardando(false);
    }
  };

  const copiarPromptIA = () => {
    const obj = objetivos.find((o) => o.id === objetivoId);
    const tituloObj = obj?.titulo ?? "Objetivo Estratégico";
    const prompt = generarPromptEtapa2Proyectos(
      tituloObj,
      `Horizonte: ${rangoElegido.inicio} al ${rangoElegido.fin} (${rangoElegido.label})`
    );

    void navigator.clipboard.writeText(prompt);
    mostrarToast(
      "Prompt mensual copiado con Estándares del Búnker. Pegalo en tu IA.",
      "exito"
    );
  };

  return (
    <Dialog
      abierto={abierto}
      onClose={onCerrar}
      titulo="Planificar Sprint Mensual (Tope de 30 Días — WIP Limit = 1)"
      maxWidth="2xl"
    >
      <div className="flex flex-col gap-4 text-xs text-zinc-300">
        {/* Auditoría del mes actual */}
        <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0E0E10] p-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-zinc-200">
              Estado del Mes Actual ({inicioMesActual} al {finMesActual})
            </span>
            <Badge
              color={proyectosMesActual.length === 1 ? "emerald" : "amber"}
            >
              {proyectosMesActual.length === 1
                ? "1 Proyecto Activo"
                : `${proyectosMesActual.length} Proyectos`}
            </Badge>
          </div>

          {proyectosMesActual.length === 0 ? (
            <p className="text-[11px] text-amber-400">
              ⚠️ No tenés ningún proyecto de construcción asignado a este mes en
              curso.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {proyectosMesActual.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded bg-zinc-900/60 px-2.5 py-1 text-xs"
                >
                  <span className="font-semibold text-zinc-300">
                    {p.titulo}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">
                    Vence: {p.diaLimite}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selector de Período */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-400">
            Período a planificar:
          </span>
          <div className="flex rounded-lg border border-[#2A2A2E] bg-[#18181B] p-0.5">
            <button
              type="button"
              onClick={() => setMesSeleccionado("actual")}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                mesSeleccionado === "actual"
                  ? "bg-amber-500 font-bold text-zinc-950"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Mes en Curso ({inicioMesActual} → {finMesActual})
            </button>
            <button
              type="button"
              onClick={() => setMesSeleccionado("proximo")}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                mesSeleccionado === "proximo"
                  ? "bg-emerald-500 font-bold text-zinc-950"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Próximo Mes ({inicioMesProximo} → {finMesProximo})
            </button>
          </div>
        </div>

        {/* Definición del Proyecto Único */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#2A2A2E] bg-[#141417] p-3.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-zinc-200">
              Proyecto Único de Construcción (Regla WIP Limit = 1)
            </span>
            <span className="text-[10px] text-zinc-500">
              Buffer x1.5 · Banda 70%
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-zinc-400">
                Área de Vida:
              </label>
              <select
                value={areaId}
                onChange={(e) => {
                  setAreaId(e.target.value);
                  setObjetivoId("");
                }}
                className="rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-amber-500/50"
              >
                <option value="">Seleccionar área...</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-zinc-400">
                Objetivo SMART Padre:
              </label>
              <select
                value={objetivoId}
                onChange={(e) => setObjetivoId(e.target.value)}
                className="rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-amber-500/50"
              >
                <option value="">Seleccionar objetivo padre...</option>
                {objetivosFiltrados.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.titulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-zinc-400">
              Título del Proyecto Mensual de Construcción:
            </label>
            <input
              type="text"
              placeholder="Ej. Caso 1: May Delicias — Landing Page y Captura Inicial"
              value={tituloProyecto}
              onChange={(e) => setTituloProyecto(e.target.value)}
              className="rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="flex flex-col gap-1 rounded bg-zinc-900/50 p-2 text-[11px] leading-relaxed text-zinc-400">
            <span>
              ℹ️{" "}
              <strong>Estándares del Búnker aplicados automáticamente:</strong>
            </span>
            <ul className="list-disc space-y-0.5 pl-4 text-zinc-400">
              <li>
                Tope temporal acotado: {rangoElegido.inicio} al{" "}
                {rangoElegido.fin} (30 días).
              </li>
              <li>
                Buffer del 50% (x1.5) en los tiempos para absorber imprevistos.
              </li>
              <li>Umbral de éxito: banda aceptable al 70%.</li>
            </ul>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2A2A2E] pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={copiarPromptIA}
            className="text-xs text-zinc-300"
          >
            <Icono.Copy className="mr-1 h-3.5 w-3.5" />
            Copiar Prompt Mensual con Estándares
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button
              size="sm"
              cargando={guardando}
              onClick={() => void crearProyectoMes()}
              className="bg-amber-500 font-bold text-zinc-950 hover:bg-amber-600"
            >
              Fijar Proyecto del Mes (30 Días)
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
