"use client";

import React, { useState, useEffect } from "react";
import { Input } from "../input";
import { Button } from "../button";
import { Icono } from "../icons";
import { db } from "../../../offline/dexie/db";
import { OpenStreetMapGeocodificacionStrategy } from "../../../application/services/territorio/geocodificacion.strategy";

export interface PotencialCliente {
  id: string;
  nombre: string;
  contacto?: string;
  tipoServicio?: string;
  pitch?: string;
  direccion?: string;
  direccionCalle?: string;
  direccionCodigoPostal?: string;
  direccionCiudad?: string;
  direccionProvincia?: string;
  direccionPais?: string;
  visitado: boolean;
  visitasCount: number;
  motivoNoVisita?: string;
  volverFecha?: string;
  convertido: boolean;
  clienteIdRef?: string;
  latitud?: number;
  longitud?: number;
  creadoEn: number;
  actualizadoEn: number;
}

interface ModalPotencialClienteProps {
  abierto: boolean;
  prospectoEdicion: PotencialCliente | null;
  onCerrar: () => void;
  onConfirmar: (payload: Partial<PotencialCliente>) => void;
}

export const ModalPotencialCliente: React.FC<ModalPotencialClienteProps> = ({
  abierto,
  prospectoEdicion,
  onCerrar,
  onConfirmar,
}) => {
  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [tipoServicio, setTipoServicio] = useState("");
  const [pitch, setPitch] = useState("");

  // Address fields
  const [calle, setCalle] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [provincia, setProvincia] = useState("");
  const [pais, setPais] = useState("Argentina");

  // Autocomplete Suggestions
  const [ciudadesExistentes, setCiudadesExistentes] = useState<string[]>([]);
  const [provinciasExistentes, setProvinciasExistentes] = useState<string[]>(
    []
  );

  // Geocoding test status
  const [testResult, setTestResult] = useState<{
    buscando: boolean;
    error?: string;
    latitud?: number;
    longitud?: number;
    direccionFormateada?: string;
    proveedor?: string;
  } | null>(null);

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const list = await db.potenciales_clientes.toArray();
        const cities = Array.from(
          new Set(
            list.map((c) => (c.direccionCiudad as string) || "").filter(Boolean)
          )
        );
        const states = Array.from(
          new Set(
            list
              .map((c) => (c.direccionProvincia as string) || "")
              .filter(Boolean)
          )
        );
        setCiudadesExistentes(cities);
        setProvinciasExistentes(states);
      } catch {
        // Ignored
      }
    };
    if (abierto) {
      void loadSuggestions();
    }
  }, [abierto]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setTestResult(null);
      if (prospectoEdicion) {
        setNombre(prospectoEdicion.nombre || "");
        setContacto(prospectoEdicion.contacto || "");
        setTipoServicio(prospectoEdicion.tipoServicio || "");
        setPitch(prospectoEdicion.pitch || "");
        setCalle(prospectoEdicion.direccionCalle || "");
        setCodigoPostal(prospectoEdicion.direccionCodigoPostal || "");
        setCiudad(prospectoEdicion.direccionCiudad || "");
        setProvincia(prospectoEdicion.direccionProvincia || "");
        setPais(prospectoEdicion.direccionPais || "Argentina");
      } else {
        setNombre("");
        setContacto("");
        setTipoServicio("");
        setPitch("");
        setCalle("");
        setCodigoPostal("");
        setCiudad("");
        setProvincia("");
        setPais("Argentina");

        // Prepopulate city and province from browser geolocation
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=10`,
                {
                  headers: {
                    "User-Agent": "MateCodeApp/1.0",
                  },
                }
              );
              const data = await res.json();
              if (data && data.address) {
                const guessedCity =
                  data.address.city ||
                  data.address.town ||
                  data.address.village ||
                  data.address.suburb ||
                  "";
                const guessedState = data.address.state || "";
                const guessedCountry = data.address.country || "";
                const guessedPostcode = data.address.postcode || "";

                if (guessedCity) setCiudad(guessedCity);
                if (guessedState) setProvincia(guessedState);
                if (guessedCountry) setPais(guessedCountry);
                if (guessedPostcode) setCodigoPostal(guessedPostcode);
              }
            } catch {
              // Ignore
            }
          });
        }
      }
    });
  }, [prospectoEdicion, abierto]);

  if (!abierto) return null;

  const testGeocodificacion = async () => {
    const direccionCompleta = [calle, codigoPostal, ciudad, provincia, pais]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");

    if (!direccionCompleta) {
      setTestResult({
        buscando: false,
        error: "Ingresa una dirección primero.",
      });
      return;
    }

    setTestResult({ buscando: true });
    const strategy = new OpenStreetMapGeocodificacionStrategy();
    const res = await strategy.geocodificar(direccionCompleta);

    if (res.ok) {
      setTestResult({
        buscando: false,
        latitud: res.valor.latitud,
        longitud: res.valor.longitud,
        direccionFormateada: res.valor.direccionFormateada,
        proveedor: res.valor.proveedor,
      });
    } else {
      setTestResult({
        buscando: false,
        error: "Dirección no localizada por Nominatim.",
      });
    }
  };

  const handleConfirmar = () => {
    const direccionCompleta = [calle, codigoPostal, ciudad, provincia, pais]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");

    onConfirmar({
      nombre: nombre.trim(),
      contacto: contacto.trim(),
      tipoServicio: tipoServicio.trim(),
      pitch: pitch.trim(),
      direccion: direccionCompleta,
      direccionCalle: calle.trim(),
      direccionCodigoPostal: codigoPostal.trim(),
      direccionCiudad: ciudad.trim(),
      direccionProvincia: provincia.trim(),
      direccionPais: pais.trim(),
      latitud: testResult?.latitud ?? prospectoEdicion?.latitud,
      longitud: testResult?.longitud ?? prospectoEdicion?.longitud,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="animate-in zoom-in max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6 shadow-2xl duration-150">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
          <h3 className="font-mono text-base font-extrabold tracking-tight text-white">
            {prospectoEdicion
              ? "Modificar Prospecto"
              : "Nuevo Potencial Cliente (Prospecto)"}
          </h3>
          <button
            onClick={onCerrar}
            className="p-1 text-zinc-500 hover:text-zinc-300"
          >
            <Icono.Close className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Nombre del Negocio / Empresa"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Panadería Colón o Gimnasio Estilo"
            />
          </div>

          <Input
            label="Persona de Contacto (Opcional)"
            value={contacto}
            onChange={(e) => setContacto(e.target.value)}
            placeholder="Ej. Carlos (Dueño)"
          />

          <Input
            label="Servicio a ofrecer"
            value={tipoServicio}
            onChange={(e) => setTipoServicio(e.target.value)}
            placeholder="Ej. Desarrollo de Web y PWA"
          />

          <div className="sm:col-span-2">
            <Input
              label="Pitch Elevator / Argumento de ventas (Opcional)"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="Ej. Ofrecerle digitalización de su menú impreso..."
            />
          </div>

          {/* Structured Address */}
          <div className="flex flex-col gap-2 border-t border-[#2A2A2E]/40 pt-3 sm:col-span-2">
            <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Dirección Postal (Geocodificación Exacta)
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Calle y Altura"
                value={calle}
                onChange={(e) => setCalle(e.target.value)}
                placeholder="Ej. Vieytes 539"
              />
              <Input
                label="Código Postal (CP)"
                value={codigoPostal}
                onChange={(e) => setCodigoPostal(e.target.value)}
                placeholder="Ej. 8000"
              />
              <Input
                label="Ciudad"
                list="ciudades-prospect-datalist"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="Ej. Bahía Blanca"
              />
              <datalist id="ciudades-prospect-datalist">
                {ciudadesExistentes.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>

              <Input
                label="Provincia"
                list="provincias-prospect-datalist"
                value={provincia}
                onChange={(e) => setProvincia(e.target.value)}
                placeholder="Ej. Buenos Aires"
              />
              <datalist id="provincias-prospect-datalist">
                {provinciasExistentes.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>

              <div className="sm:col-span-2">
                <Input
                  label="País"
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  placeholder="Ej. Argentina"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={testGeocodificacion}
              className="mt-2 self-start rounded-xl bg-emerald-500 px-4 py-2 font-mono text-[11px] font-bold text-black transition-all hover:bg-emerald-600 active:scale-95"
            >
              Testear Dirección Geográfica
            </button>
          </div>

          {/* Test Geocoding Results */}
          {testResult && (
            <div className="rounded-xl border border-[#2A2A2E] bg-zinc-950/80 p-3 font-mono text-[10px] sm:col-span-2">
              {testResult.buscando && (
                <span className="animate-pulse text-zinc-500">
                  Buscando coordenadas en Nominatim...
                </span>
              )}
              {testResult.error && (
                <span className="text-red-400">
                  ✗ Error: {testResult.error}
                </span>
              )}
              {testResult.latitud !== undefined && (
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-emerald-400">
                    ✓ Coordenadas localizadas (Se guardarán al confirmar)
                  </span>
                  <span className="text-zinc-300">
                    <b>Nombre oficial:</b> {testResult.direccionFormateada}
                  </span>
                  <span className="text-zinc-400">
                    <b>Coordenadas:</b> Lat: {testResult.latitud.toFixed(6)},
                    Lng: {testResult.longitud?.toFixed(6)}
                    <span className="ml-2 rounded bg-emerald-500/10 px-1 py-0.5 text-[8px] font-bold text-emerald-400 uppercase">
                      {testResult.proveedor}
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}
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
