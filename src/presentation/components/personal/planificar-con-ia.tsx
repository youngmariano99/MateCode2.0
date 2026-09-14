"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import { ModalImportarJson } from "../contenido/modal-importar-json";
import { ImportarPlanificacionUseCase } from "../../../application/use-cases/personal/importar-planificacion.use-case";
import {
  generarResumenPeriodo,
  generarPromptPlanSemanal,
  generarPromptPlanObjetivos,
} from "../../../domain/prompts/generar-prompt-planificacion-personal";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";

const useCase = new ImportarPlanificacionUseCase();
const SIN_ITEMS: never[] = [];
const DIAS_CONTEXTO = 30;

const PLANTILLA_SEMANA = JSON.stringify(
  {
    tareasDiarias: [
      { diaTarea: "YYYY-MM-DD", tipo: "enfoque", descripcion: "..." },
    ],
    pendientes: [{ descripcion: "...", prioridad: "importante" }],
  },
  null,
  2
);

const PLANTILLA_OBJETIVOS = JSON.stringify(
  {
    objetivosNuevos: [
      {
        titulo: "...",
        unidad: "...",
        cantidadObjetivo: 200,
        diaLimite: "YYYY-MM-DD",
        etiquetaArea: "...",
      },
    ],
    ajustes: [{ titulo: "Título exacto existente", cantidadObjetivo: 150 }],
  },
  null,
  2
);

/**
 * Base compartida: arma el resumen histórico (hábitos/objetivos de los
 * últimos 30 días) que se pasa como contexto a ambos prompts — ni la semana
 * ni el mes se planifican en el vacío.
 */
function useResumenHistorico(): string {
  const hoy = obtenerDiaTareaHoy();
  const desde = sumarDias(hoy, -DIAS_CONTEXTO);
  const habitos =
    useLiveQuery(() => db.habito_definicion.toArray()) || SIN_ITEMS;
  const registros =
    useLiveQuery(
      () => db.habito_registro.where("diaTarea").aboveOrEqual(desde).toArray(),
      [desde]
    ) || SIN_ITEMS;
  const objetivos =
    useLiveQuery(() =>
      db.objetivo_cuantificable
        .where("estado")
        .anyOf(["activo", "vencido"])
        .toArray()
    ) || SIN_ITEMS;

  return generarResumenPeriodo(habitos, registros, objetivos, hoy);
}

/** Botón "Planificar semana con IA": copia el prompt con contexto + abre el import del JSON de respuesta. */
export const PlanificarSemanaIA: React.FC = () => {
  const { mostrarToast } = useToast();
  const [modalAbierto, setModalAbierto] = useState(false);
  const resumen = useResumenHistorico();
  const pendientesBacklog =
    useLiveQuery(() =>
      db.tarea_pendiente.where("estado").equals("pendiente").toArray()
    ) || SIN_ITEMS;

  const copiarPrompt = () => {
    const prompt = generarPromptPlanSemanal(resumen, pendientesBacklog);
    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt copiado al portapapeles.", "exito");
  };

  const importar = async (items: unknown[]) => {
    const res = await useCase.importarSemana(items);
    if (!res.ok) throw new Error(res.error!.mensaje);
    mostrarToast(res.valor, "exito");
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={copiarPrompt}
        className="px-3 py-1.5 text-xs"
        icono={<Icono.Sparkles className="h-3.5 w-3.5" />}
      >
        Planificar semana con IA
      </Button>
      <Button
        variant="outline"
        onClick={() => setModalAbierto(true)}
        className="px-3 py-1.5 text-xs"
      >
        Pegar plan generado
      </Button>
      <ModalImportarJson
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo="Importar plan semanal desde JSON"
        plantillaEjemplo={PLANTILLA_SEMANA}
        onImportar={importar}
      />
    </div>
  );
};

/** Botón "Planificar objetivos con IA": mismo patrón, horizonte mensual. */
export const PlanificarObjetivosIA: React.FC = () => {
  const { mostrarToast } = useToast();
  const [modalAbierto, setModalAbierto] = useState(false);
  const resumen = useResumenHistorico();
  const objetivosActivos =
    useLiveQuery(() =>
      db.objetivo_cuantificable
        .where("estado")
        .anyOf(["activo", "vencido"])
        .toArray()
    ) || SIN_ITEMS;
  const etiquetasArea =
    useLiveQuery(() =>
      db.catalogo_etiquetas.where("categoria").equals("area_personal").toArray()
    ) || SIN_ITEMS;
  const areasDisponibles = etiquetasArea.map((e) => e.etiqueta);

  const copiarPrompt = () => {
    const prompt = generarPromptPlanObjetivos(
      resumen,
      objetivosActivos,
      areasDisponibles
    );
    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt copiado al portapapeles.", "exito");
  };

  const importar = async (items: unknown[]) => {
    const res = await useCase.importarObjetivos(items);
    if (!res.ok) throw new Error(res.error!.mensaje);
    mostrarToast(res.valor, "exito");
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={copiarPrompt}
        className="px-3 py-1.5 text-xs"
        icono={<Icono.Sparkles className="h-3.5 w-3.5" />}
      >
        Planificar objetivos con IA
      </Button>
      <Button
        variant="outline"
        onClick={() => setModalAbierto(true)}
        className="px-3 py-1.5 text-xs"
      >
        Pegar plan generado
      </Button>
      <ModalImportarJson
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo="Importar plan de objetivos desde JSON"
        plantillaEjemplo={PLANTILLA_OBJETIVOS}
        onImportar={importar}
      />
    </div>
  );
};
