"use client";

import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Select } from "../select";
import { Textarea } from "../input";
import { SelectorEtiquetas } from "./selector-etiquetas";
import { GestionarContactoFrioUseCase } from "../../../application/use-cases/crm/gestionar-contacto-frio.use-case";
import { diasDesde, haceDiasTexto } from "../../helpers/formatters";
import type { ResultadoIntento } from "../../../domain/entidades/contacto-frio.entity";

const useCase = new GestionarContactoFrioUseCase();

function colorSemaforo(dias: number): string {
  if (dias < 2) return "border-emerald-500/40 bg-emerald-500/5";
  if (dias < 7) return "border-amber-500/40 bg-amber-500/5";
  return "border-red-500/40 bg-red-500/5";
}

/**
 * Estación 4: contactados que todavía no tienen una respuesta registrada.
 * Semáforo por días transcurridos — para decidir de un vistazo a quién
 * recontactar y a quién ya darle por perdido.
 */
export const SeguimientoPendiente: React.FC = () => {
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoIntento>("Respondió");
  const [respuestaTexto, setRespuestaTexto] = useState("");
  const [tagsRechazo, setTagsRechazo] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  const prospectos = useLiveQuery(
    () => db.potencial_cliente.where("estado").equals("Contactado").toArray(),
    []
  );

  const lista = useMemo(() => {
    return (prospectos || [])
      .filter((p) => !p.esHistoricoLegacy && p.fechaUltimoContacto)
      .sort(
        (a, b) => (a.fechaUltimoContacto || 0) - (b.fechaUltimoContacto || 0)
      );
  }, [prospectos]);

  const registrar = async () => {
    if (!seleccionadoId) return;
    setGuardando(true);
    await useCase.registrarIntento({
      potencialClienteId: seleccionadoId,
      canal: "Instagram",
      resultado,
      respuestaTexto,
      tagsResultado: resultado === "Rechazó" ? tagsRechazo : [],
    });
    setGuardando(false);
    setSeleccionadoId(null);
    setRespuestaTexto("");
    setTagsRechazo([]);
  };

  return (
    <div className="flex flex-col gap-3">
      {lista.length === 0 && (
        <span className="text-sm text-zinc-600">
          No hay contactos esperando respuesta.
        </span>
      )}
      {lista.map((p) => {
        const dias = diasDesde(p.fechaUltimoContacto!);
        return (
          <div
            key={p.id}
            className={`flex flex-col gap-3 rounded-2xl border p-4 ${colorSemaforo(dias)}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-zinc-100">{p.nombre}</span>
                <span className="ml-2 text-xs text-zinc-400">
                  {haceDiasTexto(p.fechaUltimoContacto!)}
                </span>
              </div>
              {seleccionadoId !== p.id && (
                <Button
                  variant="outline"
                  className="px-3 py-1.5 text-xs"
                  onClick={() => setSeleccionadoId(p.id)}
                >
                  Registrar respuesta
                </Button>
              )}
            </div>

            {seleccionadoId === p.id && (
              <div className="flex flex-col gap-3 border-t border-white/5 pt-3">
                <Select
                  label="¿Qué pasó?"
                  value={resultado}
                  onChange={(v) => setResultado(v as ResultadoIntento)}
                  options={[
                    { value: "Respondió", label: "Respondió" },
                    { value: "Pidió más info", label: "Pidió más info" },
                    { value: "Visto sin responder", label: "Me dejó en visto" },
                    { value: "Rechazó", label: "Rechazó" },
                  ]}
                />
                <Textarea
                  label="Qué te respondió (si aplica)"
                  value={respuestaTexto}
                  onChange={(e) => setRespuestaTexto(e.target.value)}
                />
                {resultado === "Rechazó" && (
                  <SelectorEtiquetas
                    label="Motivo del rechazo"
                    categoria="motivo_rechazo"
                    value={tagsRechazo}
                    onChange={setTagsRechazo}
                  />
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setSeleccionadoId(null)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={registrar} cargando={guardando}>
                    Guardar
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
