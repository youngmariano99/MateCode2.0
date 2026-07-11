"use client";

import React from "react";
import { Card } from "../card";

interface ProyectoCRM {
  id: string;
  nombre: string;
  clienteId: string;
  descripcion?: string;
  tipo: string;
  estado: string;
  fechaInicio?: string;
  fechaEntrega?: string;
  repositorio?: string;
  urlProduccion?: string;
  urlDesarrollo?: string;
  observaciones?: string;
}

interface VistaGeneralProps {
  proyecto: ProyectoCRM;
}

export const VistaGeneral: React.FC<VistaGeneralProps> = ({ proyecto }) => {
  return (
    <Card>
      <div className="mb-4 border-b border-[#2A2A2E] pb-4">
        <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-100 uppercase">
          Información Operativa
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-4 font-mono text-xs text-zinc-400 md:grid-cols-2">
        <div>
          <span className="block text-zinc-500">DESCRIPCIÓN</span>
          <span className="mt-1 block text-zinc-200">
            {proyecto.descripcion || "-"}
          </span>
        </div>
        <div>
          <span className="block text-zinc-500">REPOSITORIO DE CÓDIGO</span>
          {proyecto.repositorio ? (
            <a
              href={`https://${proyecto.repositorio}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-emerald-400 hover:underline"
            >
              {proyecto.repositorio}
            </a>
          ) : (
            <span className="mt-1 block">-</span>
          )}
        </div>
        <div>
          <span className="block text-zinc-500">URL DE PRODUCCIÓN</span>
          {proyecto.urlProduccion ? (
            <a
              href={proyecto.urlProduccion}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-emerald-400 hover:underline"
            >
              {proyecto.urlProduccion}
            </a>
          ) : (
            <span className="mt-1 block">-</span>
          )}
        </div>
        <div>
          <span className="block text-zinc-500">
            URL DE DESARROLLO / STAGING
          </span>
          {proyecto.urlDesarrollo ? (
            <a
              href={proyecto.urlDesarrollo}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-emerald-400 hover:underline"
            >
              {proyecto.urlDesarrollo}
            </a>
          ) : (
            <span className="mt-1 block">-</span>
          )}
        </div>
        <div className="md:col-span-2">
          <span className="block text-zinc-500">OBSERVACIONES ADICIONALES</span>
          <span className="mt-1 block text-zinc-200">
            {proyecto.observaciones || "-"}
          </span>
        </div>
      </div>
    </Card>
  );
};
