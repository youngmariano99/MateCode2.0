"use client";

import React, { useState, useEffect } from "react";
import { Input } from "../input";
import { Select } from "../select";
import { Button } from "../button";
import { Icono } from "../icons";

interface ProyectoCRM {
  id: string;
  nombre: string;
  clienteId: string;
  descripcion?: string;
  tipo: string;
  estado: string;
  fechaInicio?: string;
  fechaEntrega?: string;
  responsableId?: string;
  repositorio?: string;
  urlProduccion?: string;
  urlDesarrollo?: string;
  observaciones?: string;
}

interface ModalProyectoProps {
  abierto: boolean;
  proyectoEdicion: ProyectoCRM | null;
  onCerrar: () => void;
  onConfirmar: (payload: Partial<ProyectoCRM>) => void;
  estados: string[];
  tipos: string[];
  clientes: { id: string; nombre: string }[];
}

export const ModalProyecto: React.FC<ModalProyectoProps> = ({
  abierto,
  proyectoEdicion,
  onCerrar,
  onConfirmar,
  estados,
  tipos,
  clientes,
}) => {
  const [nombre, setNombre] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState("Sistema Web");
  const [estado, setEstado] = useState("Pendiente");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [repositorio, setRepositorio] = useState("");
  const [urlProduccion, setUrlProduccion] = useState("");
  const [urlDesarrollo, setUrlDesarrollo] = useState("");
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    Promise.resolve().then(() => {
      if (proyectoEdicion) {
        setNombre(proyectoEdicion.nombre);
        setClienteId(proyectoEdicion.clienteId || "");
        setDescripcion(proyectoEdicion.descripcion || "");
        setTipo(proyectoEdicion.tipo);
        setEstado(proyectoEdicion.estado);
        setFechaInicio(proyectoEdicion.fechaInicio || "");
        setFechaEntrega(proyectoEdicion.fechaEntrega || "");
        setRepositorio(proyectoEdicion.repositorio || "");
        setUrlProduccion(proyectoEdicion.urlProduccion || "");
        setUrlDesarrollo(proyectoEdicion.urlDesarrollo || "");
        setObservaciones(proyectoEdicion.observaciones || "");
      } else {
        setNombre("");
        setClienteId("");
        setDescripcion("");
        setTipo("Sistema Web");
        setEstado("Pendiente");
        setFechaInicio("");
        setFechaEntrega("");
        setRepositorio("");
        setUrlProduccion("");
        setUrlDesarrollo("");
        setObservaciones("");
      }
    });
  }, [proyectoEdicion, abierto, clientes]);

  if (!abierto) return null;

  const handleConfirmar = () => {
    onConfirmar({
      nombre,
      clienteId,
      descripcion,
      tipo,
      estado,
      fechaInicio,
      fechaEntrega,
      repositorio,
      urlProduccion,
      urlDesarrollo,
      observaciones,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="animate-in zoom-in max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6 shadow-2xl duration-150">
        <div className="mb-5 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
          <h3 className="font-mono text-base font-extrabold tracking-tight text-white">
            {proyectoEdicion
              ? "Modificar Proyecto"
              : "Nuevo Proyecto Workspace"}
          </h3>
          <button
            onClick={onCerrar}
            className="p-1 text-zinc-500 hover:text-zinc-300"
          >
            <Icono.Close className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Nombre del Proyecto (Obligatorio)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <Select
            label="Cliente asociado"
            options={[
              { value: "", label: "💡 Sin Cliente / Idea Propia" },
              ...clientes.map((c) => ({ value: c.id, label: c.nombre })),
            ]}
            value={clienteId}
            onChange={(val) => setClienteId(val)}
          />

          <div className="md:col-span-2">
            <Input
              label="Descripción"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <Select
            label="Tipo de proyecto"
            options={tipos.map((t) => ({ value: t, label: t }))}
            value={tipo}
            onChange={(val) => setTipo(val)}
          />

          <Select
            label="Estado del proyecto"
            options={estados.map((e) => ({ value: e, label: e }))}
            value={estado}
            onChange={(val) => setEstado(val)}
          />

          <Input
            label="Fecha de Inicio"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />

          <Input
            label="Fecha Objetivo / Límite"
            type="date"
            value={fechaEntrega}
            onChange={(e) => setFechaEntrega(e.target.value)}
          />

          <Input
            label="Repositorio (GitHub / GitLab)"
            value={repositorio}
            onChange={(e) => setRepositorio(e.target.value)}
          />

          <Input
            label="URL de Producción"
            value={urlProduccion}
            onChange={(e) => setUrlProduccion(e.target.value)}
          />

          <div className="md:col-span-2">
            <Input
              label="URL de Desarrollo / Staging"
              value={urlDesarrollo}
              onChange={(e) => setUrlDesarrollo(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <Input
              label="Observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-[#2A2A2E] pt-4">
          <button
            onClick={onCerrar}
            className="rounded-xl bg-zinc-800 px-4 py-2 font-mono text-xs font-bold text-zinc-100 hover:bg-zinc-700"
          >
            Cancelar
          </button>
          <Button onClick={handleConfirmar}>Confirmar</Button>
        </div>
      </div>
    </div>
  );
};
