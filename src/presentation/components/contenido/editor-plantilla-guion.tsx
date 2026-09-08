"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Dialog } from "../dialog";
import { Input } from "../input";
import { Select } from "../select";
import { Button } from "../button";
import { Icono } from "../icons";
import { GestionarContenidoUseCase } from "../../../application/use-cases/contenido/gestionar-contenido.use-case";
import type {
  GrupoSeccion,
  SeccionGuion,
} from "../../../domain/entidades/contenido.entity";

const useCase = new GestionarContenidoUseCase();

interface EditorPlantillaGuionProps {
  abierto: boolean;
  onCerrar: () => void;
}

/**
 * Un solo guardado, sin versionado: cada contenido guarda sus propios
 * valores (sección → texto), así que cambiar acá la estructura no rompe
 * el contenido ya creado con la estructura vieja.
 */
export const EditorPlantillaGuion: React.FC<EditorPlantillaGuionProps> = ({
  abierto,
  onCerrar,
}) => {
  const plantilla = useLiveQuery(() =>
    db.plantilla_guion.get("plantilla_default")
  );
  const [secciones, setSecciones] = useState<SeccionGuion[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Ajusta el estado durante el render, no en un useEffect (evita el render
  // extra en cascada) — mismo patrón que seccion-ficha-digital.tsx.
  const [plantillaSincronizada, setPlantillaSincronizada] = useState(plantilla);
  if (abierto && plantilla && plantilla !== plantillaSincronizada) {
    setPlantillaSincronizada(plantilla);
    setSecciones(plantilla.secciones.slice().sort((a, b) => a.orden - b.orden));
  }

  if (!abierto) return null;

  const actualizar = (id: string, cambios: Partial<SeccionGuion>) => {
    setSecciones((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...cambios } : s))
    );
  };

  const eliminar = (id: string) => {
    setSecciones((prev) => prev.filter((s) => s.id !== id));
  };

  const agregar = () => {
    setSecciones((prev) => [
      ...prev,
      {
        id: `seccion_${Date.now()}`,
        etiqueta: "Nueva sección",
        grupo: "extra",
        orden: prev.length + 1,
      },
    ]);
  };

  const guardar = async () => {
    setGuardando(true);
    await useCase.editarPlantillaGuion(
      secciones.map((s, i) => ({ ...s, orden: i + 1 }))
    );
    setGuardando(false);
    onCerrar();
  };

  return (
    <Dialog
      abierto={abierto}
      onClose={onCerrar}
      titulo="Estructura del guion"
      maxWidth="lg"
    >
      <div className="flex flex-col gap-3">
        {secciones.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <Input
              value={s.etiqueta}
              onChange={(e) => actualizar(s.id, { etiqueta: e.target.value })}
              className="flex-1"
            />
            <Select
              value={s.grupo}
              onChange={(v) => actualizar(s.id, { grupo: v as GrupoSeccion })}
              options={[
                { value: "principal", label: "Principal" },
                { value: "extra", label: "Extra" },
              ]}
              className="w-32"
            />
            <button
              onClick={() => eliminar(s.id)}
              className="p-2 text-zinc-500 hover:text-red-400"
            >
              <Icono.Trash className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Button
          variant="outline"
          onClick={agregar}
          icono={<Icono.Plus className="h-4 w-4" />}
          className="self-start"
        >
          Agregar sección
        </Button>
        <Button onClick={guardar} cargando={guardando} className="self-end">
          Guardar estructura
        </Button>
      </div>
    </Dialog>
  );
};
