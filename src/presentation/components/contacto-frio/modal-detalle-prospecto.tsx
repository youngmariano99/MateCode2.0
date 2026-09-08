"use client";

import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Dialog } from "../dialog";
import { Badge } from "../badge";
import { SeccionFichaDigital } from "./seccion-ficha-digital";
import { SeccionFichaFisica } from "./seccion-ficha-fisica";
import { SeccionHistorialIntentos } from "./seccion-historial-intentos";
import { formatearFechaBA, haceDiasTexto } from "../../helpers/formatters";

interface ModalDetalleProspectoProps {
  potencialClienteId: string | null;
  onClose: () => void;
}

/**
 * Vista de detalle completa de un prospecto — orquesta las 3 secciones
 * (ficha digital, ficha física, historial de intentos), cada una dueña de
 * sus propios datos. Es donde va todo lo que "sobra" en la tabla maestra.
 */
export const ModalDetalleProspecto: React.FC<ModalDetalleProspectoProps> = ({
  potencialClienteId,
  onClose,
}) => {
  const prospecto = useLiveQuery(
    () =>
      potencialClienteId
        ? db.potencial_cliente.get(potencialClienteId)
        : undefined,
    [potencialClienteId]
  );

  if (!potencialClienteId || !prospecto) return null;

  return (
    <Dialog
      abierto={!!potencialClienteId}
      onClose={onClose}
      titulo={prospecto.nombre}
      maxWidth="lg"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Badge color="zinc">{prospecto.estado}</Badge>
          {prospecto.rubro && <Badge color="sky">{prospecto.rubro}</Badge>}
          {prospecto.esHistoricoLegacy && (
            <span className="text-xs text-zinc-500">
              Histórico — solo lectura
            </span>
          )}
          {prospecto.fechaUltimoContacto && (
            <span className="text-xs text-zinc-500">
              Último contacto: {formatearFechaBA(prospecto.fechaUltimoContacto)}{" "}
              ({haceDiasTexto(prospecto.fechaUltimoContacto)})
            </span>
          )}
        </div>

        {!prospecto.esHistoricoLegacy && (
          <SeccionFichaDigital potencialClienteId={potencialClienteId} />
        )}
        <SeccionFichaFisica potencialClienteId={potencialClienteId} />
        <SeccionHistorialIntentos potencialClienteId={potencialClienteId} />
      </div>
    </Dialog>
  );
};
