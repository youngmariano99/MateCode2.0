"use client";

import React, { useState } from "react";
import { Input } from "../input";
import { Select } from "../select";
import { Button } from "../button";
import { Icono } from "../icons";
import { GestionarContactoFrioUseCase } from "../../../application/use-cases/crm/gestionar-contacto-frio.use-case";

const useCase = new GestionarContactoFrioUseCase();

/**
 * Estación 1: alta rápida. Lo mínimo para no frenar el ritmo de
 * prospección — nombre, rubro y prioridad, más redes sociales opcionales
 * (para tener el link a mano de una, sin tener que volver después). Los
 * dolores detectados y la dirección física siguen quedando para después,
 * cuando corresponda.
 */
export const RegistroProspecto: React.FC = () => {
  const [nombre, setNombre] = useState("");
  const [rubro, setRubro] = useState("");
  const [prioridad, setPrioridad] = useState<"Alta" | "Media" | "Baja">(
    "Media"
  );
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [facebook, setFacebook] = useState("");
  const [email, setEmail] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [confirmacion, setConfirmacion] = useState(false);

  const limpiar = () => {
    setNombre("");
    setRubro("");
    setPrioridad("Media");
    setInstagram("");
    setWhatsapp("");
    setFacebook("");
    setEmail("");
  };

  const guardar = async () => {
    setError("");
    setGuardando(true);
    const res = await useCase.crearProspecto({ nombre, rubro, prioridad });
    if (!res.ok) {
      setGuardando(false);
      setError(res.error!.mensaje);
      return;
    }
    if (instagram || whatsapp || facebook || email) {
      await useCase.calificarFichaDigital(res.valor, {
        instagram,
        whatsapp,
        facebook,
        email,
        dolorTags: [],
        tieneWeb: "no",
        usaCatalogoNativoWhatsapp: false,
      });
    }
    setGuardando(false);
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

      <div className="flex flex-col gap-3 border-t border-[#2A2A2E] pt-3">
        <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          Redes sociales (opcional)
        </span>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Instagram"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@negocio"
          />
          <Input
            label="WhatsApp"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+549..."
          />
          <Input
            label="Facebook"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            placeholder="Enlace"
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

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
