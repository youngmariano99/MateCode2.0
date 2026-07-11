"use client";

import React, { useState, useEffect } from "react";
import { Input } from "../input";
import { Select } from "../select";
import { Button } from "../button";
import { Icono } from "../icons";

interface ClienteCRM {
  id: string;
  nombre: string;
  correo: string;
  empresa?: string;
  cargo?: string;
  telefono?: string;
  whatsapp?: string;
  redes?: string;
  direccion?: string;
  observaciones?: string;
  origenContacto?: string;
  estado: string;
  responsable?: string;
  etiquetas?: string[];
  favorito?: boolean;
  latitud?: number;
  longitud?: number;
  fechaSeguimiento?: string;
  notaSeguimiento?: string;
}

interface ModalClienteProps {
  abierto: boolean;
  clienteEdicion: ClienteCRM | null;
  onCerrar: () => void;
  onConfirmar: (payload: Partial<ClienteCRM>) => void;
  estados: string[];
  origenes: string[];
  responsables: string[];
}

export const ModalCliente: React.FC<ModalClienteProps> = ({
  abierto,
  clienteEdicion,
  onCerrar,
  onConfirmar,
  estados,
  origenes,
  responsables,
}) => {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [cargo, setCargo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [redes, setRedes] = useState("");
  const [direccion, setDireccion] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [origenContacto, setOrigenContacto] = useState("Web");
  const [estado, setEstado] = useState("Contacto Detectado");
  const [responsable, setResponsable] = useState("Mariano");
  const [etiquetasStr, setEtiquetasStr] = useState("");
  const [fechaSeguimiento, setFechaSeguimiento] = useState("");
  const [notaSeguimiento, setNotaSeguimiento] = useState("");
  const [favorito, setFavorito] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      if (clienteEdicion) {
        setNombre(clienteEdicion.nombre);
        setCorreo(clienteEdicion.correo);
        setEmpresa(clienteEdicion.empresa || "");
        setCargo(clienteEdicion.cargo || "");
        setTelefono(clienteEdicion.telefono || "");
        setWhatsapp(clienteEdicion.whatsapp || "");
        setRedes(clienteEdicion.redes || "");
        setDireccion(clienteEdicion.direccion || "");
        setObservaciones(clienteEdicion.observaciones || "");
        setOrigenContacto(clienteEdicion.origenContacto || "Web");
        setEstado(clienteEdicion.estado);
        setResponsable(clienteEdicion.responsable || "Mariano");
        setEtiquetasStr((clienteEdicion.etiquetas || []).join(", "));
        setFechaSeguimiento(clienteEdicion.fechaSeguimiento || "");
        setNotaSeguimiento(clienteEdicion.notaSeguimiento || "");
        setFavorito(clienteEdicion.favorito || false);
      } else {
        setNombre("");
        setCorreo("");
        setEmpresa("");
        setCargo("");
        setTelefono("");
        setWhatsapp("");
        setRedes("");
        setDireccion("");
        setObservaciones("");
        setOrigenContacto("Web");
        setEstado("Contacto Detectado");
        setResponsable("Mariano");
        setEtiquetasStr("");
        setFechaSeguimiento("");
        setNotaSeguimiento("");
        setFavorito(false);
      }
    });
  }, [clienteEdicion, abierto]);

  if (!abierto) return null;

  const handleConfirmar = () => {
    const arrEtiquetas = etiquetasStr
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    onConfirmar({
      nombre,
      correo,
      empresa,
      cargo,
      telefono,
      whatsapp,
      redes,
      direccion,
      observaciones,
      origenContacto,
      estado,
      responsable,
      etiquetas: arrEtiquetas,
      favorito,
      fechaSeguimiento,
      notaSeguimiento,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="animate-in zoom-in max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6 shadow-2xl duration-150">
        <div className="mb-5 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
          <h3 className="font-mono text-base font-extrabold tracking-tight text-white">
            {clienteEdicion ? "Modificar Contacto" : "Nuevo Contacto CRM"}
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
            label="Nombre de la persona (Obligatorio)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <Input
            label="Correo electrónico (Obligatorio)"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />

          <Input
            label="Empresa / Compañía"
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
          />
          <Input
            label="Cargo"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
          />

          <Input
            label="Teléfono fijo"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
          <Input
            label="WhatsApp directo"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />

          <Input
            label="Redes Sociales"
            value={redes}
            onChange={(e) => setRedes(e.target.value)}
          />
          <Input
            label="Dirección postal"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
          />

          <Select
            label="Origen del contacto"
            options={origenes.map((o) => ({ value: o, label: o }))}
            value={origenContacto}
            onChange={(val) => setOrigenContacto(val)}
          />
          <Select
            label="Estado en Embudo"
            options={estados.map((e) => ({ value: e, label: e }))}
            value={estado}
            onChange={(val) => setEstado(val)}
          />

          <Select
            label="Responsable comercial"
            options={responsables.map((r) => ({ value: r, label: r }))}
            value={responsable}
            onChange={(val) => setResponsable(val)}
          />
          <Input
            label="Etiquetas (separadas por coma)"
            value={etiquetasStr}
            onChange={(e) => setEtiquetasStr(e.target.value)}
            placeholder="Urgente, Cliente VIP, Frío"
          />

          <div className="mt-1 border-t border-[#2A2A2E]/50 pt-3 md:col-span-2">
            <h4 className="mb-2 font-mono text-xs font-bold text-zinc-400">
              Próximo Seguimiento Programado
            </h4>
          </div>

          <Input
            label="Fecha de próximo contacto"
            type="date"
            value={fechaSeguimiento}
            onChange={(e) => setFechaSeguimiento(e.target.value)}
          />
          <Input
            label="Nota de seguimiento"
            value={notaSeguimiento}
            onChange={(e) => setNotaSeguimiento(e.target.value)}
            placeholder="Llamar para concretar precios..."
          />

          <div className="md:col-span-2">
            <Input
              label="Observaciones adicionales"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          <div className="mt-2 flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              id="chkFavorito"
              checked={favorito}
              onChange={(e) => setFavorito(e.target.checked)}
              className="rounded border-[#2A2A2E] bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
            />
            <label
              htmlFor="chkFavorito"
              className="cursor-pointer font-mono text-xs font-bold text-zinc-300"
            >
              Marcar como contacto favorito/destacado
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-[#2A2A2E] pt-4">
          <button
            onClick={onCerrar}
            className="rounded-xl bg-zinc-800 px-4 py-2.5 font-mono text-xs font-bold text-zinc-100 transition-all hover:bg-zinc-700"
          >
            Cancelar
          </button>
          <Button onClick={handleConfirmar}>Confirmar</Button>
        </div>
      </div>
    </div>
  );
};
