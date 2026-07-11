"use client";

import React, { useState, useEffect } from "react";
import { Input } from "../input";
import { Select } from "../select";
import { Button } from "../button";
import { Icono } from "../icons";

interface DocumentoCRM {
  id: string;
  titulo: string;
  tipo: string;
  clienteId: string;
  proyectoId?: string;
  monto?: string;
  formaPago?: string;
}

interface ModalDocumentoProps {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar: (payload: Partial<DocumentoCRM>) => void;
  clientes: { id: string; nombre: string; empresa?: string; cuit?: string }[];
  proyectos: { id: string; nombre: string }[];
  tipos: string[];
}

export const ModalDocumento: React.FC<ModalDocumentoProps> = ({
  abierto,
  onCerrar,
  onConfirmar,
  clientes,
  proyectos,
  tipos,
}) => {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("Contrato");
  const [clienteId, setClienteId] = useState("");
  const [proyectoId, setProyectoId] = useState("");
  const [monto, setMonto] = useState("$ 1500 USD");
  const [formaPago, setFormaPago] = useState("50% adelanto, 50% al entregar");

  useEffect(() => {
    Promise.resolve().then(() => {
      setTitulo("");
      setTipo("Contrato");
      setClienteId(clientes[0]?.id || "");
      setProyectoId(proyectos[0]?.id || "");
      setMonto("$ 1500 USD");
      setFormaPago("50% adelanto, 50% al entregar");
    });
  }, [abierto, clientes, proyectos]);

  if (!abierto) return null;

  const handleConfirmar = () => {
    onConfirmar({
      titulo,
      tipo,
      clienteId,
      proyectoId,
      monto,
      formaPago,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="animate-in zoom-in w-full max-w-md rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6 shadow-2xl duration-150">
        <div className="mb-5 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
          <h3 className="font-mono text-base font-extrabold tracking-tight text-white">
            Nuevo Documento Inteligente
          </h3>
          <button
            onClick={onCerrar}
            className="p-1 text-zinc-500 hover:text-zinc-300"
          >
            <Icono.Close className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <Input
            label="Título del documento"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Contrato de Software ..."
          />

          <Select
            label="Tipo de documento"
            options={tipos.map((t) => ({ value: t, label: t }))}
            value={tipo}
            onChange={(val) => setTipo(val)}
          />

          <Select
            label="Asociar Cliente"
            options={clientes.map((c) => ({ value: c.id, label: c.nombre }))}
            value={clienteId}
            onChange={(val) => setClienteId(val)}
          />

          <Select
            label="Asociar Proyecto"
            options={proyectos.map((p) => ({ value: p.id, label: p.nombre }))}
            value={proyectoId}
            onChange={(val) => setProyectoId(val)}
          />

          <Input
            label="Monto Acordado (opcional)"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />

          <Input
            label="Forma de Pago (opcional)"
            value={formaPago}
            onChange={(e) => setFormaPago(e.target.value)}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-[#2A2A2E] pt-4">
          <button
            onClick={onCerrar}
            className="rounded-xl bg-zinc-800 px-4 py-2 font-mono text-xs font-bold text-zinc-100 hover:bg-zinc-700"
          >
            Cancelar
          </button>
          <Button onClick={handleConfirmar}>Crear y Editar</Button>
        </div>
      </div>
    </div>
  );
};
