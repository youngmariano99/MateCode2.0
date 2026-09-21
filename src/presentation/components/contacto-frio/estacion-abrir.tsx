"use client";

import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Input, Textarea } from "../input";
import { Select } from "../select";
import { Icono } from "../icons";
import { BotonPrompt, EnlacesProspecto, EstacionVacia } from "./piezas-cinta";
import { ahoraMs, OPCIONES_CANAL, type Canal } from "./utilidades-cinta";
import { useConfiguracionStore } from "../../stores/configuracion.store";
import { GestionarContactoFrioUseCase } from "../../../application/use-cases/crm/gestionar-contacto-frio.use-case";
import { inicioDelDia } from "../../../domain/entidades/contacto-frio-cinta.entity";
import { generarPromptApertura } from "../../../domain/prompts/generar-prompt-contacto-frio";
import type {
  IntentoContacto,
  PotencialCliente,
} from "../../../domain/entidades/contacto-frio.entity";

const useCase = new GestionarContactoFrioUseCase();
const SIN_INTENTOS: IntentoContacto[] = [];

const TarjetaAbrir: React.FC<{
  prospecto: PotencialCliente;
  cerrar: () => void;
}> = ({ prospecto, cerrar }) => {
  const [canal, setCanal] = useState<Canal>("Instagram");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const ficha = useLiveQuery(
    () => db.ficha_digital.get(prospecto.id),
    [prospecto.id]
  );

  const enviar = async () => {
    setError("");
    setTrabajando(true);
    const res = await useCase.registrarEnvio({
      potencialClienteId: prospecto.id,
      canal,
      mensaje,
      tipoEnvio: "apertura",
    });
    setTrabajando(false);
    if (!res.ok) return setError(res.error!.mensaje);
    cerrar();
  };

  const noSirve = async () => {
    setTrabajando(true);
    await useCase.descartarLead(prospecto.id, ["No es su perfil"]);
    setTrabajando(false);
    cerrar();
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6">
      <div>
        <h3 className="text-lg font-bold text-zinc-100">{prospecto.nombre}</h3>
        <p className="text-xs text-zinc-500">
          {[prospecto.rubro, ficha?.dolorTags?.join(", ")]
            .filter(Boolean)
            .join(" · ") || "Sin datos de ficha"}
        </p>
        {ficha?.referenciaPosteo && (
          <p className="mt-1 text-xs text-zinc-400">
            Posteo que vi: {ficha.referenciaPosteo}
          </p>
        )}
      </div>

      <EnlacesProspecto prospectoId={prospecto.id} />

      <BotonPrompt
        etiqueta="Copiar prompt de apertura"
        generar={() => generarPromptApertura({ prospecto, ficha })}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]">
        <Select
          label="Canal"
          value={canal}
          onChange={(v) => setCanal(v as Canal)}
          options={OPCIONES_CANAL}
        />
        <Textarea
          label="Mensaje que mandé"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={3}
          placeholder="Pegá el mensaje final que mandaste."
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={enviar} cargando={trabajando}>
          Ya lo mandé
        </Button>
        <Button variant="ghost" onClick={noSirve} disabled={trabajando}>
          No sirve, descartar
        </Button>
      </div>
    </div>
  );
};

/**
 * ③ ABRIR — la cuota diaria de aperturas: prospectos nuevos a los que todavía
 * no se les escribió. Se cuentan solo las aperturas (no los seguimientos ni
 * las respuestas).
 */
export const EstacionAbrir: React.FC<{
  nuevos: PotencialCliente[];
  irA: (n: 4) => void;
}> = ({ nuevos, irA }) => {
  const objetivo = useConfiguracionStore((s) => s.objetivoDiarioContactos);
  const setObjetivo = useConfiguracionStore(
    (s) => s.setObjetivoDiarioContactos
  );
  const [verMas, setVerMas] = useState(false);
  const [activoId, setActivoId] = useState<string | null>(null);

  const intentos =
    useLiveQuery(() => db.intento_contacto.toArray(), []) ?? SIN_INTENTOS;

  const aperturasHoy = useMemo(() => {
    const inicio = inicioDelDia(ahoraMs());
    return intentos.filter(
      (i) =>
        i.fecha >= inicio &&
        (i.tipoEnvio === "apertura" ||
          (!i.tipoEnvio && !!i.mensajeEnviado?.trim()))
    ).length;
  }, [intentos]);

  const restante = Math.max(objetivo - aperturasHoy, 0);
  const visibles = verMas ? nuevos : nuevos.slice(0, restante);
  const activo = nuevos.find((p) => p.id === activoId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-2xl border border-[#2A2A2E] bg-[#18181B] px-4 py-3">
        <span className="text-sm font-bold text-zinc-200">
          {aperturasHoy} / {objetivo} aperturas de hoy
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Objetivo diario:</span>
          <Input
            type="number"
            min={1}
            value={objetivo}
            onChange={(e) =>
              setObjetivo(Math.max(1, Number(e.target.value) || 1))
            }
            className="w-16 py-1.5 text-center"
          />
        </div>
      </div>

      {nuevos.length === 0 ? (
        <EstacionVacia
          mensaje="No hay prospectos nuevos para abrir."
          siguiente={{ etiqueta: "Pasar a ④ Reponer", ir: () => irA(4) }}
        />
      ) : visibles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-10 text-center">
          <Icono.Check className="h-8 w-8 text-emerald-400" />
          <span className="font-bold text-zinc-100">
            Ya hiciste las {objetivo} aperturas de hoy.
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setVerMas(true)}>
              ¿Seguir con más?
            </Button>
            <Button variant="ghost" onClick={() => irA(4)}>
              Pasar a ④ Reponer
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
          <div className="flex flex-col gap-1">
            {visibles.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivoId(p.id)}
                className={`rounded-xl px-3 py-2 text-left text-sm transition-all ${
                  activoId === p.id
                    ? "bg-emerald-500/10 font-bold text-emerald-400"
                    : "text-zinc-300 hover:bg-[#18181B]"
                }`}
              >
                {p.nombre}
              </button>
            ))}
          </div>
          {activo ? (
            <TarjetaAbrir
              key={activo.id}
              prospecto={activo}
              cerrar={() => setActivoId(null)}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-[#2A2A2E] p-6 text-sm text-zinc-600">
              Elegí uno de la lista.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
