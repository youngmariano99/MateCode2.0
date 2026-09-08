"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Select } from "../select";
import { Textarea } from "../input";
import { Icono } from "../icons";
import { generarPromptPitchProspecto } from "../../../domain/prompts/generar-prompt-pitch-prospecto";
import { GestionarContactoFrioUseCase } from "../../../application/use-cases/crm/gestionar-contacto-frio.use-case";
import type { PotencialCliente } from "../../../domain/entidades/contacto-frio.entity";

const useCase = new GestionarContactoFrioUseCase();

interface PanelEnvioPitchProps {
  prospecto: PotencialCliente;
  /** Se dispara cuando el intento quedó registrado (para volver a la lista, etc). */
  onEnviado: () => void;
}

/**
 * Panel repetido en las estaciones "Hoy" y "Contactar": generar el prompt de
 * pitch, copiarlo, y registrar qué se mandó. Único lugar de verdad para este
 * flujo — antes estaba duplicado en ambas estaciones.
 */
export const PanelEnvioPitch: React.FC<PanelEnvioPitchProps> = ({
  prospecto,
  onEnviado,
}) => {
  const [canal, setCanal] = useState<
    "Instagram" | "WhatsApp" | "Email" | "Facebook"
  >("Instagram");
  const [mensaje, setMensaje] = useState("");
  const [prompt, setPrompt] = useState("");
  const [enviando, setEnviando] = useState(false);

  const ficha = useLiveQuery(
    () => db.ficha_digital.get(prospecto.id),
    [prospecto.id]
  );

  const generarPrompt = () => {
    setPrompt(
      generarPromptPitchProspecto(prospecto, {
        nombreDueño: ficha?.nombreDueño,
        dolorTags: ficha?.dolorTags || [],
        tieneWeb: ficha?.tieneWeb || "no",
        usaCatalogoNativoWhatsapp: ficha?.usaCatalogoNativoWhatsapp || false,
        notasExtra: ficha?.notasExtra,
        referenciaPosteo: ficha?.referenciaPosteo,
      })
    );
  };

  const copiarPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
  };

  const marcarEnviado = async () => {
    if (!mensaje.trim()) return;
    setEnviando(true);
    const res = await useCase.registrarIntento({
      potencialClienteId: prospecto.id,
      canal,
      mensajeEnviado: mensaje,
      resultado: "Sin respuesta",
      tagsResultado: [],
    });
    setEnviando(false);
    if (res.ok) {
      setMensaje("");
      setPrompt("");
      onEnviado();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="outline"
        icono={<Icono.Sparkles className="h-4 w-4" />}
        onClick={generarPrompt}
        className="self-start"
      >
        Generar prompt de pitch
      </Button>

      {prompt && (
        <div className="flex flex-col gap-2">
          <Textarea value={prompt} readOnly rows={8} />
          <Button
            variant="secondary"
            onClick={copiarPrompt}
            className="self-start"
          >
            Copiar prompt
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-[#2A2A2E] pt-4">
        <Select
          label="Canal"
          value={canal}
          onChange={(v) => setCanal(v as typeof canal)}
          options={[
            { value: "Instagram", label: "Instagram" },
            { value: "WhatsApp", label: "WhatsApp" },
            { value: "Email", label: "Email" },
            { value: "Facebook", label: "Facebook" },
          ]}
        />
        <Textarea
          label="Mensaje que mandaste"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Pegá acá el mensaje final que enviaste, para que quede guardado."
        />
        <Button
          onClick={marcarEnviado}
          cargando={enviando}
          disabled={!mensaje.trim()}
          className="self-end"
        >
          Marcar enviado
        </Button>
      </div>
    </div>
  );
};
