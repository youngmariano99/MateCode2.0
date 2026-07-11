"use client";

import React, { useState, useEffect } from "react";
import { Input } from "../input";
import { Select } from "../select";
import { Button } from "../button";
import { Icono } from "../icons";

interface ModalVisitaProps {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar: (payload: {
    horaLlegada: string;
    horaSalida: string;
    resultado: string;
    notas: string;
  }) => void;
  clienteNombre: string;
}

export const ModalVisita: React.FC<ModalVisitaProps> = ({
  abierto,
  onCerrar,
  onConfirmar,
  clienteNombre,
}) => {
  const [horaLlegada, setHoraLlegada] = useState("09:00");
  const [horaSalida, setHoraSalida] = useState("10:00");
  const [resultado, setResultado] = useState("Interesado");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    Promise.resolve().then(() => {
      setHoraLlegada("09:00");
      setHoraSalida("10:00");
      setResultado("Interesado");
      setNotas("");
    });
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="animate-in zoom-in w-full max-w-md rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6 shadow-2xl duration-150">
        <div className="mb-5 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
          <h3 className="font-mono text-base font-extrabold tracking-tight text-white">
            Registrar Visita: {clienteNombre}
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
            label="Hora de Llegada"
            type="time"
            value={horaLlegada}
            onChange={(e) => setHoraLlegada(e.target.value)}
          />

          <Input
            label="Hora de Salida"
            type="time"
            value={horaSalida}
            onChange={(e) => setHoraSalida(e.target.value)}
          />

          <Select
            label="Resultado de la reunión"
            options={[
              { value: "Interesado", label: "Interesado / En Negociación" },
              { value: "Cerrado", label: "Venta Cerrada" },
              { value: "Seguimiento", label: "Volver a llamar más tarde" },
              { value: "Rechazado", label: "No interesado" },
            ]}
            value={resultado}
            onChange={(val) => setResultado(val)}
          />

          <Input
            label="Notas comerciales y compromisos"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Solicitó demo de e-commerce el próximo lunes..."
          />
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-[#2A2A2E] pt-4">
          <button
            onClick={onCerrar}
            className="rounded-xl bg-zinc-800 px-4 py-2 font-mono text-xs font-bold text-zinc-100 hover:bg-zinc-700"
          >
            Cancelar
          </button>
          <Button
            onClick={() =>
              onConfirmar({ horaLlegada, horaSalida, resultado, notas })
            }
          >
            Registrar Visita
          </Button>
        </div>
      </div>
    </div>
  );
};
