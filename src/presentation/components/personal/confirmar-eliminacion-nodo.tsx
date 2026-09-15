"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import {
  EliminarNodoPersonalUseCase,
  type NivelJerarquiaPersonal,
  type ConteoDescendientesPersonal,
} from "../../../application/use-cases/personal/eliminar-nodo-personal.use-case";

const useCase = new EliminarNodoPersonalUseCase();

const ETIQUETA_CONTEO: Record<keyof ConteoDescendientesPersonal, string> = {
  areas: "Área(s)",
  objetivos: "Objetivo(s)",
  proyectos: "Proyecto(s)",
  entregables: "Entregable(s)",
  actividades: "Actividad(es)",
  habitosVinculados:
    "Hábito(s) vinculado(s) — quedan, solo se les saca el vínculo",
};

interface ConfirmarEliminacionNodoProps {
  abierto: boolean;
  onCerrar: () => void;
  nivel: NivelJerarquiaPersonal;
  id: string;
  titulo: string;
  onEliminado: () => void;
}

/**
 * Antes de eliminar, muestra el conteo REAL de todo lo que depende de este
 * nodo — la pieza que no existía en ningún lado del código (todo borrado
 * anterior en la app usa un confirm() nativo con texto genérico fijo, sin
 * contar nada). El botón de eliminar queda deshabilitado hasta que el
 * conteo termina de cargar, para no poder confirmar a ciegas.
 */
export const ConfirmarEliminacionNodo: React.FC<
  ConfirmarEliminacionNodoProps
> = ({ abierto, onCerrar, nivel, id, titulo, onEliminado }) => {
  const { mostrarToast } = useToast();
  const [eliminando, setEliminando] = useState(false);

  // useLiveQuery maneja "cargando" solo (devuelve undefined mientras
  // resuelve) — evita un useEffect + setState manual para un fetch-on-open.
  const resultado = useLiveQuery(
    () => (abierto ? useCase.contarDescendientes(nivel, id) : undefined),
    [abierto, nivel, id]
  );
  const cargando = resultado === undefined;
  const conteo: ConteoDescendientesPersonal | null =
    resultado && resultado.ok ? resultado.valor : null;
  const errorConteo =
    resultado && !resultado.ok ? resultado.error!.mensaje : null;

  const totalDependientes = conteo
    ? Object.values(conteo).reduce((s, n) => s + (n || 0), 0)
    : 0;

  const confirmar = async () => {
    setEliminando(true);
    const res = await useCase.ejecutar(nivel, id);
    setEliminando(false);
    if (res.ok) {
      mostrarToast("Eliminado.", "exito");
      onEliminado();
      onCerrar();
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  return (
    <Dialog
      abierto={abierto}
      onClose={onCerrar}
      titulo={`Eliminar "${titulo}"`}
      footer={
        <>
          <button
            onClick={onCerrar}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
          >
            Cancelar
          </button>
          <Button
            onClick={confirmar}
            cargando={eliminando}
            disabled={cargando || !conteo}
            className="!bg-red-500 hover:!bg-red-600"
          >
            Eliminar{" "}
            {totalDependientes > 0 ? `(y ${totalDependientes} más)` : ""}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {cargando && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Icono.Clock className="h-4 w-4 animate-pulse" />
            Contando lo que depende de esto...
          </div>
        )}
        {errorConteo && <p className="text-sm text-red-400">{errorConteo}</p>}
        {conteo && totalDependientes === 0 && (
          <p className="text-sm text-zinc-400">
            No tiene nada debajo — se elimina solo.
          </p>
        )}
        {conteo && totalDependientes > 0 && (
          <>
            <p className="text-sm text-zinc-300">
              Esto también elimina todo lo que depende de acá:
            </p>
            <ul className="flex flex-col gap-1">
              {(Object.keys(conteo) as (keyof ConteoDescendientesPersonal)[])
                .filter((k) => (conteo[k] || 0) > 0)
                .map((k) => (
                  <li
                    key={k}
                    className="flex items-center justify-between rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-2 text-sm"
                  >
                    <span className="text-zinc-400">{ETIQUETA_CONTEO[k]}</span>
                    <span className="font-bold text-zinc-200">{conteo[k]}</span>
                  </li>
                ))}
            </ul>
            <p className="text-xs text-zinc-600">
              Esta acción no se puede deshacer localmente (queda recuperable en
              el historial de auditoría del servidor).
            </p>
          </>
        )}
      </div>
    </Dialog>
  );
};
