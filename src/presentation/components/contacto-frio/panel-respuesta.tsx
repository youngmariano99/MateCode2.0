"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Input, Textarea } from "../input";
import { Select } from "../select";
import {
  BotonPrompt,
  Chips,
  EnlacesProspecto,
  HistorialCompacto,
  OPCIONES_DIAS,
} from "./piezas-cinta";
import { OPCIONES_CANAL, type Canal } from "./utilidades-cinta";
import { GestionarContactoFrioUseCase } from "../../../application/use-cases/crm/gestionar-contacto-frio.use-case";
import {
  aprendizajeAcumulado,
  esRecepcion,
  historialParaPrompt,
  resumirProspecto,
} from "../../../domain/entidades/contacto-frio-cinta.entity";
import { parsearRespuestaIA } from "../../../domain/entidades/contacto-frio-ia.entity";
import { generarPromptResponder } from "../../../domain/prompts/generar-prompt-contacto-frio";
import {
  ACCIONES_PROXIMO_PASO,
  ETIQUETA_ACCION_PROXIMO_PASO,
  ETIQUETA_TIPO_DATO,
  TIPOS_DATO,
  type AccionProximoPaso,
  type Aprendizaje,
  type PotencialCliente,
} from "../../../domain/entidades/contacto-frio.entity";
import { ahoraMs } from "./utilidades-cinta";

const useCase = new GestionarContactoFrioUseCase();

const CAMPOS_APRENDIZAJE: { clave: keyof Aprendizaje; etiqueta: string }[] = [
  { clave: "citaDolor", etiqueta: "Su frase sobre el problema" },
  { clave: "casoPasado", etiqueta: "Caso concreto (la última vez que pasó)" },
  { clave: "comoLoResuelve", etiqueta: "Cómo lo resuelve hoy" },
  { clave: "costo", etiqueta: "Cuánto le cuesta (tiempo / plata)" },
  { clave: "compromiso", etiqueta: "Qué puso en juego" },
];

/**
 * Cuando hay algo de este lead para contestar. Dos caminos:
 *  · "Me escribió": pegás lo que dijo → copiás el prompt → pegás el JSON de
 *    la IA (o escribís a mano) → editás el borrador → "Ya respondí".
 *  · "Ya hablamos / quedamos en algo": para cuando se resolvió fuera de la
 *    app — anotás en qué quedaron y para cuándo, sin pegar la conversación.
 */
export const PanelRespuesta: React.FC<{
  prospecto: PotencialCliente;
  onListo: () => void;
}> = ({ prospecto, onListo }) => {
  const [modo, setModo] = useState<"escribio" | "quedamos">("escribio");

  const intentos =
    useLiveQuery(
      () =>
        db.intento_contacto
          .where("potencialClienteId")
          .equals(prospecto.id)
          .toArray(),
      [prospecto.id]
    ) ?? [];
  const ficha = useLiveQuery(
    () => db.ficha_digital.get(prospecto.id),
    [prospecto.id]
  );

  // Su último mensaje ya guardado y sin contestar (si lo hay).
  const resumen = resumirProspecto(prospecto, intentos, ahoraMs());
  const pendiente =
    resumen.pelota === "mia"
      ? [...intentos]
          .filter((i) => esRecepcion(i) && i.respuestaTexto?.trim())
          .sort((a, b) => b.fecha - a.fecha)[0]
      : undefined;

  const [canalElegido, setCanal] = useState<Canal | null>(null);
  const [textoEditado, setTexto] = useState<string | null>(null);
  const [json, setJson] = useState("");
  const [lectura, setLectura] = useState("");
  const [borrador, setBorrador] = useState("");
  const [aprendizaje, setAprendizaje] = useState<Aprendizaje>({});
  const [accion, setAccion] = useState<AccionProximoPaso>("seguir");
  const [dias, setDias] = useState(2);
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const ultimoCanal = [...intentos].sort((a, b) => b.fecha - a.fecha)[0]?.canal;
  const canal: Canal =
    canalElegido ??
    (ultimoCanal && ultimoCanal !== "Presencial" ? ultimoCanal : "Instagram");
  const texto = textoEditado ?? pendiente?.respuestaTexto ?? "";
  const yaGuardado = !!pendiente && texto === pendiente.respuestaTexto;

  const leerIA = () => {
    setError("");
    const res = parsearRespuestaIA(json);
    if (!res.ok) return setError(res.error);
    setBorrador(res.data.borradorRespuesta);
    setLectura(res.data.lectura ?? "");
    setAprendizaje({ ...res.data.aprendizaje, tipoDato: res.data.tipoDato });
    if (res.data.proximoPaso) {
      setAccion(res.data.proximoPaso.accion);
      if (res.data.proximoPaso.dias !== undefined)
        setDias(res.data.proximoPaso.dias);
      if (res.data.proximoPaso.nota) setNota(res.data.proximoPaso.nota);
    }
  };

  const generarPrompt = () =>
    generarPromptResponder({
      prospecto,
      ficha,
      historial: historialParaPrompt(
        yaGuardado ? intentos.filter((i) => i.id !== pendiente?.id) : intentos
      ),
      resumen: `${resumen.totalEnviados} mensaje(s) tuyo(s) hasta ahora`,
      aprendizaje: aprendizajeAcumulado(intentos),
      loQueEscribio: texto.trim() || "(pegá acá lo que te escribió)",
    });

  const guardarSoloSuMensaje = async () => {
    setTrabajando(true);
    setError("");
    const res = await useCase.registrarRespuestaRecibida({
      potencialClienteId: prospecto.id,
      canal,
      respuestaTexto: texto,
    });
    setTrabajando(false);
    if (!res.ok) return setError(res.error!.mensaje);
    onListo();
  };

  const yaRespondi = async () => {
    setError("");
    if (!borrador.trim()) {
      return setError("Pegá (o escribí) lo que le respondiste.");
    }
    setTrabajando(true);
    if (!yaGuardado) {
      const rec = await useCase.registrarRespuestaRecibida({
        potencialClienteId: prospecto.id,
        canal,
        respuestaTexto: texto,
      });
      if (!rec.ok) {
        setTrabajando(false);
        return setError(rec.error!.mensaje);
      }
    }
    const limpio = Object.fromEntries(
      Object.entries(aprendizaje).filter(([, v]) => v)
    ) as Aprendizaje;
    const res = await useCase.registrarEnvio({
      potencialClienteId: prospecto.id,
      canal,
      mensaje: borrador,
      tipoEnvio: "respuesta",
      aprendizaje: limpio,
      diasHastaProximoToque: dias,
      proximoPasoAccion: accion,
      proximoPasoNota: nota,
    });
    setTrabajando(false);
    if (!res.ok) return setError(res.error!.mensaje);
    onListo();
  };

  const guardarAcuerdo = async () => {
    setTrabajando(true);
    setError("");
    const res = await useCase.fijarProximoPaso({
      potencialClienteId: prospecto.id,
      accion,
      dias,
      nota,
    });
    setTrabajando(false);
    if (!res.ok) return setError(res.error!.mensaje);
    onListo();
  };

  return (
    <div className="flex flex-col gap-4">
      <EnlacesProspecto prospectoId={prospecto.id} />
      <HistorialCompacto intentos={intentos} />

      <Chips
        valor={modo}
        onChange={setModo}
        opciones={[
          { valor: "escribio", etiqueta: "Me escribió" },
          { valor: "quedamos", etiqueta: "Ya hablamos / quedamos en algo" },
        ]}
      />

      {modo === "escribio" ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]">
            <Select
              label="Canal"
              value={canal}
              onChange={(v) => setCanal(v as Canal)}
              options={OPCIONES_CANAL}
            />
            <Textarea
              label="Lo que me escribió"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
              placeholder="Pegá acá su mensaje (o toda la conversación nueva)."
            />
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#111113] p-3">
            <span className="text-xs font-bold text-zinc-400">
              Con ayuda de tu IA (opcional)
            </span>
            <BotonPrompt
              etiqueta="① Copiar prompt"
              generar={generarPrompt}
              deshabilitado={!texto.trim()}
            />
            <Textarea
              label="② Pegá lo que devolvió la IA (JSON)"
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={3}
            />
            <Button
              variant="secondary"
              onClick={leerIA}
              disabled={!json.trim()}
              className="self-start"
            >
              Leer respuesta de la IA
            </Button>
            {lectura && (
              <p className="text-xs text-zinc-400">
                <span className="font-bold text-zinc-300">Lectura:</span>{" "}
                {lectura}
              </p>
            )}
          </div>

          <Textarea
            label="Lo que le respondo"
            value={borrador}
            onChange={(e) => setBorrador(e.target.value)}
            rows={4}
            placeholder="Borrador de la IA, o escribilo a mano. Al mandarlo, tocá «Ya respondí»."
          />

          <details
            className="rounded-xl border border-[#2A2A2E] bg-[#111113] p-3"
            open={!!lectura}
          >
            <summary className="cursor-pointer text-xs font-bold text-zinc-400">
              Lo que aprendí (opcional)
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              {CAMPOS_APRENDIZAJE.map((c) => (
                <Input
                  key={c.clave}
                  label={c.etiqueta}
                  value={(aprendizaje[c.clave] as string | undefined) ?? ""}
                  onChange={(e) =>
                    setAprendizaje((a) => ({ ...a, [c.clave]: e.target.value }))
                  }
                />
              ))}
              <Select
                label="Tipo de dato"
                value={aprendizaje.tipoDato ?? ""}
                onChange={(v) =>
                  setAprendizaje((a) => ({
                    ...a,
                    tipoDato: (v || undefined) as Aprendizaje["tipoDato"],
                  }))
                }
                options={[
                  { value: "", label: "—" },
                  ...TIPOS_DATO.map((t) => ({
                    value: t,
                    label: ETIQUETA_TIPO_DATO[t],
                  })),
                ]}
              />
            </div>
          </details>

          <ProximoToque
            accion={accion}
            setAccion={setAccion}
            dias={dias}
            setDias={setDias}
            nota={nota}
            setNota={setNota}
          />

          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={yaRespondi} cargando={trabajando}>
              Ya respondí
            </Button>
            {!yaGuardado && (
              <Button
                variant="ghost"
                onClick={guardarSoloSuMensaje}
                disabled={!texto.trim() || trabajando}
              >
                Solo guardar su mensaje (respondo después)
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-zinc-500">
            Anotá en qué quedaron. Vuelve a aparecer en «Seguir» el día que
            toque.
          </p>
          <ProximoToque
            accion={accion}
            setAccion={setAccion}
            dias={dias}
            setDias={setDias}
            nota={nota}
            setNota={setNota}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button
            onClick={guardarAcuerdo}
            cargando={trabajando}
            className="self-start"
          >
            Guardar acuerdo
          </Button>
        </div>
      )}
    </div>
  );
};

/** Qué toca y cuándo (para «Ya respondí» y para «quedamos en algo»). */
const ProximoToque: React.FC<{
  accion: AccionProximoPaso;
  setAccion: (a: AccionProximoPaso) => void;
  dias: number;
  setDias: (d: number) => void;
  nota: string;
  setNota: (n: string) => void;
}> = ({ accion, setAccion, dias, setDias, nota, setNota }) => (
  <div className="flex flex-col gap-3">
    <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
      Lo que sigue
    </span>
    <Chips
      valor={accion}
      onChange={setAccion}
      opciones={ACCIONES_PROXIMO_PASO.map((a) => ({
        valor: a,
        etiqueta: ETIQUETA_ACCION_PROXIMO_PASO[a],
      }))}
    />
    <Chips valor={dias} onChange={setDias} opciones={OPCIONES_DIAS} />
    <Input
      label="Nota (opcional)"
      value={nota}
      onChange={(e) => setNota(e.target.value)}
      placeholder="Ej: le mando la demo después de que me pase los productos"
    />
  </div>
);
