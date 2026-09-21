"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Input } from "../input";
import { Dialog } from "../dialog";
import { GestionarContactoFrioUseCase } from "../../../application/use-cases/crm/gestionar-contacto-frio.use-case";
import { CrearProyectoUseCase } from "../../../application/use-cases/proyecto/crear-proyecto.use-case";
import type { PotencialCliente } from "../../../domain/entidades/contacto-frio.entity";

const useCase = new GestionarContactoFrioUseCase();
const crearProyecto = new CrearProyectoUseCase();

const MOTIVOS_RECHAZO = [
  "No le interesa",
  "Dejó de responder",
  "Ya tiene solución",
  "No es el momento",
  "No es su perfil",
];

/**
 * Los dos finales de un lead: "ya está" → Rechazado (con motivo), o aceptó →
 * Cliente cerrado, que crea el Cliente en el CRM y ofrece armar el Proyecto
 * de una. Un lead nunca se cierra solo: sigue en la cinta hasta que se
 * decida acá.
 */
export const CierreLead: React.FC<{
  prospecto: PotencialCliente;
  onCerrado?: () => void;
}> = ({ prospecto, onCerrado }) => {
  const [rechazando, setRechazando] = useState(false);
  const [motivos, setMotivos] = useState<string[]>([]);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");
  const [dialogoProyecto, setDialogoProyecto] = useState(false);
  const [nombreProyecto, setNombreProyecto] = useState(
    `Nodexa Core — ${prospecto.nombre}`
  );
  const [proyectoCreado, setProyectoCreado] = useState(false);

  const cliente = useLiveQuery(
    () =>
      prospecto.clienteId ? db.clientes.get(prospecto.clienteId) : undefined,
    [prospecto.clienteId]
  );

  const rechazar = async () => {
    setTrabajando(true);
    setError("");
    const res = await useCase.descartarLead(prospecto.id, motivos);
    setTrabajando(false);
    if (!res.ok) return setError(res.error!.mensaje);
    setRechazando(false);
    onCerrado?.();
  };

  const cerrarCliente = async () => {
    setTrabajando(true);
    setError("");
    const res = await useCase.cerrarComoCliente(prospecto.id);
    setTrabajando(false);
    if (!res.ok) return setError(res.error!.mensaje);
    setDialogoProyecto(true);
  };

  const crearElProyecto = async () => {
    if (!prospecto.clienteId && !cliente) return;
    setTrabajando(true);
    const clienteId = cliente?.id ?? prospecto.clienteId;
    const res = await crearProyecto.ejecutar({
      nombre: nombreProyecto.trim() || `Proyecto — ${prospecto.nombre}`,
      clienteId,
      tipo: "Sistema Web",
      estado: "Pendiente",
      descripcion: `Nacido del contacto en frío con ${prospecto.nombre}.`,
    });
    setTrabajando(false);
    if (res.ok) setProyectoCreado(true);
  };

  if (prospecto.estado === "Cliente Cerrado") {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
        <span className="font-bold text-emerald-400">Es cliente.</span>
        <Link
          href="/dashboard/clientes"
          className="text-xs font-bold text-sky-400 hover:underline"
        >
          Ver en Clientes
        </Link>
        {cliente && (
          <Button variant="outline" onClick={() => setDialogoProyecto(true)}>
            Crear proyecto
          </Button>
        )}
        <DialogoProyecto
          abierto={dialogoProyecto}
          onClose={() => setDialogoProyecto(false)}
          nombre={nombreProyecto}
          setNombre={setNombreProyecto}
          creado={proyectoCreado}
          trabajando={trabajando}
          onCrear={crearElProyecto}
        />
      </div>
    );
  }

  if (prospecto.estado === "Rechazado") {
    return <p className="text-xs text-zinc-500">Descartado (Rechazado).</p>;
  }

  return (
    <div className="flex flex-col gap-3 border-t border-[#2A2A2E] pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
          Cerrar el lead
        </span>
        <Button variant="primary" onClick={cerrarCliente} cargando={trabajando}>
          Aceptó → es cliente
        </Button>
        <Button variant="ghost" onClick={() => setRechazando((v) => !v)}>
          Ya está → Rechazado
        </Button>
      </div>

      {rechazando && (
        <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#111113] p-3">
          <span className="text-xs text-zinc-400">Motivo (opcional):</span>
          <div className="flex flex-wrap gap-2">
            {MOTIVOS_RECHAZO.map((m) => (
              <button
                key={m}
                onClick={() =>
                  setMotivos((v) =>
                    v.includes(m) ? v.filter((x) => x !== m) : [...v, m]
                  )
                }
                className={`rounded-lg border px-3 py-1 text-xs font-bold ${
                  motivos.includes(m)
                    ? "border-red-500/40 bg-red-500/10 text-red-300"
                    : "border-[#2A2A2E] text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <Button
            variant="destructive"
            onClick={rechazar}
            cargando={trabajando}
            className="self-start"
          >
            Confirmar: pasar a Rechazado
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}

      <DialogoProyecto
        abierto={dialogoProyecto}
        onClose={() => {
          setDialogoProyecto(false);
          onCerrado?.();
        }}
        nombre={nombreProyecto}
        setNombre={setNombreProyecto}
        creado={proyectoCreado}
        trabajando={trabajando}
        onCrear={crearElProyecto}
      />
    </div>
  );
};

const DialogoProyecto: React.FC<{
  abierto: boolean;
  onClose: () => void;
  nombre: string;
  setNombre: (v: string) => void;
  creado: boolean;
  trabajando: boolean;
  onCrear: () => void;
}> = ({ abierto, onClose, nombre, setNombre, creado, trabajando, onCrear }) => (
  <Dialog
    abierto={abierto}
    onClose={onClose}
    titulo="¡Cliente cerrado!"
    maxWidth="sm"
  >
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-300">
        Ya quedó cargado en Clientes con lo que aprendiste en las
        conversaciones. ¿Le armás el proyecto ahora?
      </p>
      {creado ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-emerald-400">Proyecto creado.</p>
          <Link
            href="/dashboard/proyectos"
            className="text-sm font-bold text-sky-400 hover:underline"
          >
            Ir a Proyectos
          </Link>
        </div>
      ) : (
        <>
          <Input
            label="Nombre del proyecto"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={onCrear} cargando={trabajando}>
              Crear proyecto
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Más tarde
            </Button>
          </div>
        </>
      )}
    </div>
  </Dialog>
);
