/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { Card } from "../../card";
import { TicketCardItem } from "./ticket-card-item";

interface ConsolaTicketsTabProps {
  ticketsOrdenados: any[];
  proyecto: any;
  contexto: any;
  ds: any;
  expandedTicketIds: Record<string, boolean>;
  toggleExpandTicket: (id: string) => void;
  handleEliminarTicket: (id: string, title: string) => void;
  mostrarToast: (msg: string, tipo: "exito" | "error" | "info") => void;
}

export const ConsolaTicketsTab: React.FC<ConsolaTicketsTabProps> = ({
  ticketsOrdenados,
  proyecto,
  contexto,
  ds,
  expandedTicketIds,
  toggleExpandTicket,
  handleEliminarTicket,
  mostrarToast,
}) => {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-3">
        <div>
          <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            Consola de Tickets Abiertos ({ticketsOrdenados.length})
          </h3>
          <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
            Apilados en orden de creación. Despliega cada tarjeta para consultar
            prompts e iterar con la IA.
          </p>
        </div>
      </div>

      {ticketsOrdenados.length === 0 ? (
        <p className="py-10 text-center font-mono text-[10px] text-zinc-500">
          Ningún ticket en curso en este momento. Selecciona una sección o
          actividad para comenzar.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {ticketsOrdenados.map((ticket) => (
            <TicketCardItem
              key={ticket.id}
              ticket={ticket}
              proyecto={proyecto}
              contexto={contexto}
              ds={ds}
              isExpanded={!!expandedTicketIds[ticket.id]}
              onToggleExpand={() => toggleExpandTicket(ticket.id)}
              onDeleteTicket={() =>
                handleEliminarTicket(ticket.id, ticket.titulo)
              }
              mostrarToast={mostrarToast}
            />
          ))}
        </div>
      )}
    </Card>
  );
};
