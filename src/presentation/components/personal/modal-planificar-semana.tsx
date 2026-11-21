"use client";

import React, { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { Badge } from "../badge";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import {
  lunesDeLaSemana,
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";
import { auditarProgresionSemanal } from "../../../domain/servicios/auditoria-progresion.service";
import { expandirReparto } from "../../../domain/entidades/distribucion-personal.entity";
import { registrarHistorialPersonal } from "../../../application/servicios/registrar-historial-personal.service";
import { QueueService } from "../../../offline/services/queue.service";
import { generarPromptEtapa4Actividades } from "../../../domain/prompts/generar-prompt-jerarquia-personal";
import type { Actividad } from "../../../domain/entidades/actividad.entity";
import type { Entregable } from "../../../domain/entidades/entregable.entity";

export interface ModalPlanificarSemanaProps {
  abierto: boolean;
  onCerrar: () => void;
  areaIdInicial?: string;
}

const DIAS_OPCIONES = [
  { id: 1, label: "Lun" },
  { id: 2, label: "Mar" },
  { id: 3, label: "Mié" },
  { id: 4, label: "Jue" },
  { id: 5, label: "Vie" },
  { id: 6, label: "Sáb" },
  { id: 0, label: "Dom" },
];

export const ModalPlanificarSemana: React.FC<ModalPlanificarSemanaProps> = ({
  abierto,
  onCerrar,
  areaIdInicial,
}) => {
  const { mostrarToast } = useToast();
  const hoy = obtenerDiaTareaHoy();
  const lunesActual = lunesDeLaSemana(hoy);
  const lunesProximo = sumarDias(lunesActual, 7);
  const domingoProximo = sumarDias(lunesProximo, 6);

  const [areaId, setAreaId] = useState<string>(areaIdInicial ?? "");
  const [entregableId, setEntregableId] = useState<string>("");
  const [nuevoEntregableTitulo, setNuevoEntregableTitulo] =
    useState<string>("");
  const [descripcionTarea, setDescripcionTarea] = useState("");
  const [tipoTarea, setTipoTarea] = useState<"enfoque" | "mantenimiento">(
    "mantenimiento"
  );
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([
    1, 2, 3, 4, 5,
  ]);
  const [cantidadTotal, setCantidadTotal] = useState<string>("40");
  const [unidad, setUnidad] = useState("contactos");
  const [procedimientoId, setProcedimientoId] = useState<string>("");
  const [guardando, setGuardando] = useState(false);

  // Consultas reactivas en Dexie
  const areas = useLiveQuery(() => db.area_personal.toArray()) ?? [];
  const objetivos =
    useLiveQuery(() => db.objetivo_cuantificable.toArray()) ?? [];
  const proyectos = useLiveQuery(() => db.proyecto_personal.toArray()) ?? [];
  const entregables = useLiveQuery(() => db.entregable.toArray()) ?? [];
  const actividades = useLiveQuery(() => db.actividad.toArray()) ?? [];
  const procedimientos = useLiveQuery(() => db.procedimiento.toArray()) ?? [];

  // Diagnóstico del 80%
  const progresion = useMemo(() => {
    return auditarProgresionSemanal({
      actividades,
      fechaHoy: hoy,
    });
  }, [actividades, hoy]);

  // Filtrar entregables según área elegida
  const entregablesFiltrados = useMemo(() => {
    if (!areaId) return entregables;
    const objsDelArea = objetivos.filter((o) => o.areaId === areaId);
    const objsIds = new Set(objsDelArea.map((o) => o.id));
    const proysDelArea = proyectos.filter((p) => objsIds.has(p.objetivoId));
    const proysIds = new Set(proysDelArea.map((p) => p.id));
    return entregables.filter((e) => proysIds.has(e.proyectoId));
  }, [areaId, objetivos, proyectos, entregables]);

  const alternarDia = (dia: number) => {
    setDiasSeleccionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia].sort()
    );
  };

  const cantNumero = Number(cantidadTotal) || 0;
  const diasCount = diasSeleccionados.length || 1;
  const cuotaDiaria =
    cantNumero > 0 ? (cantNumero / diasCount).toFixed(1) : "0";

  // Generar actividades con reparto en Dexie
  const generarSemana = async () => {
    if (!descripcionTarea.trim()) {
      mostrarToast("Ingresá la descripción de la tarea.", "error");
      return;
    }
    if (diasSeleccionados.length === 0) {
      mostrarToast("Seleccioná al menos un día de la semana.", "error");
      return;
    }

    setGuardando(true);
    try {
      let entIdFinal = entregableId;

      // Si no seleccionó entregable pero escribió uno nuevo o busca uno por defecto
      if (!entIdFinal) {
        if (!nuevoEntregableTitulo.trim()) {
          // Buscar primer entregable activo o requerir selección
          if (entregablesFiltrados.length > 0) {
            entIdFinal = entregablesFiltrados[0].id;
          } else {
            mostrarToast(
              "Seleccioná un entregable o ingresá el título para crear uno nuevo.",
              "error"
            );
            setGuardando(false);
            return;
          }
        } else {
          // Crear entregable rápido de la semana
          const primerProy = proyectos[0];
          const nuevoId = `ent_${Date.now()}`;
          const nuevoEntregable: Entregable = {
            id: nuevoId,
            proyectoId: primerProy?.id ?? "proy_general",
            objetivoId: primerProy?.objetivoId ?? "obj_general",
            titulo: nuevoEntregableTitulo.trim(),
            diaInicio: lunesProximo,
            diaLimite: domingoProximo,
            cantidadObjetivo: cantNumero > 0 ? cantNumero : undefined,
            unidad: unidad || undefined,
            progresoActual: 0,
            bandaAceptable: 70,
            estado: "activo",
            tieneHijos: false,
            creadoEn: Date.now(),
            actualizadoEn: Date.now(),
          };
          await db.entregable.add(nuevoEntregable);
          await QueueService.encolar("entregable", "crear", nuevoId, {
            ...nuevoEntregable,
          });
          entIdFinal = nuevoId;
        }
      }

      // Expandir reparto de los 7 días
      const expandido = expandirReparto(
        {
          descripcion: descripcionTarea.trim(),
          tipo: tipoTarea,
          diasSemana: diasSeleccionados,
          diaInicio: lunesProximo,
          diaLimite: domingoProximo,
          cantidadTotal: cantNumero > 0 ? cantNumero : undefined,
          unidad: unidad || undefined,
          bandaAceptable: 70,
        },
        {
          diaInicio: lunesProximo,
          diaLimite: domingoProximo,
          total: cantNumero,
          unidad,
          bandaAceptable: 70,
        }
      );

      // Crear actividades en Dexie
      for (const item of expandido.porDia) {
        const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const nuevaActividad: Actividad = {
          id: actId,
          entregableId: entIdFinal,
          descripcion: expandido.descripcion,
          tipo: expandido.tipo,
          diaTarea: item.dia,
          cantidadObjetivo: item.cantidad,
          cantidadMinima: item.minimo,
          unidad: expandido.unidad,
          progresoActual: 0,
          procedimientoId: procedimientoId || undefined,
          estado: "pendiente",
          creadoEn: Date.now(),
          actualizadoEn: Date.now(),
        };

        await db.actividad.add(nuevaActividad);
        await QueueService.encolar("actividad", "crear", actId, {
          ...nuevaActividad,
        });
        await registrarHistorialPersonal({
          entidadTipo: "actividad",
          entidadId: actId,
          accion: "crear",
          descripcion: `Actividad generada por reparto semanal: "${expandido.descripcion}" (${item.dia})`,
          campoNuevo: { ...nuevaActividad },
        });
      }

      mostrarToast(
        `¡Semana planificada! Se agendaron ${expandido.porDia.length} actividades para los próximos 7 días.`,
        "exito"
      );
      onCerrar();
    } catch (err) {
      console.error(err);
      mostrarToast("Error al generar las actividades.", "error");
    } finally {
      setGuardando(false);
    }
  };

  const copiarPromptIA = () => {
    const entregableObj = entregables.find((e) => e.id === entregableId);
    const tituloEnt =
      entregableObj?.titulo ??
      nuevoEntregableTitulo ??
      "Entregable de la Próxima Semana";
    const prompt = generarPromptEtapa4Actividades(
      tituloEnt,
      `Período: ${lunesProximo} al ${domingoProximo} (Próximos 7 días)`
    );

    void navigator.clipboard.writeText(prompt);
    mostrarToast(
      "Prompt copiado con Estándares del Búnker. Pegalo en tu IA.",
      "exito"
    );
  };

  return (
    <Dialog
      abierto={abierto}
      onClose={onCerrar}
      titulo="Planificar Próxima Semana (Tope estricto de 7 Días)"
      maxWidth="2xl"
    >
      <div className="flex flex-col gap-4 text-xs text-zinc-300">
        {/* Banner de Diagnóstico del 80% */}
        <div
          className={`flex flex-col gap-1.5 rounded-xl border p-3 ${
            progresion.puedeProgresar
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : progresion.debeEstabilizar
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-sky-500/40 bg-sky-500/10 text-sky-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold">
              <Icono.TrendingUp className="h-4 w-4" />
              {progresion.titulo} ({progresion.cumplimientoSemanaActual}%
              cumplimiento)
            </span>
            <Badge
              color={
                progresion.puedeProgresar
                  ? "emerald"
                  : progresion.debeEstabilizar
                    ? "amber"
                    : "sky"
              }
            >
              {progresion.semanasConsecutivas80}/4 semanas ≥ 80%
            </Badge>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-300">
            {progresion.recomendacion}
          </p>
        </div>

        {/* Selección de Área y Entregable */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-zinc-400">Área de Vida:</label>
            <select
              value={areaId}
              onChange={(e) => {
                setAreaId(e.target.value);
                setEntregableId("");
              }}
              className="rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
            >
              <option value="">Todas las áreas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-zinc-400">
              Entregable de la Semana:
            </label>
            <select
              value={entregableId}
              onChange={(e) => setEntregableId(e.target.value)}
              className="rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
            >
              <option value="">Seleccionar entregable existente...</option>
              {entregablesFiltrados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.titulo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!entregableId && (
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-zinc-400">
              O crear nuevo entregable para esta semana:
            </label>
            <input
              type="text"
              placeholder="Ej. Semana 1: Prospección activa outbound"
              value={nuevoEntregableTitulo}
              onChange={(e) => setNuevoEntregableTitulo(e.target.value)}
              className="rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
            />
          </div>
        )}

        {/* Tarea y Reparto */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#2A2A2E] bg-[#0E0E10] p-3">
          <span className="font-bold text-zinc-200">
            Configuración de Tareas Diarias (Próximos 7 Días)
          </span>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-[11px] font-semibold text-zinc-400">
                Descripción de la Actividad:
              </label>
              <input
                type="text"
                placeholder="Ej. Contactar prospectos en frío en LinkedIn"
                value={descripcionTarea}
                onChange={(e) => setDescripcionTarea(e.target.value)}
                className="rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-zinc-400">
                Tipo de Carga:
              </label>
              <select
                value={tipoTarea}
                onChange={(e) =>
                  setTipoTarea(e.target.value as "enfoque" | "mantenimiento")
                }
                className="rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
              >
                <option value="mantenimiento">
                  Mantenimiento (hasta 3/día)
                </option>
                <option value="enfoque">Enfoque Primario (máx 1/día)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-zinc-400">
                Cantidad Total Semana:
              </label>
              <input
                type="number"
                min={1}
                value={cantidadTotal}
                onChange={(e) => setCantidadTotal(e.target.value)}
                className="rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-zinc-400">
                Unidad:
              </label>
              <input
                type="text"
                placeholder="contactos, min, videos..."
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                className="rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-zinc-400">
                SOP Vinculado (Opcional):
              </label>
              <select
                value={procedimientoId}
                onChange={(e) => setProcedimientoId(e.target.value)}
                className="rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
              >
                <option value="">Sin protocolo SOP</option>
                {procedimientos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.titulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selector de Días de la Semana */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-zinc-400">
              Días de ejecución en la próxima semana ({lunesProximo} al{" "}
              {domingoProximo}):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DIAS_OPCIONES.map((d) => {
                const activo = diasSeleccionados.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => alternarDia(d.id)}
                    className={`rounded-lg border px-3 py-1 text-xs font-bold transition-all ${
                      activo
                        ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                        : "border-[#2A2A2E] bg-[#18181B] text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cuota resultante */}
          <div className="flex items-center justify-between rounded-lg bg-zinc-900/60 p-2 text-xs">
            <span className="text-zinc-400">
              Distribución: {diasCount} días seleccionados
            </span>
            <span className="font-mono font-bold text-emerald-400">
              ~{cuotaDiaria} {unidad}/día (Cuota entera:{" "}
              {Math.round(cantNumero / diasCount)})
            </span>
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
            Copiar Prompt con Estándares
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button
              size="sm"
              cargando={guardando}
              onClick={() => void generarSemana()}
              className="bg-emerald-500 font-bold text-zinc-950 hover:bg-emerald-600"
            >
              Generar Semana (7 Días)
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
