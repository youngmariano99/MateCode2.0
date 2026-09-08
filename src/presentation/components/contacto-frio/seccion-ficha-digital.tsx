"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Input } from "../input";
import { Select } from "../select";
import { Button } from "../button";
import { SelectorEtiquetas } from "./selector-etiquetas";
import { GestionarContactoFrioUseCase } from "../../../application/use-cases/crm/gestionar-contacto-frio.use-case";
import type { TieneWebOpcion } from "../../../domain/entidades/contacto-frio.entity";

const useCase = new GestionarContactoFrioUseCase();

interface SeccionFichaDigitalProps {
  potencialClienteId: string;
}

export const SeccionFichaDigital: React.FC<SeccionFichaDigitalProps> = ({
  potencialClienteId,
}) => {
  const ficha = useLiveQuery(
    () => db.ficha_digital.get(potencialClienteId),
    [potencialClienteId]
  );

  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [nombreDueño, setNombreDueño] = useState("");
  const [dolorTags, setDolorTags] = useState<string[]>([]);
  const [tieneWeb, setTieneWeb] = useState<TieneWebOpcion>("no");
  const [notasExtra, setNotasExtra] = useState("");
  const [referenciaPosteo, setReferenciaPosteo] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Ajusta el formulario cuando cambia el prospecto o llega la ficha desde
  // Dexie — durante el render, no en un useEffect (evita el render extra en
  // cascada). Ver nota equivalente en modal-detalle-prospecto.tsx.
  const [idSincronizado, setIdSincronizado] = useState<string | null>(null);
  const [fichaSincronizada, setFichaSincronizada] = useState(ficha);
  if (potencialClienteId !== idSincronizado || ficha !== fichaSincronizada) {
    setIdSincronizado(potencialClienteId);
    setFichaSincronizada(ficha);
    setInstagram(ficha?.instagram || "");
    setWhatsapp(ficha?.whatsapp || "");
    setNombreDueño(ficha?.nombreDueño || "");
    setDolorTags(ficha?.dolorTags || []);
    setTieneWeb(ficha?.tieneWeb || "no");
    setNotasExtra(ficha?.notasExtra || "");
    setReferenciaPosteo(ficha?.referenciaPosteo || "");
  }

  const guardar = async () => {
    setGuardando(true);
    await useCase.calificarFichaDigital(potencialClienteId, {
      instagram,
      whatsapp,
      nombreDueño,
      dolorTags,
      tieneWeb,
      usaCatalogoNativoWhatsapp: ficha?.usaCatalogoNativoWhatsapp || false,
      notasExtra,
      referenciaPosteo,
    });
    setGuardando(false);
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-[#2A2A2E] p-4">
      <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
        Ficha digital
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Instagram"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
        />
        <Input
          label="WhatsApp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />
      </div>
      <Input
        label="Nombre del dueño/encargado"
        value={nombreDueño}
        onChange={(e) => setNombreDueño(e.target.value)}
      />
      <SelectorEtiquetas
        label="Dolores detectados"
        categoria="dolor"
        value={dolorTags}
        onChange={setDolorTags}
      />
      <Select
        label="¿Tiene web/catálogo online?"
        value={tieneWeb}
        onChange={(v) => setTieneWeb(v as TieneWebOpcion)}
        options={[
          { value: "no", label: "No tiene" },
          {
            value: "caida_desactualizada",
            label: "Tiene, pero caída/desactualizada",
          },
          { value: "activa", label: "Tiene, activa" },
        ]}
      />
      <Input
        label="Referencia (posteo/historia que viste)"
        value={referenciaPosteo}
        onChange={(e) => setReferenciaPosteo(e.target.value)}
      />
      <Input
        label="Notas extra"
        value={notasExtra}
        onChange={(e) => setNotasExtra(e.target.value)}
      />
      <Button onClick={guardar} cargando={guardando} className="self-end">
        Guardar ficha
      </Button>
    </section>
  );
};
