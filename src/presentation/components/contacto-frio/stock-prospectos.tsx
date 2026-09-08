"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { DataTable } from "../table";
import { Badge, type BadgeColor } from "../badge";
import { ModalDetalleProspecto } from "./modal-detalle-prospecto";
import { formatearFechaBA, haceDiasTexto } from "../../helpers/formatters";
import type { PotencialCliente } from "../../../domain/entidades/contacto-frio.entity";

type FilaProspecto = PotencialCliente & Record<string, unknown>;

const COLOR_ESTADO: Record<string, BadgeColor> = {
  Nuevo: "zinc",
  Contactado: "sky",
  "En Conversación": "blue",
  "Demo Enviada": "violet",
  "Cliente Cerrado": "emerald",
  Rechazado: "red",
};

/**
 * Estación 2: "stock" de prospectos — tabla maestra de solo consulta. Solo
 * lo importante a la vista; el resto (ficha completa, historial) va al
 * modal de detalle, no acá.
 */
export const StockProspectos: React.FC = () => {
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  const prospectos =
    useLiveQuery(() => db.potencial_cliente.toArray(), []) || [];

  return (
    <div className="flex flex-col gap-4">
      <DataTable<FilaProspecto>
        columns={[
          {
            key: "nombre",
            header: "Nombre",
            sortable: true,
            render: (p) => (
              <button
                onClick={() => setSeleccionado(p.id)}
                className="font-semibold text-zinc-100 hover:text-emerald-400"
              >
                {p.nombre}
              </button>
            ),
          },
          { key: "rubro", header: "Rubro", sortable: true },
          {
            key: "estado",
            header: "Estado",
            render: (p) => (
              <Badge color={COLOR_ESTADO[p.estado] || "zinc"}>{p.estado}</Badge>
            ),
          },
          {
            key: "fechaUltimoContacto",
            header: "Último contacto",
            sortable: true,
            render: (p) =>
              p.fechaUltimoContacto ? (
                <span>
                  {formatearFechaBA(p.fechaUltimoContacto)}{" "}
                  <span className="text-zinc-500">
                    ({haceDiasTexto(p.fechaUltimoContacto)})
                  </span>
                </span>
              ) : (
                <span className="text-zinc-600">Sin contactar</span>
              ),
          },
        ]}
        data={prospectos as FilaProspecto[]}
        searchKey="nombre"
        searchPlaceholder="Buscar por nombre..."
      />
      <ModalDetalleProspecto
        potencialClienteId={seleccionado}
        onClose={() => setSeleccionado(null)}
      />
    </div>
  );
};
