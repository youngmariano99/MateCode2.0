"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Input } from "../input";
import { Button } from "../button";
import { GestionarContactoFrioUseCase } from "../../../application/use-cases/crm/gestionar-contacto-frio.use-case";

const useCase = new GestionarContactoFrioUseCase();

interface SeccionFichaFisicaProps {
  potencialClienteId: string;
}

/** Dirección/coordenadas, agregadas solo cuando corresponde visitar en persona. */
export const SeccionFichaFisica: React.FC<SeccionFichaFisicaProps> = ({
  potencialClienteId,
}) => {
  const fichaFisica = useLiveQuery(
    () => db.ficha_fisica.get(potencialClienteId),
    [potencialClienteId]
  );

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [direccionCalle, setDireccionCalle] = useState("");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!direccionCalle.trim()) return;
    setGuardando(true);
    await useCase.agregarFichaFisica(potencialClienteId, { direccionCalle });
    setGuardando(false);
    setMostrarFormulario(false);
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-[#2A2A2E] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Ficha física
        </h3>
        {!fichaFisica && !mostrarFormulario && (
          <Button
            variant="outline"
            className="px-3 py-1.5 text-xs"
            onClick={() => setMostrarFormulario(true)}
          >
            Agregar (visita presencial)
          </Button>
        )}
      </div>
      {fichaFisica ? (
        <span className="text-sm text-zinc-300">
          {fichaFisica.direccionCalle} {fichaFisica.direccionCiudad}
        </span>
      ) : mostrarFormulario ? (
        <div className="flex gap-2">
          <Input
            value={direccionCalle}
            onChange={(e) => setDireccionCalle(e.target.value)}
            placeholder="Dirección"
            className="flex-1"
          />
          <Button onClick={guardar} cargando={guardando}>
            Guardar
          </Button>
        </div>
      ) : (
        <span className="text-sm text-zinc-600">
          Sin dirección cargada — solo hace falta si vas a visitarlo
          presencialmente.
        </span>
      )}
    </section>
  );
};
