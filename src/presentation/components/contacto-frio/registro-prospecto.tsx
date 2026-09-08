"use client";

import React, { useState } from "react";
import { Input } from "../input";
import { Select } from "../select";
import { Button } from "../button";
import { Icono } from "../icons";
import { GestionarContactoFrioUseCase } from "../../../application/use-cases/crm/gestionar-contacto-frio.use-case";

const useCase = new GestionarContactoFrioUseCase();

/**
 * Estación 1: alta rápida. Solo lo mínimo para no frenar el ritmo de
 * prospección — nombre, rubro y prioridad. Todo lo demás (redes, dolores,
 * dirección física) se agrega después, cuando corresponda, no acá.
 */
export const RegistroProspecto: React.FC = () => {
  const [nombre, setNombre] = useState("");
  const [rubro, setRubro] = useState("");
  const [prioridad, setPrioridad] = useState<"Alta" | "Media" | "Baja">(
    "Media"
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [confirmacion, setConfirmacion] = useState(false);

  const limpiar = () => {
    setNombre("");
    setRubro("");
    setPrioridad("Media");
  };

  const guardar = async () => {
    setError("");
    setGuardando(true);
    const res = await useCase.crearProspecto({ nombre, rubro, prioridad });
    setGuardando(false);
    if (!res.ok) {
      setError(res.error!.mensaje);
      return;
    }
    limpiar();
    setConfirmacion(true);
    setTimeout(() => setConfirmacion(false), 1500);
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6">
      <h2 className="text-sm font-bold tracking-wider text-zinc-400 uppercase">
        Registrar prospecto
      </h2>
      <Input
        label="Nombre del comercio"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: Librería Arcoiris"
        autoFocus
      />
      <Input
        label="Rubro"
        value={rubro}
        onChange={(e) => setRubro(e.target.value)}
        placeholder="Ej: Librería, indumentaria, juguetería..."
      />
      <Select
        label="Prioridad"
        value={prioridad}
        onChange={(v) => setPrioridad(v as "Alta" | "Media" | "Baja")}
        options={[
          { value: "Alta", label: "Alta" },
          { value: "Media", label: "Media" },
          { value: "Baja", label: "Baja" },
        ]}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
      <Button
        onClick={guardar}
        cargando={guardando}
        disabled={!nombre.trim()}
        icono={<Icono.Plus className="h-4 w-4" />}
      >
        {confirmacion ? "Registrado" : "Registrar"}
      </Button>
    </div>
  );
};
