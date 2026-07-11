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
  direccionCalle?: string;
  direccionCiudad?: string;
  direccionProvincia?: string;
  direccionPais?: string;
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
  const [redesList, setRedesList] = useState<{ red: string; url: string }[]>(
    []
  );

  // Structured Address fields
  const [calle, setCalle] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [provincia, setProvincia] = useState("");
  const [pais, setPais] = useState("");

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
        setNombre(clienteEdicion.nombre || "");
        setCorreo(clienteEdicion.correo || "");
        setEmpresa(clienteEdicion.empresa || "");
        setCargo(clienteEdicion.cargo || "");
        setTelefono(clienteEdicion.telefono || "");
        setWhatsapp(clienteEdicion.whatsapp || "");
        setObservaciones(clienteEdicion.observaciones || "");
        setOrigenContacto(clienteEdicion.origenContacto || "Web");
        setEstado(clienteEdicion.estado);
        setResponsable(clienteEdicion.responsable || "Mariano");
        setEtiquetasStr((clienteEdicion.etiquetas || []).join(", "));
        setFechaSeguimiento(clienteEdicion.fechaSeguimiento || "");
        setNotaSeguimiento(clienteEdicion.notaSeguimiento || "");
        setFavorito(clienteEdicion.favorito || false);

        // Load address
        setCalle(
          clienteEdicion.direccionCalle || clienteEdicion.direccion || ""
        );
        setCiudad(clienteEdicion.direccionCiudad || "");
        setProvincia(clienteEdicion.direccionProvincia || "");
        setPais(clienteEdicion.direccionPais || "");

        // Load social networks
        if (clienteEdicion.redes) {
          try {
            const parsed = JSON.parse(clienteEdicion.redes);
            if (Array.isArray(parsed)) {
              setRedesList(parsed);
            } else {
              setRedesList([{ red: "Web / Otro", url: clienteEdicion.redes }]);
            }
          } catch {
            setRedesList([{ red: "Web / Otro", url: clienteEdicion.redes }]);
          }
        } else {
          setRedesList([]);
        }
      } else {
        setNombre("");
        setCorreo("");
        setEmpresa("");
        setCargo("");
        setTelefono("");
        setWhatsapp("");
        setObservaciones("");
        setOrigenContacto("Web");
        setEstado("Contacto Detectado");
        setResponsable("Mariano");
        setEtiquetasStr("");
        setFechaSeguimiento("");
        setNotaSeguimiento("");
        setFavorito(false);
        setCalle("");
        setCiudad("");
        setProvincia("");
        setPais("");
        setRedesList([]);
      }
    });
  }, [clienteEdicion, abierto]);

  if (!abierto) return null;

  const handleConfirmar = () => {
    const arrEtiquetas = etiquetasStr
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const direccionCompleta = [calle, ciudad, provincia, pais]
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join(", ");

    onConfirmar({
      nombre,
      correo,
      empresa,
      cargo,
      telefono,
      whatsapp,
      redes: JSON.stringify(redesList.filter((r) => r.url.trim().length > 0)),
      direccion: direccionCompleta,
      direccionCalle: calle,
      direccionCiudad: ciudad,
      direccionProvincia: provincia,
      direccionPais: pais,
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
            label="Nombre de la persona"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Juan Pérez"
          />
          <Input
            label="Correo electrónico"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="Ej. juan@empresa.com"
          />

          <Input
            label="Empresa / Compañía"
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            placeholder="Ej. Acme Corp"
          />
          <Input
            label="Cargo"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            placeholder="Ej. Gerente de IT"
          />

          <Input
            label="Teléfono fijo"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej. +54 11 4444-5555"
          />
          <Input
            label="WhatsApp directo"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="Ej. +54 9 11 9999-8888"
          />

          {/* Social Networks List Builder */}
          <div className="flex flex-col gap-2 border-t border-[#2A2A2E]/40 pt-3 md:col-span-2">
            <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Redes Sociales
            </label>
            {redesList.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-1/3">
                  <Select
                    options={[
                      { value: "Instagram", label: "Instagram" },
                      { value: "LinkedIn", label: "LinkedIn" },
                      { value: "X / Twitter", label: "X / Twitter" },
                      { value: "GitHub", label: "GitHub" },
                      { value: "Web / Otro", label: "Web / Otro" },
                    ]}
                    value={item.red}
                    onChange={(val) => {
                      const newRedes = [...redesList];
                      newRedes[idx].red = val;
                      setRedesList(newRedes);
                    }}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Enlace o usuario (ej. @juan.perez o instagram.com/juan)"
                    value={item.url}
                    onChange={(e) => {
                      const newRedes = [...redesList];
                      newRedes[idx].url = e.target.value;
                      setRedesList(newRedes);
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRedesList(redesList.filter((_, i) => i !== idx));
                  }}
                  className="rounded-xl bg-zinc-800 p-2.5 text-zinc-400 hover:bg-zinc-700 hover:text-red-400"
                >
                  <Icono.Close className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setRedesList([...redesList, { red: "Instagram", url: "" }])
              }
              className="mt-1 self-start font-mono text-[10px] font-bold text-emerald-400 hover:underline"
            >
              + Agregar Red Social
            </button>
          </div>

          {/* Structured Address Fields */}
          <div className="flex flex-col gap-2 border-t border-[#2A2A2E]/40 pt-3 md:col-span-2">
            <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Dirección Postal (Geocodificación Optimizada)
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Calle y Altura"
                value={calle}
                onChange={(e) => setCalle(e.target.value)}
                placeholder="Ej. Av. Rivadavia 1500"
              />
              <Input
                label="Ciudad"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="Ej. CABA"
              />
              <Input
                label="Provincia / Estado"
                value={provincia}
                onChange={(e) => setProvincia(e.target.value)}
                placeholder="Ej. Buenos Aires"
              />
              <Input
                label="País"
                value={pais}
                onChange={(e) => setPais(e.target.value)}
                placeholder="Ej. Argentina"
              />
            </div>
          </div>

          <div className="border-t border-[#2A2A2E]/40 pt-3 md:col-span-2">
            <Select
              label="Origen del contacto"
              options={origenes.map((o) => ({ value: o, label: o }))}
              value={origenContacto}
              onChange={(val) => setOrigenContacto(val)}
            />
          </div>

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

          <div className="mt-1 border-t border-[#2A2A2E]/40 pt-3 md:col-span-2">
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
              placeholder="Detalles sobre el contacto..."
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
