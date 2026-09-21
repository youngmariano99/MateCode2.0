"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Textarea } from "../input";
import { Badge } from "../badge";
import { BotonPrompt } from "./piezas-cinta";
import { RegistroProspecto } from "./registro-prospecto";
import { GestionarContactoFrioUseCase } from "../../../application/use-cases/crm/gestionar-contacto-frio.use-case";
import {
  parsearCalificacionIA,
  type ProspectoIA,
} from "../../../domain/entidades/contacto-frio-ia.entity";
import { generarPromptCalificar } from "../../../domain/prompts/generar-prompt-contacto-frio";

const useCase = new GestionarContactoFrioUseCase();

/**
 * ④ REPONER — mantener el stock de prospectos nuevos. Se copia lo que se ve
 * de uno o varios perfiles (bio, posteos, notas), el prompt lo califica y
 * devuelve la ficha lista; acá se pega y se cargan todos juntos. También se
 * puede cargar a mano.
 */
export const EstacionReponer: React.FC<{ stock: number }> = ({ stock }) => {
  const [info, setInfo] = useState("");
  const [json, setJson] = useState("");
  const [leidos, setLeidos] = useState<ProspectoIA[] | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const etiquetas =
    useLiveQuery(
      () => db.catalogo_etiquetas.where("categoria").equals("dolor").toArray(),
      []
    ) ?? [];

  const leer = () => {
    setError("");
    setMensaje("");
    const res = parsearCalificacionIA(json);
    if (!res.ok) {
      setLeidos(null);
      return setError(res.error);
    }
    setLeidos(res.data.prospectos);
  };

  const cargar = async () => {
    if (!leidos) return;
    setTrabajando(true);
    const res = await useCase.importarProspectos(leidos);
    setTrabajando(false);
    if (!res.ok) return setError(res.error!.mensaje);
    const r = res.valor!;
    setMensaje(
      `Se cargaron ${r.creados}` +
        (r.duplicados ? ` · ${r.duplicados} ya existían` : "") +
        (r.noCalifican ? ` · ${r.noCalifican} no calificaban` : "") +
        "."
    );
    setLeidos(null);
    setJson("");
    setInfo("");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-[#2A2A2E] bg-[#18181B] px-4 py-3 text-sm text-zinc-300">
        Stock de prospectos nuevos:{" "}
        <span className="font-bold text-zinc-100">{stock}</span>
        <span className="ml-2 text-xs text-zinc-500">
          Reponé cuando queden menos que tu objetivo diario.
        </span>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6">
        <h3 className="text-sm font-bold tracking-wider text-zinc-400 uppercase">
          Con ayuda de tu IA
        </h3>
        <Textarea
          label="① Pegá lo que copiaste de los perfiles (bio, posteos, notas)"
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          rows={5}
          placeholder="Podés pegar varios comercios juntos, uno atrás del otro."
        />
        <BotonPrompt
          etiqueta="② Copiar prompt de calificación"
          deshabilitado={!info.trim()}
          generar={() =>
            generarPromptCalificar({
              etiquetasDolor: etiquetas.map((e) => e.etiqueta),
              infoPegada: info,
            })
          }
        />
        <Textarea
          label="③ Pegá lo que devolvió la IA (JSON)"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={4}
        />
        <Button
          variant="secondary"
          onClick={leer}
          disabled={!json.trim()}
          className="self-start"
        >
          Leer respuesta de la IA
        </Button>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {mensaje && <p className="text-xs text-emerald-400">{mensaje}</p>}

        {leidos && (
          <div className="flex flex-col gap-2">
            {leidos.map((p, i) => (
              <div
                key={`${p.nombre}-${i}`}
                className="flex items-center justify-between rounded-xl border border-[#2A2A2E] bg-[#111113] px-3 py-2 text-sm"
              >
                <span className="text-zinc-200">
                  {p.nombre}
                  {p.rubro ? ` · ${p.rubro}` : ""}
                </span>
                <Badge color={p.califica ? "emerald" : "zinc"}>
                  {p.califica ? "Califica" : "No califica"}
                </Badge>
              </div>
            ))}
            <Button
              onClick={cargar}
              cargando={trabajando}
              className="self-start"
            >
              Cargar {leidos.filter((p) => p.califica).length} prospecto(s)
            </Button>
          </div>
        )}
      </div>

      <details className="rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
        <summary className="cursor-pointer text-sm font-bold text-zinc-300">
          O cargar uno a mano
        </summary>
        <div className="mt-4">
          <RegistroProspecto />
        </div>
      </details>
    </div>
  );
};
