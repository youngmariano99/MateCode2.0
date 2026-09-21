"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Textarea } from "../input";
import { Select } from "../select";
import { PanelRespuesta } from "./panel-respuesta";
import { CierreLead } from "./cierre-lead";
import {
  BotonPrompt,
  Chips,
  EnlacesProspecto,
  EstacionVacia,
  HistorialCompacto,
} from "./piezas-cinta";
import { ahoraMs, OPCIONES_CANAL, type Canal } from "./utilidades-cinta";
import { GestionarContactoFrioUseCase } from "../../../application/use-cases/crm/gestionar-contacto-frio.use-case";
import {
  DIAS_ENTRE_SEGUIMIENTOS,
  DIAS_HASTA_PRIMER_SEGUIMIENTO,
  historialParaPrompt,
  lineaDeSeguimiento,
  type ResumenProspecto,
} from "../../../domain/entidades/contacto-frio-cinta.entity";
import { generarPromptSeguimiento } from "../../../domain/prompts/generar-prompt-contacto-frio";
import {
  ETIQUETA_ACCION_PROXIMO_PASO,
  type AccionProximoPaso,
  type TipoEnvio,
} from "../../../domain/entidades/contacto-frio.entity";

const useCase = new GestionarContactoFrioUseCase();

const ACCIONES_DE_ENTREGA: Partial<
  Record<AccionProximoPaso, { tipo: TipoEnvio; texto: string }>
> = {
  mandar_demo: { tipo: "demo", texto: "Mandé la demo" },
  mandar_pack: { tipo: "pack", texto: "Mandé el pack de Excel" },
};

const OPCIONES_PROXIMO = [
  { valor: 2, etiqueta: "2 días" },
  { valor: 7, etiqueta: "7 días" },
  { valor: 14, etiqueta: "14 días" },
  { valor: 30, etiqueta: "30 días" },
];

const TarjetaSeguir: React.FC<{
  resumen: ResumenProspecto;
  cerrar: () => void;
}> = ({ resumen, cerrar }) => {
  const { prospecto } = resumen;
  const [canalElegido, setCanal] = useState<Canal | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [dias, setDias] = useState<number | undefined>(undefined);
  const [error, setError] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [respondio, setRespondio] = useState(false);

  const ficha = useLiveQuery(
    () => db.ficha_digital.get(prospecto.id),
    [prospecto.id]
  );

  const accion = prospecto.proximoPasoAccion;
  const entrega = accion ? ACCIONES_DE_ENTREGA[accion] : undefined;
  const ultimoCanal = resumen.intentos[resumen.intentos.length - 1]?.canal;
  const canal: Canal =
    canalElegido ??
    (ultimoCanal && ultimoCanal !== "Presencial" ? ultimoCanal : "Instagram");
  const cadencia =
    resumen.enviadosSinRespuesta + 1 <= 1
      ? DIAS_HASTA_PRIMER_SEGUIMIENTO
      : DIAS_ENTRE_SEGUIMIENTOS;
  const diasEfectivos = dias ?? cadencia;

  const generar = () =>
    generarPromptSeguimiento({
      prospecto,
      ficha,
      historial: historialParaPrompt(resumen.intentos),
      resumen: lineaDeSeguimiento(resumen, ahoraMs()),
      enviadosSinRespuesta: resumen.enviadosSinRespuesta,
      accionAcordada: accion ? ETIQUETA_ACCION_PROXIMO_PASO[accion] : undefined,
    });

  const yaLaMande = async () => {
    setError("");
    const texto =
      mensaje.trim() ||
      (entrega ? entrega.texto : accion === "llamar" ? "Lo llamé" : "");
    if (!texto)
      return setError("Pegá el mensaje que mandaste, para que quede guardado.");
    setTrabajando(true);
    const res = await useCase.registrarEnvio({
      potencialClienteId: prospecto.id,
      canal,
      mensaje: texto,
      tipoEnvio: entrega?.tipo ?? "seguimiento",
      diasHastaProximoToque: diasEfectivos,
    });
    setTrabajando(false);
    if (!res.ok) return setError(res.error!.mensaje);
    cerrar();
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6">
      <div>
        <h3 className="text-lg font-bold text-zinc-100">{prospecto.nombre}</h3>
        <p className="text-xs text-zinc-500">
          {lineaDeSeguimiento(resumen, ahoraMs())}
        </p>
        {accion && (
          <p className="mt-1 text-sm font-bold text-emerald-400">
            Acordado: {ETIQUETA_ACCION_PROXIMO_PASO[accion]}
            {prospecto.proximoPasoNota ? ` — ${prospecto.proximoPasoNota}` : ""}
          </p>
        )}
      </div>

      <EnlacesProspecto prospectoId={prospecto.id} />
      <HistorialCompacto intentos={resumen.intentos} />

      {respondio ? (
        <PanelRespuesta
          prospecto={prospecto}
          onListo={() => {
            setRespondio(false);
            cerrar();
          }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <BotonPrompt
            etiqueta="Copiar prompt de seguimiento"
            generar={generar}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]">
            <Select
              label="Canal"
              value={canal}
              onChange={(v) => setCanal(v as Canal)}
              options={OPCIONES_CANAL}
            />
            <Textarea
              label={
                entrega ? "Mensaje que mandé (opcional)" : "Mensaje que mandé"
              }
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={3}
              placeholder="Pegá el mensaje final que mandaste."
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
              Volver a hablarle en (por defecto {cadencia} días)
            </span>
            <Chips
              valor={diasEfectivos}
              onChange={setDias}
              opciones={OPCIONES_PROXIMO}
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={yaLaMande} cargando={trabajando}>
              {entrega ? "Ya la mandé" : "Ya lo mandé"}
            </Button>
            <Button variant="outline" onClick={() => setRespondio(true)}>
              Me respondió
            </Button>
          </div>
        </div>
      )}

      <CierreLead prospecto={prospecto} onCerrado={cerrar} />
    </div>
  );
};

/**
 * ② SEGUIR — los que ya recibieron mi mensaje. «Toca hoy» arriba; «En
 * espera» siempre a la vista con cuántas veces les escribí y hace cuánto,
 * para poder re-contactar aunque todavía no toque. Un lead sigue acá hasta
 * que decido pasarlo a Rechazado (o Cliente).
 */
export const EstacionSeguir: React.FC<{
  tocanHoy: ResumenProspecto[];
  esperando: ResumenProspecto[];
  irA: (n: 3) => void;
}> = ({ tocanHoy, esperando, irA }) => {
  const [activoId, setActivoId] = useState<string | null>(null);
  const [verEspera, setVerEspera] = useState(false);

  const todos = [...tocanHoy, ...esperando];
  const activo = todos.find((r) => r.prospecto.id === activoId);

  const fila = (r: ResumenProspecto) => (
    <button
      key={r.prospecto.id}
      onClick={() => setActivoId(r.prospecto.id)}
      className={`flex flex-col rounded-xl px-3 py-2 text-left transition-all ${
        activoId === r.prospecto.id
          ? "bg-emerald-500/10 text-emerald-300"
          : "text-zinc-300 hover:bg-[#18181B]"
      }`}
    >
      <span className="text-sm font-bold">{r.prospecto.nombre}</span>
      <span className="text-xs text-zinc-500">
        {lineaDeSeguimiento(r, ahoraMs())}
        {r.prospecto.proximoPasoAccion
          ? ` · ${ETIQUETA_ACCION_PROXIMO_PASO[r.prospecto.proximoPasoAccion]}`
          : ""}
      </span>
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      {tocanHoy.length === 0 && (
        <EstacionVacia
          mensaje="Nadie a quien seguir hoy."
          siguiente={{ etiqueta: "Pasar a ③ Abrir", ir: () => irA(3) }}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-1">
          {tocanHoy.length > 0 && (
            <span className="px-3 text-xs font-bold tracking-wider text-zinc-500 uppercase">
              Toca hoy ({tocanHoy.length})
            </span>
          )}
          {tocanHoy.map(fila)}

          {esperando.length > 0 && (
            <button
              onClick={() => setVerEspera((v) => !v)}
              className="mt-2 px-3 py-1 text-left text-xs font-bold tracking-wider text-zinc-500 uppercase hover:text-zinc-300"
            >
              {verEspera ? "▾" : "▸"} En espera ({esperando.length})
            </button>
          )}
          {verEspera && esperando.map(fila)}
        </div>

        {activo ? (
          <TarjetaSeguir
            key={activo.prospecto.id}
            resumen={activo}
            cerrar={() => setActivoId(null)}
          />
        ) : (
          tocanHoy.length > 0 && (
            <div className="rounded-2xl border border-dashed border-[#2A2A2E] p-6 text-sm text-zinc-600">
              Elegí uno de la lista.
            </div>
          )
        )}
      </div>
    </div>
  );
};
