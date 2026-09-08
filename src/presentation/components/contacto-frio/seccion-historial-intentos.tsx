"use client";

import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Badge } from "../badge";
import { formatearFechaBA } from "../../helpers/formatters";

interface SeccionHistorialIntentosProps {
  potencialClienteId: string;
}

/** Historial real de intentos de contacto de un prospecto — multi-fila, no un campo que se pisa. */
export const SeccionHistorialIntentos: React.FC<
  SeccionHistorialIntentosProps
> = ({ potencialClienteId }) => {
  const intentos = useLiveQuery(
    () =>
      db.intento_contacto
        .where("potencialClienteId")
        .equals(potencialClienteId)
        .reverse()
        .sortBy("fecha"),
    [potencialClienteId]
  );

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
        Historial de intentos ({intentos?.length || 0})
      </h3>
      {!intentos || intentos.length === 0 ? (
        <span className="text-sm text-zinc-600">
          Todavía no se registró ningún contacto.
        </span>
      ) : (
        <div className="flex flex-col gap-2">
          {intentos.map((i) => (
            <div
              key={i.id}
              className="rounded-xl border border-[#2A2A2E] p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-200">{i.resultado}</span>
                <span className="text-xs text-zinc-500">
                  {formatearFechaBA(i.fecha)} · {i.canal}
                </span>
              </div>
              {i.respuestaTexto && (
                <p className="mt-1 text-zinc-400">
                  &quot;{i.respuestaTexto}&quot;
                </p>
              )}
              {i.tagsResultado.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {i.tagsResultado.map((t) => (
                    <Badge key={t} color="amber">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
