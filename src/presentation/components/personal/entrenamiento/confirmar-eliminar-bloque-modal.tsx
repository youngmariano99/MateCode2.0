"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Dialog } from "../../dialog";
import { Button } from "../../button";
import { useToast } from "../../../hooks/useToast";
import { GestionarBloquesUseCase } from "../../../../application/use-cases/personal/gestionar-bloques.use-case";
import type { BloqueEntrenamiento } from "../../../../domain/entidades/rutina.entity";

const useCase = new GestionarBloquesUseCase();

interface ConfirmarEliminarBloqueModalProps {
  abierto: boolean;
  onCerrar: () => void;
  bloque: BloqueEntrenamiento;
  onEliminado: () => void;
}

/**
 * Borrado de Bloque — SIEMPRE soft delete (GestionarBloquesUseCase nunca
 * toca RegistroActividad), pero igual muestra el conteo real de sesiones ya
 * hechas antes de confirmar, mismo criterio que ConfirmarEliminacionNodo en
 * el módulo Personal: nunca un confirm() genérico sin números reales.
 */
export const ConfirmarEliminarBloqueModal: React.FC<
  ConfirmarEliminarBloqueModalProps
> = ({ abierto, onCerrar, bloque, onEliminado }) => {
  const { mostrarToast } = useToast();
  const [eliminando, setEliminando] = useState(false);
  const sesiones = useLiveQuery(
    () => db.registro_actividad.where("bloqueId").equals(bloque.id).count(),
    [bloque.id]
  );

  const confirmar = async () => {
    setEliminando(true);
    const res = await useCase.eliminarBloque(bloque.id);
    setEliminando(false);
    if (res.ok) {
      mostrarToast("Bloque eliminado.", "exito");
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
      titulo={`Eliminar "${bloque.nombre}"`}
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
            disabled={sesiones === undefined}
          >
            Eliminar bloque
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2 text-sm text-zinc-300">
        {sesiones === undefined ? (
          <span className="text-zinc-500">Calculando...</span>
        ) : sesiones > 0 ? (
          <p>
            Este bloque tiene <strong>{sesiones}</strong> sesión
            {sesiones === 1 ? "" : "es"} registrada{sesiones === 1 ? "" : "s"}.
            No se van a borrar — el bloque solo deja de verse en la lista, las
            estadísticas ya hechas quedan intactas.
          </p>
        ) : (
          <p>Este bloque todavía no tiene ninguna sesión registrada.</p>
        )}
      </div>
    </Dialog>
  );
};
