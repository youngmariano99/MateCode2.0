"use client";

import React from "react";
import { QuickActionCard } from "../card";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";

export const WidgetAcciones: React.FC = () => {
  const { mostrarToast } = useToast();

  const acciones = [
    {
      titulo: "Nuevo Cliente",
      descripcion: "Dar de alta un cliente comercial",
      icono: <Icono.Clientes className="h-5 w-5" />,
      onClick: () => mostrarToast("Flujo de Nuevo Cliente iniciado.", "exito"),
    },
    {
      titulo: "Registrar Pago",
      descripcion: "Cargar cobros y facturas recibidas",
      icono: <Icono.Pagos className="h-5 w-5" />,
      onClick: () => mostrarToast("Flujo de Registrar Pago iniciado.", "exito"),
    },
    {
      titulo: "Generar Contrato",
      descripcion: "Redactar contratos corporativos",
      icono: <Icono.Contratos className="h-5 w-5" />,
      onClick: () =>
        mostrarToast("Flujo de Generar Contrato iniciado.", "exito"),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b border-[#2A2A2E] pb-2">
        <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Acciones Rápidas
        </h3>
      </div>
      {acciones.map((act) => (
        <QuickActionCard
          key={act.titulo}
          titulo={act.titulo}
          descripcion={act.descripcion}
          icono={act.icono}
          onClick={act.onClick}
        />
      ))}
    </div>
  );
};
