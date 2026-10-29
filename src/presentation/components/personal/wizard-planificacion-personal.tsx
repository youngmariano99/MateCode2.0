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
import {
  resumenArbolCompleto,
  resumenProyectoBajoObjetivo,
  resumenEntregableBajoProyecto,
  resumenActividadesBajoEntregable,
} from "./resumen-import-jerarquia";
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
import { EliminarNodoPersonalUseCase } from "../../../application/use-cases/personal/eliminar-nodo-personal.use-case";
import {
  generarPromptArbolCompleto,
  generarPromptEtapa1Objetivos,
  generarPromptEtapa2Proyectos,
  generarPromptEtapa2ProyectosPorArea,
  generarPromptEtapa3EntregablesYSOPs,
  generarPromptEtapa3EntregablesPorArea,
  generarPromptEtapa4Actividades,
  formatearMapaAreasYObjetivos,
  generarPromptAuditoriaArea,
} from "../../../domain/prompts/generar-prompt-jerarquia-personal";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";
import type { ProyectoPersonal } from "../../../domain/entidades/proyecto-personal.entity";
import type { Entregable } from "../../../domain/entidades/entregable.entity";
import type { Actividad } from "../../../domain/entidades/actividad.entity";

const areasUseCase = new GestionarAreasUseCase();
const objetivosUseCase = new GestionarObjetivosUseCase();
const proyectosUseCase = new GestionarProyectosPersonalUseCase();
const entregablesUseCase = new GestionarEntregablesUseCase();
const importarUseCase = new ImportarArbolPersonalUseCase();
const eliminarNodoUseCase = new EliminarNodoPersonalUseCase();

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

interface EstadoModalImportar {
  titulo: string;
  plantillaEjemplo: string;
  onImportar: (items: unknown[]) => Promise<void>;
  renderResumen?: (items: unknown[]) => React.ReactNode;
}

interface ConfirmarResetModalState {
  tipo: "proyecto" | "area";
  titulo: string;
  subtitulo: string;
  entregablesCount: number;
  actividadesCount: number;
  fasesCount: number;
  entregableIds: string[];
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

  // Modales auxiliares y de importación IA por etapa
  const [modalImportar, setModalImportar] =
    useState<EstadoModalImportar | null>(null);
  const [distribuirProy, setDistribuirProy] = useState<ProyectoPersonal | null>(
    null
  );
  const [generarFasesEnt, setGenerarFasesEnt] = useState<Entregable | null>(
    null
  );
  const [repartirDiasEnt, setRepartirDiasEnt] = useState<Entregable | null>(
    null
  );

  // Selección granular de proyectos a desglosar en Etapa 3
  const [proyectosSeleccionadosIds, setProyectosSeleccionadosIds] = useState<
    string[]
  >([]);

  // Modal de confirmación para reseteo minucioso de entregables en Etapa 3
  const [confirmarReset, setConfirmarReset] =
    useState<ConfirmarResetModalState | null>(null);
  const [reseteando, setReseteando] = useState(false);

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
  const actividades: Actividad[] =
    useLiveQuery(() => db.actividad.toArray()) ?? [];

  const objetivosDelArea = areaId
    ? objetivos.filter((o) => o.areaId === areaId)
    : objetivos;
  const objetivoActual =
    objetivos.find((o) => o.id === objetivoId) ??
    (objetivosDelArea.length > 0 ? objetivosDelArea[0] : objetivos[0]);
  const areaActual =
    areas.find((a) => a.id === objetivoActual?.areaId) ??
    areas.find((a) => a.id === areaId);
  const proyectosDelObjetivo = objetivoActual
    ? proyectos.filter((p) => p.objetivoId === objetivoActual.id)
    : [];
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
    const objId = objetivoActual?.id ?? objetivoId;
    if (!objId) return;
    const res = await proyectosUseCase.crearProyecto({
      objetivoId: objId,
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

  // ==========================================================================
  // Copia de prompts por etapa para la IA
  // ==========================================================================
  const copiarPromptEtapa1 = () => {
    const resumenObjetivos =
      objetivos.length > 0
        ? objetivos
            .map(
              (o) =>
                `- ${o.titulo} (${o.progresoActual}/${o.cantidadObjetivo} ${o.unidad})`
            )
            .join("\n")
        : "Sin objetivos previos.";
    const prompt = generarPromptEtapa1Objetivos(
      resumenObjetivos,
      areas.map((a) => a.nombre)
    );
    navigator.clipboard.writeText(prompt);
    mostrarToast(
      "Prompt Etapa 1 (Objetivos) copiado al portapapeles.",
      "exito"
    );
  };

  const copiarPromptEtapa2 = (objTarget?: typeof objetivoActual) => {
    const obj = objTarget ?? objetivoActual;
    if (!obj) {
      mostrarToast("Seleccioná un objetivo primero.", "error");
      return;
    }
    const areaDelObj = areas.find((a) => a.id === obj.areaId);
    const nombreArea = areaDelObj?.nombre ?? areaActual?.nombre ?? "General";
    const detallesObj = `Meta: ${obj.cantidadObjetivo} ${obj.unidad}, vence ${obj.diaLimite}, área: ${nombreArea}`;
    const mapaGlobal = formatearMapaAreasYObjetivos(areas, objetivos);
    const proysExistentes = proyectos
      .filter((p) => p.objetivoId === obj.id)
      .map((p) => p.titulo);

    const prompt = generarPromptEtapa2Proyectos(
      obj.titulo,
      detallesObj,
      proysExistentes,
      mapaGlobal
    );
    navigator.clipboard.writeText(prompt);
    mostrarToast(`Prompt Etapa 2 para "${obj.titulo}" copiado.`, "exito");
  };

  const copiarPromptEtapa2Area = (targetAreaId?: string) => {
    const id = targetAreaId || areaActual?.id || areaId;
    const areaTarget = areas.find((a) => a.id === id);
    if (!areaTarget) {
      mostrarToast("Seleccioná un área primero.", "error");
      return;
    }

    const objsDeEstaArea = objetivos.filter((o) => o.areaId === areaTarget.id);
    if (objsDeEstaArea.length === 0) {
      mostrarToast(
        `No hay objetivos definidos en el área "${areaTarget.nombre}".`,
        "error"
      );
      return;
    }

    // Separar los que ya tienen proyectos creados vs los pendientes
    const pendientes = objsDeEstaArea.filter(
      (o) => !proyectos.some((p) => p.objetivoId === o.id)
    );
    const conProyectos = objsDeEstaArea
      .filter((o) => proyectos.some((p) => p.objetivoId === o.id))
      .map((o) => ({
        titulo: o.titulo,
        proyectos: proyectos
          .filter((p) => p.objetivoId === o.id)
          .map((p) => p.titulo),
      }));

    const otrasAreas = areas.filter((a) => a.id !== areaTarget.id);
    const otrosObjetivos = objetivos.filter((o) => o.areaId !== areaTarget.id);
    const mapaOtrasAreas = formatearMapaAreasYObjetivos(
      otrasAreas,
      otrosObjetivos
    );

    const prompt = generarPromptEtapa2ProyectosPorArea(
      areaTarget.nombre,
      pendientes.length > 0 ? pendientes : objsDeEstaArea,
      conProyectos,
      mapaOtrasAreas
    );

    navigator.clipboard.writeText(prompt);
    if (pendientes.length === 0) {
      mostrarToast(
        `Prompt de "${areaTarget.nombre}" copiado (replanificación de todos sus objetivos).`,
        "exito"
      );
    } else {
      mostrarToast(
        `Prompt Etapa 2 copiado para "${areaTarget.nombre}" (${pendientes.length} pendientes, ${conProyectos.length} omitidos).`,
        "exito"
      );
    }
  };

  const copiarPromptEtapa3 = (proyTarget?: typeof proyectoActual) => {
    const proy = proyTarget ?? proyectoActual;
    if (!proy) {
      mostrarToast("Seleccioná un proyecto primero.", "error");
      return;
    }
    const entregablesDelProy = entregables.filter(
      (e) => e.proyectoId === proy.id
    );
    const objPadre = objetivos.find((o) => o.id === proy.objetivoId);
    const detallesProy = `Vence: ${proy.diaLimite}${
      proy.cantidadObjetivo
        ? `, meta: ${proy.cantidadObjetivo} ${proy.unidad}`
        : ""
    }${objPadre ? `, objetivo: "${objPadre.titulo}"` : ""}`;

    const prompt = generarPromptEtapa3EntregablesYSOPs(
      proy.titulo,
      detallesProy,
      entregablesDelProy.map((e) => e.titulo)
    );
    navigator.clipboard.writeText(prompt);
    mostrarToast(
      `Prompt Etapa 3 para "${proy.titulo}" copiado al portapapeles.`,
      "exito"
    );
  };

  const copiarPromptEtapa3Area = (targetAreaId?: string) => {
    const id = targetAreaId || areaActual?.id || areaId;
    const areaTarget = areas.find((a) => a.id === id);
    if (!areaTarget) {
      mostrarToast("Seleccioná un área primero.", "error");
      return;
    }

    const objsDeEstaArea = objetivos.filter((o) => o.areaId === areaTarget.id);
    const proysDeEstaArea = proyectos.filter((p) =>
      objsDeEstaArea.some((o) => o.id === p.objetivoId)
    );

    if (proysDeEstaArea.length === 0) {
      mostrarToast(
        `No hay proyectos cargados en el área "${areaTarget.nombre}". Creá o importá proyectos en el Paso 2 primero.`,
        "error"
      );
      return;
    }

    const conEntregables = proysDeEstaArea
      .filter((p) => entregables.some((e) => e.proyectoId === p.id))
      .map((p) => ({
        titulo: p.titulo,
        entregables: entregables
          .filter((e) => e.proyectoId === p.id)
          .map((e) => e.titulo),
      }));

    const sinEntregables = proysDeEstaArea.filter(
      (p) => !entregables.some((e) => e.proyectoId === p.id)
    );

    let seleccionadosParaPrompt: ProyectoPersonal[] = [];
    let pospuestosParaPrompt: ProyectoPersonal[] = [];

    if (proyectosSeleccionadosIds.length > 0) {
      seleccionadosParaPrompt = proysDeEstaArea.filter(
        (p) =>
          proyectosSeleccionadosIds.includes(p.id) &&
          !entregables.some((e) => e.proyectoId === p.id)
      );
      pospuestosParaPrompt = proysDeEstaArea.filter(
        (p) =>
          !proyectosSeleccionadosIds.includes(p.id) &&
          !entregables.some((e) => e.proyectoId === p.id)
      );
    } else {
      seleccionadosParaPrompt = sinEntregables;
      pospuestosParaPrompt = [];
    }

    if (sinEntregables.length === 0) {
      seleccionadosParaPrompt = proysDeEstaArea;
      pospuestosParaPrompt = [];
    }

    const pendientesFormateados = seleccionadosParaPrompt.map((p) => ({
      titulo: p.titulo,
      objetivoTitulo: objsDeEstaArea.find((o) => o.id === p.objetivoId)?.titulo,
      diaLimite: p.diaLimite,
      cantidadObjetivo: p.cantidadObjetivo,
      unidad: p.unidad,
    }));

    const pospuestosFormateados = pospuestosParaPrompt.map((p) => ({
      titulo: p.titulo,
      objetivoTitulo: objsDeEstaArea.find((o) => o.id === p.objetivoId)?.titulo,
    }));

    const otrasAreas = areas.filter((a) => a.id !== areaTarget.id);
    const otrosObjetivos = objetivos.filter((o) => o.areaId !== areaTarget.id);
    const mapaOtrasAreas = formatearMapaAreasYObjetivos(
      otrasAreas,
      otrosObjetivos
    );

    const prompt = generarPromptEtapa3EntregablesPorArea(
      areaTarget.nombre,
      pendientesFormateados,
      conEntregables,
      mapaOtrasAreas,
      pospuestosFormateados
    );

    navigator.clipboard.writeText(prompt);
    if (sinEntregables.length === 0) {
      mostrarToast(
        `Prompt de "${areaTarget.nombre}" copiado (replanificación de todos sus proyectos).`,
        "exito"
      );
    } else {
      mostrarToast(
        `Prompt Etapa 3 copiado para "${areaTarget.nombre}" (${seleccionadosParaPrompt.length} seleccionados, ${pospuestosParaPrompt.length} pospuestos, ${conEntregables.length} omitidos).`,
        "exito"
      );
    }
  };

  const copiarPromptAuditoriaArea = (targetAreaId?: string) => {
    const id = targetAreaId || areaActual?.id || areaId;
    const areaTarget = areas.find((a) => a.id === id);
    if (!areaTarget) {
      mostrarToast("Seleccioná un área primero.", "error");
      return;
    }

    const objsArea = objetivos.filter((o) => o.areaId === areaTarget.id);
    const proysArea = proyectos.filter((p) =>
      objsArea.some((o) => o.id === p.objetivoId)
    );
    const entsArea = entregables.filter((e) =>
      proysArea.some((p) => p.id === e.proyectoId)
    );

    const prompt = generarPromptAuditoriaArea(
      areaTarget.nombre,
      objsArea,
      proysArea,
      entsArea,
      actividades
    );

    navigator.clipboard.writeText(prompt);
    mostrarToast(
      `Prompt de Auditoría para "${areaTarget.nombre}" copiado al portapapeles. Pegalo en tu IA para revisar la planificación.`,
      "exito"
    );
  };

  const prepararResetProyecto = (proy: ProyectoPersonal) => {
    const ents = entregables.filter((e) => e.proyectoId === proy.id);
    const entIds = ents.map((e) => e.id);
    const acts = actividades.filter(
      (a) => a.entregableId && entIds.includes(a.entregableId)
    );
    const fasesVinculadas = fases.filter(
      (f) => f.entregableId && entIds.includes(f.entregableId)
    );

    if (ents.length === 0) {
      mostrarToast("Este proyecto no tiene entregables para resetear.", "info");
      return;
    }

    setConfirmarReset({
      tipo: "proyecto",
      titulo: `Resetear entregables de "${proy.titulo}"`,
      subtitulo: `Vas a limpiar todos los entregables definidos en el proyecto "${proy.titulo}". El proyecto en sí y sus objetivos NO se verán afectados.`,
      entregablesCount: ents.length,
      actividadesCount: acts.length,
      fasesCount: fasesVinculadas.length,
      entregableIds: entIds,
    });
  };

  const prepararResetArea = (targetAreaId?: string) => {
    const id = targetAreaId || areaActual?.id || areaId;
    const areaTarget = areas.find((a) => a.id === id);
    if (!areaTarget) return;

    const objsArea = objetivos.filter((o) => o.areaId === areaTarget.id);
    const proysArea = proyectos.filter((p) =>
      objsArea.some((o) => o.id === p.objetivoId)
    );
    const entsArea = entregables.filter((e) =>
      proysArea.some((p) => p.id === e.proyectoId)
    );
    const entIds = entsArea.map((e) => e.id);
    const acts = actividades.filter(
      (a) => a.entregableId && entIds.includes(a.entregableId)
    );
    const fasesVinculadas = fases.filter(
      (f) => f.entregableId && entIds.includes(f.entregableId)
    );

    if (entsArea.length === 0) {
      mostrarToast(
        `El área "${areaTarget.nombre}" no tiene entregables para resetear.`,
        "info"
      );
      return;
    }

    setConfirmarReset({
      tipo: "area",
      titulo: `Resetear entregables del Área "${areaTarget.nombre}"`,
      subtitulo: `Vas a eliminar todos los entregables de los ${proysArea.length} proyectos del área "${areaTarget.nombre}". Las Áreas, Objetivos y Proyectos se mantendrán intactos.`,
      entregablesCount: entsArea.length,
      actividadesCount: acts.length,
      fasesCount: fasesVinculadas.length,
      entregableIds: entIds,
    });
  };

  const ejecutarReset = async () => {
    if (!confirmarReset || confirmarReset.entregableIds.length === 0) return;
    setReseteando(true);
    try {
      for (const entId of confirmarReset.entregableIds) {
        await eliminarNodoUseCase.ejecutar("entregable", entId);
      }
      mostrarToast(
        `Se eliminaron ${confirmarReset.entregablesCount} entregables correctamente.`,
        "exito"
      );
      setConfirmarReset(null);
    } catch (err) {
      mostrarToast(
        err instanceof Error ? err.message : "Error al resetear entregables.",
        "error"
      );
    } finally {
      setReseteando(false);
    }
  };

  const toggleProyectoSeleccionado = (proyId: string) => {
    setProyectosSeleccionadosIds((prev) =>
      prev.includes(proyId)
        ? prev.filter((id) => id !== proyId)
        : [...prev, proyId]
    );
  };

  const seleccionarTodosPendientes = (proysPendientes: ProyectoPersonal[]) => {
    setProyectosSeleccionadosIds(proysPendientes.map((p) => p.id));
  };

  const deseleccionarTodos = () => {
    setProyectosSeleccionadosIds([]);
  };

  const copiarPromptEtapa4 = (entregable: Entregable) => {
    const detallesEnt = `Vence: ${entregable.diaLimite}${
      entregable.cantidadObjetivo
        ? `, meta: ${entregable.cantidadObjetivo} ${entregable.unidad}`
        : ""
    }`;
    const prompt = generarPromptEtapa4Actividades(
      entregable.titulo,
      detallesEnt
    );
    navigator.clipboard.writeText(prompt);
    mostrarToast(
      `Prompt Etapa 4 para "${entregable.titulo}" copiado.`,
      "exito"
    );
  };

  const copiarPromptArbolCompleto = () => {
    const resumenHistorico =
      objetivos.length > 0
        ? objetivos.map((o) => `- ${o.titulo}`).join("\n")
        : "Sin objetivos cargados todavía.";
    const prompt = generarPromptArbolCompleto(
      resumenHistorico,
      areas.map((a) => a.nombre)
    );
    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de árbol completo copiado al portapapeles.", "exito");
  };

  // ==========================================================================
  // Apertura de modales de importación JSON por etapa
  // ==========================================================================
  const abrirModalImportarObjetivos = () => {
    setModalImportar({
      titulo: "Importar Objetivos con IA (Etapa 1)",
      plantillaEjemplo: JSON.stringify(
        {
          areaTitulo: areaActual?.nombre ?? "Agencia",
          objetivosNuevos: [
            {
              titulo: "Llegar a 250 contactos calificados",
              cantidadObjetivo: 250,
              unidad: "contactos",
              diaLimite: sumarDias(hoy, 90),
              proyectos: [],
            },
          ],
        },
        null,
        2
      ),
      renderResumen: resumenArbolCompleto,
      onImportar: async (items) => {
        const res = await importarUseCase.importarObjetivo(items);
        if (!res.ok) throw new Error(res.error!.mensaje);
        mostrarToast(res.valor, "exito");
        setModalImportar(null);
        setPaso(2);
      },
    });
  };

  const abrirModalImportarProyectos = () => {
    setModalImportar({
      titulo: `Importar Proyectos con IA (Etapa 2)`,
      plantillaEjemplo: JSON.stringify(
        {
          areaTitulo: areaActual?.nombre ?? "Perfil Profesional",
          objetivos: [
            {
              objetivoTitulo:
                objetivoActual?.titulo ?? "Título exacto del objetivo",
              proyectosNuevos: [
                {
                  titulo: "Proyecto 1",
                  diaInicio: hoy,
                  diaLimite: objetivoActual?.diaLimite ?? sumarDias(hoy, 30),
                  cantidadObjetivo: 100,
                  unidad: "contactos",
                  entregables: [],
                },
              ],
            },
          ],
        },
        null,
        2
      ),
      renderResumen: resumenProyectoBajoObjetivo,
      onImportar: async (items) => {
        const res = await importarUseCase.importarProyecto(items);
        if (!res.ok) throw new Error(res.error!.mensaje);
        mostrarToast(res.valor, "exito");
        setModalImportar(null);
      },
    });
  };

  const abrirModalImportarEntregables = () => {
    setModalImportar({
      titulo: `Importar Entregables y SOPs con IA (Etapa 3)`,
      plantillaEjemplo: JSON.stringify(
        {
          areaTitulo: areaActual?.nombre ?? "Perfil Profesional",
          proyectos: [
            {
              proyectoTitulo:
                proyectoActual?.titulo ?? "Título exacto del proyecto",
              entregablesNuevos: [
                {
                  titulo: "Semana 1: Prospección activa",
                  diaInicio: proyectoActual?.diaInicio ?? hoy,
                  diaLimite: proyectoActual?.diaLimite ?? sumarDias(hoy, 7),
                  cantidadObjetivo: 50,
                  unidad: "mensajes",
                  procedimiento: {
                    titulo: "Prospección outbound diaria",
                    categoria: "prospeccion",
                    pasos: [
                      {
                        orden: 1,
                        titulo: "Filtrar 10 leads en LinkedIn",
                        duracionEstimadaMin: 15,
                        esObligatorio: true,
                      },
                      {
                        orden: 2,
                        titulo: "Personalizar mensaje de primer contacto",
                        duracionEstimadaMin: 20,
                        esObligatorio: true,
                      },
                    ],
                  },
                  reparto: {
                    descripcion: "Contactar en frío",
                    tipo: "mantenimiento",
                    diasSemana: [1, 2, 3, 4, 5],
                  },
                  actividades: [],
                  fases: [],
                },
              ],
            },
          ],
        },
        null,
        2
      ),
      renderResumen: resumenEntregableBajoProyecto,
      onImportar: async (items) => {
        const res = await importarUseCase.importarEntregable(items);
        if (!res.ok) throw new Error(res.error!.mensaje);
        mostrarToast(res.valor, "exito");
        setModalImportar(null);
      },
    });
  };

  const abrirModalImportarActividades = (entregable: Entregable) => {
    setModalImportar({
      titulo: `Importar Agenda Diaria para "${entregable.titulo}" (Etapa 4)`,
      plantillaEjemplo: JSON.stringify(
        {
          entregableTitulo: entregable.titulo,
          actividadesNuevas: [
            {
              descripcion: `Ejecutar bloque de ${entregable.titulo}`,
              diaTarea: hoy,
              tipo: "enfoque",
              minutosEstimados: 60,
            },
          ],
          repartos: [
            {
              descripcion: `Reparto semanal de ${entregable.titulo}`,
              frecuencia: "dias_especificos",
              diasSemana: [1, 2, 3, 4, 5],
              diaInicio: entregable.diaInicio,
              diaLimite: entregable.diaLimite,
              cantidadTotal: entregable.cantidadObjetivo ?? 50,
              unidad: entregable.unidad ?? "mensajes",
              tipoActividad: "enfoque",
              minutosPorActividad: 45,
            },
          ],
        },
        null,
        2
      ),
      renderResumen: resumenActividadesBajoEntregable,
      onImportar: async (items) => {
        const res = await importarUseCase.importarActividades(items);
        if (!res.ok) throw new Error(res.error!.mensaje);
        mostrarToast(res.valor, "exito");
        setModalImportar(null);
      },
    });
  };

  const abrirModalImportarArbolCompleto = () => {
    setModalImportar({
      titulo: "Importar árbol completo generado por IA",
      plantillaEjemplo: '{"areaTitulo":"Agencia","objetivosNuevos":[]}',
      renderResumen: resumenArbolCompleto,
      onImportar: async (items) => {
        const res = await importarUseCase.importarArbol(items);
        if (!res.ok) throw new Error(res.error!.mensaje);
        mostrarToast(res.valor, "exito");
        setModalImportar(null);
        onCerrar();
      },
    });
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
                onClick={() => {
                  if (paso === 1 && objetivoActual && !objetivoId) {
                    setObjetivoId(objetivoActual.id);
                  }
                  setPaso((p) => (p + 1) as 1 | 2 | 3 | 4);
                }}
                disabled={
                  (paso === 1 && !objetivoActual) ||
                  (paso === 2 && proyectosDelObjetivo.length === 0)
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
      <div className="flex flex-col gap-4">
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
                  if (p.num === 1 || objetivoActual) setPaso(p.num);
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

        {/* Panel visual de Estado / Resumen de lo Planificado y Faltante */}
        <div className="rounded-xl border border-[#2A2A2E] bg-[#0A0A0C] p-3 text-xs">
          <div className="mb-2 flex items-center justify-between border-b border-[#1E1E22] pb-1.5">
            <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
              <Icono.Check className="h-3.5 w-3.5 text-emerald-400" />
              Mapa de Planificación Actual
            </span>
            <span className="text-[10px] text-zinc-500">
              {paso === 1 && "Etapa 1: Definiendo Norte y Área"}
              {paso === 2 && "Etapa 2: Definiendo Proyectos"}
              {paso === 3 && "Etapa 3: Definiendo Entregables y SOPs"}
              {paso === 4 && "Etapa 4: Definiendo Agenda y Fases"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            {/* 1. Área & Objetivo */}
            <div
              className={`rounded-lg border p-2 ${
                areaActual && objetivoActual
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-[#232326] bg-[#121215]"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">
                  1. Área & Objetivo
                </span>
                {objetivoActual ? (
                  <span className="text-[10px] font-bold text-emerald-400">
                    ✓ Listo
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-amber-400">
                    ○ Pendiente
                  </span>
                )}
              </div>
              <p className="truncate text-xs font-semibold text-zinc-200">
                {areaActual ? areaActual.nombre : "Sin área seleccionada"}
              </p>
              <p
                className="truncate text-[10px] text-zinc-400"
                title={objetivoActual?.titulo}
              >
                {objetivoActual
                  ? `${objetivoActual.titulo} (${objetivoActual.cantidadObjetivo} ${objetivoActual.unidad})`
                  : "Falta elegir o crear objetivo"}
              </p>
            </div>

            {/* 2. Proyectos */}
            <div
              className={`rounded-lg border p-2 ${
                proyectosDelObjetivo.length > 0
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-[#232326] bg-[#121215]"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">
                  2. Proyectos
                </span>
                {proyectosDelObjetivo.length > 0 ? (
                  <span className="text-[10px] font-bold text-emerald-400">
                    ✓ {proyectosDelObjetivo.length} activo(s)
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-amber-400">
                    ○ Pendiente
                  </span>
                )}
              </div>
              <p
                className="truncate text-xs font-semibold text-zinc-200"
                title={proyectoActual?.titulo}
              >
                {proyectoActual
                  ? proyectoActual.titulo
                  : proyectosDelObjetivo.length > 0
                    ? `${proyectosDelObjetivo.length} proyectos`
                    : "Sin proyectos"}
              </p>
              <p className="truncate text-[10px] text-zinc-400">
                {proyectosDelObjetivo.length > 0
                  ? `Activo: ${proyectoActual?.titulo ?? "Ninguno"}`
                  : "Falta desglosar en proyectos"}
              </p>
            </div>

            {/* 3. Entregables & SOP */}
            <div
              className={`rounded-lg border p-2 ${
                entregablesDelProyecto.length > 0
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-[#232326] bg-[#121215]"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">
                  3. Entregables & SOP
                </span>
                {entregablesDelProyecto.length > 0 ? (
                  <span className="text-[10px] font-bold text-emerald-400">
                    ✓ {entregablesDelProyecto.length} cargado(s)
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-amber-400">
                    ○ Pendiente
                  </span>
                )}
              </div>
              <p className="truncate text-xs font-semibold text-zinc-200">
                {entregablesDelProyecto.length > 0
                  ? `${entregablesDelProyecto.length} entregable(s)`
                  : "Sin entregables"}
              </p>
              <p className="truncate text-[10px] text-zinc-400">
                {entregablesDelProyecto.some((e) =>
                  actividades.some(
                    (a) => a.entregableId === e.id && Boolean(a.procedimientoId)
                  )
                )
                  ? "✓ Incluye SOPs vinculados"
                  : entregablesDelProyecto.length > 0
                    ? "Sin SOPs asociados"
                    : "Falta definir entregables"}
              </p>
            </div>

            {/* 4. Agenda & Fases */}
            <div
              className={`rounded-lg border p-2 ${
                entregablesDelProyecto.some(
                  (e) =>
                    fases.some((f) => f.entregableId === e.id) ||
                    actividades.some((a) => a.entregableId === e.id)
                )
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-[#232326] bg-[#121215]"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">
                  4. Agenda & Fases
                </span>
                {entregablesDelProyecto.some(
                  (e) =>
                    fases.some((f) => f.entregableId === e.id) ||
                    actividades.some((a) => a.entregableId === e.id)
                ) ? (
                  <span className="text-[10px] font-bold text-emerald-400">
                    ✓ Distribuido
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-zinc-500">
                    ○ Opcional
                  </span>
                )}
              </div>
              <p className="truncate text-xs font-semibold text-zinc-200">
                Ritmo semanal y diario
              </p>
              <p className="truncate text-[10px] text-zinc-400">
                Fases o reparto en días
              </p>
            </div>
          </div>
        </div>

        {/* PASO 1: Área y Objetivo */}
        {paso === 1 && (
          <div className="flex flex-col gap-4">
            {/* Banner IA Etapa 1 */}
            <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Icono.Sparkles className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-300">
                      Etapa 1 con IA: Definir Norte y Objetivos Cuantificables
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Genera el prompt con la arquitectura completa, límites de
                    capacidad diaria (máx 1 foco + 3 mant.) y formato JSON para
                    los Objetivos.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copiarPromptEtapa1}
                    icono={<Icono.Copy className="h-3.5 w-3.5" />}
                  >
                    Copiar Prompt Etapa 1 (Objetivos)
                  </Button>
                  <Button
                    size="sm"
                    onClick={abrirModalImportarObjetivos}
                    icono={<Icono.File className="h-3.5 w-3.5" />}
                  >
                    Pegar JSON Objetivos
                  </Button>
                </div>
              </div>

              {/* Atajo árbol completo */}
              <div className="flex flex-wrap items-center justify-between border-t border-emerald-500/15 pt-2 text-[11px]">
                <span className="text-zinc-500">
                  ¿Querés armar todo el árbol de una sola vez?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copiarPromptArbolCompleto}
                    className="font-medium text-emerald-400 underline hover:text-emerald-300"
                  >
                    Copiar prompt árbol completo
                  </button>
                  <span className="text-zinc-600">·</span>
                  <button
                    type="button"
                    onClick={abrirModalImportarArbolCompleto}
                    className="font-medium text-emerald-400 underline hover:text-emerald-300"
                  >
                    Pegar JSON árbol completo
                  </button>
                </div>
              </div>
            </div>

            {/* Formulario Manual Paso 1 */}
            <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#141417] p-3.5">
              <span className={rotulo}>1A. Elegí o creá el Área</span>
              <div className="flex flex-wrap gap-1.5">
                {areas.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setAreaId(a.id);
                      const objsDeEstaArea = objetivos.filter(
                        (o) => o.areaId === a.id
                      );
                      if (objsDeEstaArea.length > 0) {
                        setObjetivoId(objsDeEstaArea[0].id);
                      }
                    }}
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
                      onClick={() => {
                        setObjetivoId(o.id);
                        if (o.areaId) setAreaId(o.areaId);
                      }}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 text-left text-xs ${
                        objetivoActual?.id === o.id
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

        {/* PASO 2: Proyectos por Área & Objetivo */}
        {paso === 2 && (
          <div className="flex flex-col gap-4">
            {/* 2A. Selector de Área y Progreso */}
            {areas.length > 0 && (
              <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#141417] p-3.5">
                <div className="flex items-center justify-between">
                  <span className={rotulo}>2A. Elegí el Área a planificar</span>
                  <span className="text-[11px] text-zinc-500">
                    {
                      objetivos.filter((o) =>
                        proyectos.some((p) => p.objetivoId === o.id)
                      ).length
                    }{" "}
                    de {objetivos.length} objetivos con proyectos listos
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {areas.map((a) => {
                    const objsArea = objetivos.filter((o) => o.areaId === a.id);
                    const listosArea = objsArea.filter((o) =>
                      proyectos.some((p) => p.objetivoId === o.id)
                    ).length;
                    const activo = areaActual?.id === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setAreaId(a.id);
                          if (objsArea.length > 0) {
                            setObjetivoId(objsArea[0].id);
                          }
                        }}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                          activo
                            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                            : "border-[#2A2A2E] bg-[#0D0D0F] text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <span>{a.nombre}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] ${
                            listosArea === objsArea.length &&
                            objsArea.length > 0
                              ? "bg-emerald-500/20 font-bold text-emerald-300"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {listosArea}/{objsArea.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Banner IA Etapa 2 con soporte Área Completa e Individual */}
            {areaActual &&
              (() => {
                const objsArea = objetivos.filter(
                  (o) => o.areaId === areaActual.id
                );
                const pendientesArea = objsArea.filter(
                  (o) => !proyectos.some((p) => p.objetivoId === o.id)
                );
                const listosArea = objsArea.filter((o) =>
                  proyectos.some((p) => p.objetivoId === o.id)
                );

                return (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5">
                    <div className="max-w-xl">
                      <div className="flex items-center gap-1.5">
                        <Icono.Sparkles className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-300">
                          Etapa 2 con IA: Proyectos de &quot;{areaActual.nombre}
                          &quot;
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-400">
                        {pendientesArea.length > 0
                          ? `Hay ${pendientesArea.length} objetivo(s) pendientes de proyectos en esta área. Podés copiar el prompt para que la IA los planifique juntos (sin repetir los ${listosArea.length} ya cubiertos) o elegir uno individual abajo.`
                          : `¡Excelente! Los ${objsArea.length} objetivos de "${areaActual.nombre}" ya tienen proyectos cargados.`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => copiarPromptEtapa2Area(areaActual.id)}
                        icono={<Icono.Sparkles className="h-3.5 w-3.5" />}
                      >
                        {pendientesArea.length > 0
                          ? `Copiar Prompt Área (${pendientesArea.length} pendientes)`
                          : `Copiar Prompt Área (Replanificar)`}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={abrirModalImportarProyectos}
                        icono={<Icono.File className="h-3.5 w-3.5" />}
                      >
                        Pegar JSON (Área o Individual)
                      </Button>
                    </div>
                  </div>
                );
              })()}

            {/* 2B. Tracker de Objetivos del Área */}
            {areaActual && (
              <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#141417] p-3.5">
                <span className={rotulo}>
                  2B. Objetivos en &quot;{areaActual.nombre}&quot; (Hacé clic
                  para seleccionar o planificar individual)
                </span>
                {objetivos.filter((o) => o.areaId === areaActual.id).length ===
                0 ? (
                  <p className="text-xs text-zinc-500">
                    No hay objetivos en esta área todavía. Creá uno en el Paso
                    1.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {objetivos
                      .filter((o) => o.areaId === areaActual.id)
                      .map((o) => {
                        const proysObj = proyectos.filter(
                          (p) => p.objetivoId === o.id
                        );
                        const seleccionado = objetivoActual?.id === o.id;
                        return (
                          <div
                            key={o.id}
                            onClick={() => setObjetivoId(o.id)}
                            className={`flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 transition-all ${
                              seleccionado
                                ? "border-emerald-500/50 bg-emerald-500/10"
                                : "border-[#2A2A2E] bg-[#0D0D0F] hover:border-zinc-700"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                {proysObj.length > 0 ? (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                                    ✓ {proysObj.length} proyecto
                                    {proysObj.length > 1 ? "s" : ""}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-400">
                                    ○ Sin proyectos
                                  </span>
                                )}
                                <span className="text-zinc-600">·</span>
                                <span className="text-[11px] text-zinc-400">
                                  vence {o.diaLimite}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-xs font-bold text-zinc-200">
                                {o.titulo}
                              </p>
                              <p className="text-[10px] text-zinc-500">
                                Meta: {o.cantidadObjetivo} {o.unidad}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setObjetivoId(o.id);
                                  copiarPromptEtapa2(o);
                                }}
                                icono={<Icono.Copy className="h-3 w-3" />}
                                title="Copia el prompt enfocado solo para este objetivo"
                              >
                                Prompt Individual
                              </Button>
                              <Badge color={seleccionado ? "emerald" : "zinc"}>
                                {seleccionado ? "En Foco" : "Ver"}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* 2C. Proyectos y Alta Rápida del Objetivo en Foco */}
            {objetivoActual ? (
              <>
                <div className="rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">
                      Objetivo en Foco Detallado
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Área:{" "}
                      <strong className="text-zinc-200">
                        {areaActual?.nombre ?? "General"}
                      </strong>
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-bold text-zinc-100">
                    {objetivoActual.titulo}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Meta:{" "}
                    <span className="font-medium text-zinc-200">
                      {objetivoActual.cantidadObjetivo} {objetivoActual.unidad}
                    </span>{" "}
                    · Vence:{" "}
                    <span className="font-medium text-zinc-200">
                      {objetivoActual.diaLimite}
                    </span>
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <span className={rotulo}>
                    Proyectos de este Objetivo ({proyectosDelObjetivo.length})
                  </span>
                  {proyectosDelObjetivo.length === 0 ? (
                    <p className="text-xs text-zinc-500">
                      Todavía no hay proyectos bajo este objetivo. Podés usar la
                      IA arriba o agregarlo manualmente abajo.
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
                          color={
                            proyectoActual?.id === p.id ? "emerald" : "zinc"
                          }
                        >
                          {proyectoActual?.id === p.id
                            ? "Seleccionado"
                            : "Elegir"}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#141417] p-3.5">
                  <span className={rotulo}>+ Agregar Proyecto manual</span>
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
              </>
            ) : (
              <p className="text-sm text-zinc-400">
                Seleccioná o creá un objetivo en el Paso 1 para continuar.
              </p>
            )}
          </div>
        )}

        {/* PASO 3: Entregables y SOPs por Área o por Proyecto */}
        {paso === 3 && (
          <div className="flex flex-col gap-4">
            {/* 3A. Selector de Área con progreso, auditoría y reseteo */}
            {areas.length > 0 && (
              <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#141417] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={rotulo}>3A. Elegí el Área a planificar</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {areaActual && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            copiarPromptAuditoriaArea(areaActual.id)
                          }
                          icono={
                            <Icono.Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                          }
                          title="Copia el resumen completo de Objetivos, Proyectos y Entregables del Área para evaluar la planificación con una IA"
                        >
                          Auditar Área con IA
                        </Button>
                        {(() => {
                          const objsArea = objetivos.filter(
                            (o) => o.areaId === areaActual.id
                          );
                          const proysArea = proyectos.filter((p) =>
                            objsArea.some((o) => o.id === p.objetivoId)
                          );
                          const totalEntsArea = entregables.filter((e) =>
                            proysArea.some((p) => p.id === e.proyectoId)
                          ).length;
                          return (
                            totalEntsArea > 0 && (
                              <button
                                type="button"
                                onClick={() => prepararResetArea(areaActual.id)}
                                className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/20"
                                title="Limpia los entregables creados en esta área sin tocar áreas ni proyectos"
                              >
                                <Icono.Trash className="h-3.5 w-3.5" />
                                Resetear entregables ({totalEntsArea})
                              </button>
                            )
                          );
                        })()}
                      </>
                    )}
                    <span className="text-[11px] text-zinc-500">
                      {(() => {
                        const totalProys = proyectos.length;
                        const conEnt = proyectos.filter((p) =>
                          entregables.some((e) => e.proyectoId === p.id)
                        ).length;
                        return `${conEnt} de ${totalProys} proyectos con entregables (Opcional)`;
                      })()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {areas.map((a) => {
                    const objsArea = objetivos.filter((o) => o.areaId === a.id);
                    const proysArea = proyectos.filter((p) =>
                      objsArea.some((o) => o.id === p.objetivoId)
                    );
                    const listosArea = proysArea.filter((p) =>
                      entregables.some((e) => e.proyectoId === p.id)
                    ).length;
                    const activo = areaActual?.id === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setAreaId(a.id);
                          const objsDeEstaArea = objetivos.filter(
                            (o) => o.areaId === a.id
                          );
                          if (objsDeEstaArea.length > 0) {
                            setObjetivoId(objsDeEstaArea[0].id);
                            const proys = proyectos.filter(
                              (p) => p.objetivoId === objsDeEstaArea[0].id
                            );
                            if (proys.length > 0) setProyectoId(proys[0].id);
                          }
                        }}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                          activo
                            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                            : "border-[#2A2A2E] bg-[#0D0D0F] text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <span>{a.nombre}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] ${
                            listosArea > 0 && listosArea === proysArea.length
                              ? "bg-emerald-500/20 font-bold text-emerald-300"
                              : listosArea > 0
                                ? "bg-zinc-700 font-bold text-zinc-300"
                                : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {listosArea}/{proysArea.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Banner IA Etapa 3 con soporte Área Completa e Individual y Selección Granular */}
            {areaActual &&
              (() => {
                const objsArea = objetivos.filter(
                  (o) => o.areaId === areaActual.id
                );
                const proysArea = proyectos.filter((p) =>
                  objsArea.some((o) => o.id === p.objetivoId)
                );
                const pendientesArea = proysArea.filter(
                  (p) => !entregables.some((e) => e.proyectoId === p.id)
                );
                const conEntregablesArea = proysArea.filter((p) =>
                  entregables.some((e) => e.proyectoId === p.id)
                );

                const seleccionadosCount =
                  proyectosSeleccionadosIds.length > 0
                    ? pendientesArea.filter((p) =>
                        proyectosSeleccionadosIds.includes(p.id)
                      ).length
                    : pendientesArea.length;

                const pospuestosCount =
                  pendientesArea.length - seleccionadosCount;

                return (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5">
                    <div className="max-w-xl">
                      <div className="flex items-center gap-1.5">
                        <Icono.Sparkles className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-300">
                          Etapa 3 con IA: Entregables y SOPs de &quot;
                          {areaActual.nombre}&quot;
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-400">
                        {proysArea.length === 0
                          ? `No hay proyectos en "${areaActual.nombre}". Cargá proyectos en el Paso 2.`
                          : pendientesArea.length > 0
                            ? `Podés seleccionar qué proyectos desglosar ahora y cuáles posponer para más adelante. Tildados para el prompt: ${seleccionadosCount} de ${pendientesArea.length} pendientes${
                                pospuestosCount > 0
                                  ? ` (${pospuestosCount} pospuestos)`
                                  : ""
                              }.`
                            : `¡Excelente! Los ${proysArea.length} proyectos de "${areaActual.nombre}" ya tienen entregables cargados.`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {proysArea.length > 0 && (
                        <Button
                          size="sm"
                          onClick={() => copiarPromptEtapa3Area(areaActual.id)}
                          icono={<Icono.Sparkles className="h-3.5 w-3.5" />}
                        >
                          {pendientesArea.length > 0
                            ? `Copiar Prompt (${seleccionadosCount} seleccionados)`
                            : `Copiar Prompt Área (Replanificar)`}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={abrirModalImportarEntregables}
                        icono={<Icono.File className="h-3.5 w-3.5" />}
                      >
                        Pegar JSON (Área o Proyecto)
                      </Button>
                    </div>
                    {conEntregablesArea.length > 0 && (
                      <p className="w-full border-t border-emerald-500/15 pt-2 text-[10px] text-zinc-500">
                        ✓ Ya planificados (no se repetirán en el prompt):{" "}
                        <span className="font-medium text-zinc-400">
                          {conEntregablesArea.map((p) => p.titulo).join(" · ")}
                        </span>
                      </p>
                    )}
                  </div>
                );
              })()}

            {/* 3B. Tracker de Proyectos del Área con Selección Granular */}
            {areaActual && (
              <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#141417] p-3.5">
                {(() => {
                  const objsArea = objetivos.filter(
                    (o) => o.areaId === areaActual.id
                  );
                  const proysArea = proyectos.filter((p) =>
                    objsArea.some((o) => o.id === p.objetivoId)
                  );
                  const pendientesArea = proysArea.filter(
                    (p) => !entregables.some((e) => e.proyectoId === p.id)
                  );

                  return (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={rotulo}>
                          3B. Proyectos en &quot;{areaActual.nombre}&quot; —
                          Tildá los que desglosás en esta tanda
                        </span>
                        {pendientesArea.length > 0 && (
                          <div className="flex items-center gap-2 text-[11px]">
                            <button
                              type="button"
                              onClick={() =>
                                seleccionarTodosPendientes(pendientesArea)
                              }
                              className="font-medium text-emerald-400 transition-colors hover:text-emerald-300"
                            >
                              Seleccionar todos pendientes
                            </button>
                            <span className="text-zinc-600">·</span>
                            <button
                              type="button"
                              onClick={deseleccionarTodos}
                              className="font-medium text-zinc-400 transition-colors hover:text-zinc-300"
                            >
                              Limpiar selección
                            </button>
                          </div>
                        )}
                      </div>

                      {proysArea.length === 0 ? (
                        <p className="text-xs text-zinc-500">
                          No hay proyectos en esta área todavía. Creá proyectos
                          en el Paso 2.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {proysArea.map((p) => {
                            const entsDelProy = entregables.filter(
                              (e) => e.proyectoId === p.id
                            );
                            const tieneEntregables = entsDelProy.length > 0;
                            const seleccionadoFoco =
                              proyectoActual?.id === p.id;

                            // Si tiene entregables ya está cubierto.
                            // Si es pendiente: si proyectosSeleccionadosIds está vacío, por defecto están todos incluidos.
                            // Si tiene elementos, está incluido si está en la lista.
                            const estaTildadoParaPrompt = tieneEntregables
                              ? false
                              : proyectosSeleccionadosIds.length === 0 ||
                                proyectosSeleccionadosIds.includes(p.id);

                            return (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setProyectoId(p.id);
                                  const obj = objsArea.find(
                                    (o) => o.id === p.objetivoId
                                  );
                                  if (obj) setObjetivoId(obj.id);
                                }}
                                className={`flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 transition-all ${
                                  seleccionadoFoco
                                    ? "border-emerald-500/50 bg-emerald-500/10"
                                    : "border-[#2A2A2E] bg-[#0D0D0F] hover:border-zinc-700"
                                }`}
                              >
                                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                                  {!tieneEntregables && (
                                    <input
                                      type="checkbox"
                                      checked={estaTildadoParaPrompt}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        if (
                                          proyectosSeleccionadosIds.length === 0
                                        ) {
                                          // Si estaba vacío (todos por defecto), ahora el set son todos menos este
                                          const todos = pendientesArea.map(
                                            (x) => x.id
                                          );
                                          setProyectosSeleccionadosIds(
                                            todos.filter((id) => id !== p.id)
                                          );
                                        } else {
                                          toggleProyectoSeleccionado(p.id);
                                        }
                                      }}
                                      title={
                                        estaTildadoParaPrompt
                                          ? "Incluido para desglosar con IA en el prompt"
                                          : "Pospuesto: no se incluirá en el prompt ahora"
                                      }
                                      className="mt-1 h-4 w-4 cursor-pointer rounded border-[#2A2A2E] bg-zinc-900 text-emerald-500 focus:ring-emerald-500/40"
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      {tieneEntregables ? (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                                          ✓ {entsDelProy.length} entregable
                                          {entsDelProy.length > 1 ? "s" : ""}
                                        </span>
                                      ) : estaTildadoParaPrompt ? (
                                        <span className="text-[10px] font-bold text-emerald-400/90">
                                          ⚡ Planificar ahora
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold text-zinc-500">
                                          ⏸ Para más adelante
                                        </span>
                                      )}
                                      <span className="text-zinc-600">·</span>
                                      <span className="text-[11px] text-zinc-400">
                                        vence {p.diaLimite}
                                      </span>
                                    </div>
                                    <p className="mt-0.5 truncate text-xs font-bold text-zinc-200">
                                      {p.titulo}
                                    </p>
                                    <p className="text-[10px] text-zinc-500">
                                      {objsArea.find(
                                        (o) => o.id === p.objetivoId
                                      )?.titulo ?? ""}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setProyectoId(p.id);
                                      copiarPromptEtapa3(p);
                                    }}
                                    icono={<Icono.Copy className="h-3 w-3" />}
                                    title="Copia el prompt enfocado solo para este proyecto"
                                  >
                                    Prompt Individual
                                  </Button>
                                  <Badge
                                    color={
                                      seleccionadoFoco ? "emerald" : "zinc"
                                    }
                                  >
                                    {seleccionadoFoco ? "En Foco" : "Ver"}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* 3C. Detalle del Proyecto en Foco con Reseteo Quirúrgico */}
            {proyectoActual ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">
                      Proyecto activo en desglose
                    </span>
                    <p className="text-sm font-bold text-zinc-100">
                      {proyectoActual.titulo}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Los entregables son opcionales — proyectos simples pueden
                      ir directamente al Paso 4.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setDistribuirProy(proyectoActual)}
                    >
                      Dividir en semanas automáticamente
                    </Button>
                    {entregablesDelProyecto.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => prepararResetProyecto(proyectoActual)}
                        icono={
                          <Icono.Trash className="h-3.5 w-3.5 text-rose-400" />
                        }
                        title="Borra únicamente los entregables de este proyecto"
                      >
                        Limpiar entregables ({entregablesDelProyecto.length})
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className={rotulo}>
                    Entregables de &quot;{proyectoActual.titulo}&quot; (
                    {entregablesDelProyecto.length})
                  </span>
                  {entregablesDelProyecto.length === 0 ? (
                    <p className="text-xs text-zinc-500">
                      No hay entregables cargados. Podés generarlos con IA
                      arriba, importar un JSON o agregarlo manualmente abajo. Si
                      el proyecto es simple, podés avanzar al Paso 4
                      directamente.
                    </p>
                  ) : (
                    entregablesDelProyecto.map((e) => {
                      const tieneSop = actividades.some(
                        (a) =>
                          a.entregableId === e.id && Boolean(a.procedimientoId)
                      );
                      return (
                        <div
                          key={e.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="min-w-0 text-sm font-bold text-zinc-200">
                              {e.titulo}
                            </span>
                            {tieneSop && (
                              <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                📋 Con SOP
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-zinc-400">
                            {e.cantidadObjetivo
                              ? `${e.progresoActual}/${e.cantidadObjetivo} ${e.unidad}`
                              : `vence ${e.diaLimite}`}
                          </span>
                        </div>
                      );
                    })
                  )}
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
              </>
            ) : (
              <p className="text-sm text-zinc-400">
                Seleccioná un proyecto del tracker de arriba o creá uno en el
                Paso 2 para continuar.
              </p>
            )}
          </div>
        )}
        {/* PASO 4: Fases y Reparto en Días */}
        {paso === 4 && (
          <div className="flex flex-col gap-3">
            {proyectoActual ? (
              <>
                {/* Banner IA Etapa 4 */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Icono.Sparkles className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-300">
                        Etapa 4 con IA: Planificar Agenda y Reparto Diario
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-zinc-400">
                      Distribuí el trabajo en días específicos respetando la
                      capacidad diaria del búnker (máx 1 enfoque + 3
                      mantenimiento).
                    </p>
                  </div>
                </div>

                <p className="text-xs text-zinc-400">
                  Para cada Entregable de{" "}
                  <strong className="text-zinc-200">
                    {proyectoActual.titulo}
                  </strong>
                  , podés generar sus Fases semanales/progresivas, repartir sus
                  actividades o usar el asistente por IA:
                </p>

                {entregablesDelProyecto.map((e) => {
                  const fasesEnt = fases.filter((f) => f.entregableId === e.id);
                  const actsEnt = actividades.filter(
                    (a) => a.entregableId === e.id
                  );
                  const tieneSop = actsEnt.some((a) =>
                    Boolean(a.procedimientoId)
                  );
                  return (
                    <div
                      key={e.id}
                      className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-zinc-100">
                              {e.titulo}
                            </span>
                            {tieneSop && (
                              <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                📋 Con SOP
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-zinc-500">
                            {e.cantidadObjetivo
                              ? `${e.cantidadObjetivo} ${e.unidad}`
                              : "Sin meta numérica"}{" "}
                            · {fasesEnt.length} fase(s) · {actsEnt.length}{" "}
                            actividad(es)
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copiarPromptEtapa4(e)}
                            icono={<Icono.Copy className="h-3.5 w-3.5" />}
                          >
                            Copiar Prompt Etapa 4
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirModalImportarActividades(e)}
                            icono={<Icono.File className="h-3.5 w-3.5" />}
                          >
                            Pegar JSON Agenda
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setGenerarFasesEnt(e)}
                          >
                            Generar Fases
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRepartirDiasEnt(e)}
                          >
                            Repartir en días
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="text-sm text-zinc-400">
                Seleccioná un proyecto para continuar.
              </p>
            )}
          </div>
        )}
      </div>

      {modalImportar && (
        <ModalImportarJson
          abierto
          onCerrar={() => setModalImportar(null)}
          titulo={modalImportar.titulo}
          plantillaEjemplo={modalImportar.plantillaEjemplo}
          onImportar={modalImportar.onImportar}
          renderResumen={modalImportar.renderResumen}
        />
      )}

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
      {/* Modal de confirmación para reseteo minucioso de entregables */}
      {confirmarReset && (
        <Dialog
          abierto
          onClose={() => setConfirmarReset(null)}
          titulo={confirmarReset.titulo}
          maxWidth="md"
          footer={
            <div className="flex w-full items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmarReset(null)}
                disabled={reseteando}
              >
                Cancelar
              </Button>
              <button
                type="button"
                onClick={() => void ejecutarReset()}
                disabled={reseteando}
                className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
              >
                {reseteando ? "Eliminando..." : "Sí, eliminar entregables"}
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-3 py-2 text-sm text-zinc-300">
            <p>{confirmarReset.subtitulo}</p>
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
              <p className="flex items-center gap-1.5 font-bold text-rose-300">
                <Icono.Trash className="h-4 w-4" /> Detalle de lo que se
                limpiará:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-zinc-300">
                <li>
                  Se eliminarán{" "}
                  <strong className="text-rose-300">
                    {confirmarReset.entregablesCount} entregable(s)
                  </strong>
                  .
                </li>
                {confirmarReset.actividadesCount > 0 && (
                  <li>
                    Se eliminarán{" "}
                    <strong className="text-rose-300">
                      {confirmarReset.actividadesCount} actividad(es)
                    </strong>{" "}
                    vinculadas a estos entregables.
                  </li>
                )}
                {confirmarReset.fasesCount > 0 && (
                  <li>
                    Se eliminarán{" "}
                    <strong className="text-rose-300">
                      {confirmarReset.fasesCount} fase(s)
                    </strong>{" "}
                    vinculadas.
                  </li>
                )}
                <li className="pt-1 font-semibold text-emerald-400">
                  ✓ Tus Áreas, Objetivos y Proyectos se mantendrán intactos.
                </li>
              </ul>
            </div>
          </div>
        </Dialog>
      )}
    </Dialog>
  );
};
