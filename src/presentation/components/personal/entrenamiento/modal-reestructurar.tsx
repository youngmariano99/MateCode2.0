"use client";

import React, { useState } from "react";
import { db } from "../../../../offline/dexie/db";
import { Dialog } from "../../dialog";
import { Button } from "../../button";
import { Textarea } from "../../input";
import { BotonPrompt } from "../../contacto-frio/piezas-cinta";
import { ImportarBloqueEntrenamientoUseCase } from "../../../../application/use-cases/personal/importar-bloque-entrenamiento.use-case";
import { armarContextoReestructuracion } from "../../../../application/servicios/armar-contexto-entrenamiento.service";
import { generarPromptReestructurar } from "../../../../domain/prompts/generar-prompt-entrenamiento";
import { extraerJson } from "../../../../domain/entidades/contacto-frio-ia.entity";
import { obtenerDiaTareaHoy } from "../../../../domain/entidades/personal.entity";

const importarUseCase = new ImportarBloqueEntrenamientoUseCase();

/**
 * Reestructurar los bloques vigentes con IA: se arma un prompt con TODO el
 * contexto (planes, progresiones, qué se hizo y qué no, decisiones ya
 * tomadas) más lo que el usuario quiere cambiar; la IA devuelve un JSON con
 * los bloques y sus cambios, y al aplicarlo REEMPLAZA los bloques que se
 * llamen igual (sin tocar las sesiones ya registradas; el estado anterior
 * queda en el historial).
 */
export const ModalReestructurar: React.FC<{
  abierto: boolean;
  onCerrar: () => void;
}> = ({ abierto, onCerrar }) => {
  const [pedido, setPedido] = useState("");
  const [prompt, setPrompt] = useState("");
  const [json, setJson] = useState("");
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState("");
  const [aplicando, setAplicando] = useState(false);

  const armar = async () => {
    const [catalogo, equipamiento, contexto] = await Promise.all([
      db.catalogo_ejercicio.toArray(),
      db.catalogo_etiquetas
        .where("categoria")
        .equals("equipamiento_propio")
        .toArray(),
      armarContextoReestructuracion(obtenerDiaTareaHoy()),
    ]);
    setPrompt(
      generarPromptReestructurar(
        catalogo,
        equipamiento.map((e) => e.etiqueta),
        contexto,
        pedido
      )
    );
  };

  const aplicar = async () => {
    setError("");
    setResultado("");
    let crudo: unknown;
    try {
      crudo = extraerJson(json);
    } catch (e) {
      return setError(e instanceof Error ? e.message : "No pude leer el JSON.");
    }
    const items = Array.isArray(crudo) ? crudo : [crudo];
    setAplicando(true);
    const res = await importarUseCase.reestructurarBloques(items);
    setAplicando(false);
    if (!res.ok) return setError(res.error!.mensaje);
    setResultado(res.valor!);
    setJson("");
  };

  return (
    <Dialog
      abierto={abierto}
      onClose={onCerrar}
      titulo="Reestructurar bloques con IA"
      maxWidth="xl"
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-zinc-500">
          La IA recibe el plan de todos tus bloques vigentes, lo que hiciste y
          lo que no, y lo que le pidas acá. Lo que devuelva reemplaza a los
          bloques con el mismo nombre (las sesiones ya registradas no se tocan y
          lo anterior queda en el historial).
        </p>
        <Textarea
          label="① ¿Qué querés cambiar?"
          value={pedido}
          onChange={(e) => setPedido(e.target.value)}
          rows={4}
          placeholder="Ej: La primera semana fue muy fácil, quiero más progresión en fuerza. Los viernes no llego: pasá esa rutina a los sábados. Agregá una semana de descarga antes del último bloque."
        />
        <Button variant="outline" onClick={armar} className="self-start">
          ② Armar el prompt con todo el contexto
        </Button>
        {prompt && (
          <BotonPrompt etiqueta="Copiar prompt" generar={() => prompt} />
        )}
        <Textarea
          label="③ Pegá el JSON que devolvió la IA"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={6}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {resultado && <p className="text-xs text-emerald-400">{resultado}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCerrar}
            className="text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
          >
            Cerrar
          </button>
          <Button
            onClick={aplicar}
            cargando={aplicando}
            disabled={!json.trim()}
          >
            ④ Aplicar (reemplaza los bloques con el mismo nombre)
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
