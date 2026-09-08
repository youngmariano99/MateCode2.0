"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Input } from "../input";
import { Button } from "../button";
import { Icono } from "../icons";
import { ModalImportarJson } from "./modal-importar-json";
import { GestionarContenidoUseCase } from "../../../application/use-cases/contenido/gestionar-contenido.use-case";

const useCase = new GestionarContenidoUseCase();

const PLANTILLA_EJEMPLO = JSON.stringify(
  [{ texto: "Idea de contenido acá", dolorSemana: "Ej: cuentas corrientes" }],
  null,
  2
);

const SIN_IDEAS: never[] = [];

/** Estación 1: captura rápida de ideas — backlog general, sin asignar a ninguna semana todavía. */
export const EstacionIdeas: React.FC = () => {
  const [texto, setTexto] = useState("");
  const [dolorSemana, setDolorSemana] = useState("");
  const [modalJsonAbierto, setModalJsonAbierto] = useState(false);

  const ideas =
    useLiveQuery(() =>
      db.idea_contenido.where("estado").equals("Backlog").toArray()
    ) || SIN_IDEAS;

  const agregar = async () => {
    if (!texto.trim()) return;
    const res = await useCase.crearIdea({ texto, dolorSemana });
    if (res.ok) {
      setTexto("");
      setDolorSemana("");
    }
  };

  const importarLote = async (items: unknown[]) => {
    for (const item of items) {
      const i = item as { texto?: string; dolorSemana?: string };
      if (i.texto) {
        await useCase.crearIdea({ texto: i.texto, dolorSemana: i.dolorSemana });
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
        <div className="flex gap-2">
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Idea de contenido..."
            className="flex-1"
          />
          <Input
            value={dolorSemana}
            onChange={(e) => setDolorSemana(e.target.value)}
            placeholder="Dolor de la semana (opcional)"
            className="w-64"
          />
          <Button
            onClick={agregar}
            disabled={!texto.trim()}
            icono={<Icono.Plus className="h-4 w-4" />}
          >
            Agregar
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={() => setModalJsonAbierto(true)}
          className="self-start px-0 text-xs"
        >
          Importar varias por JSON
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        {ideas.map((idea) => (
          <div
            key={idea.id}
            className="flex items-center justify-between rounded-xl border border-[#2A2A2E] bg-[#18181B] px-4 py-2.5"
          >
            <div className="flex flex-col">
              <span className="text-sm text-zinc-100">{idea.texto}</span>
              {idea.dolorSemana && (
                <span className="text-xs text-zinc-500">
                  {idea.dolorSemana}
                </span>
              )}
            </div>
          </div>
        ))}
        {ideas.length === 0 && (
          <span className="py-6 text-center text-sm text-zinc-600">
            Backlog vacío — agregá tu primera idea arriba.
          </span>
        )}
      </div>

      <ModalImportarJson
        abierto={modalJsonAbierto}
        onCerrar={() => setModalJsonAbierto(false)}
        titulo="Importar ideas por JSON"
        plantillaEjemplo={PLANTILLA_EJEMPLO}
        onImportar={importarLote}
      />
    </div>
  );
};
