"use client";

import React, { useState, useEffect } from "react";
import { Input } from "../input";
import { Button } from "../button";
import { Icono } from "../icons";
import { db } from "../../../offline/dexie/db";
import { OpenStreetMapGeocodificacionStrategy } from "../../../application/services/territorio/geocodificacion.strategy";

/**
 * Prospecto para la prospección física (mapa/ruteo): el núcleo es nombre,
 * rubro, prioridad y dirección. Las redes sociales son opcionales acá —
 * la ficha digital completa (dolores, señales) sigue viviendo en Contacto
 * en Frío, pero un link de Instagram/WhatsApp es útil tenerlo a mano para
 * abrir el perfil con un click antes de ir a visitar.
 */
export interface PotencialCliente {
  id: string;
  nombre: string;
  rubro?: string;
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
  latitud?: number;
  longitud?: number;
  creadoEn: number;
  actualizadoEn: number;
  prioridad?: "Alta" | "Media" | "Baja";
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  email?: string;
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
  const [rubro, setRubro] = useState("");
  const [prioridad, setPrioridad] = useState<"Alta" | "Media" | "Baja">(
    "Media"
  );

  // Redes sociales — opcionales, solo para tener el link a mano.
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [email, setEmail] = useState("");

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
  const [rubrosExistentes, setRubrosExistentes] = useState<string[]>([]);

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
        const [potenciales, fichas] = await Promise.all([
          db.potencial_cliente.toArray(),
          db.ficha_fisica.toArray(),
        ]);
        const cities = Array.from(
          new Set(fichas.map((f) => f.direccionCiudad || "").filter(Boolean))
        );
        const states = Array.from(
          new Set(fichas.map((f) => f.direccionProvincia || "").filter(Boolean))
        );
        const rubros = Array.from(
          new Set(potenciales.map((p) => p.rubro || "").filter(Boolean))
        );
        setCiudadesExistentes(cities);
        setProvinciasExistentes(states);
        setRubrosExistentes(rubros);
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
        setRubro(prospectoEdicion.rubro || "");
        setPrioridad(prospectoEdicion.prioridad || "Media");

        setWhatsapp(prospectoEdicion.whatsapp || "");
        setInstagram(prospectoEdicion.instagram || "");
        setFacebook(prospectoEdicion.facebook || "");
        setEmail(prospectoEdicion.email || "");

        setCalle(prospectoEdicion.direccionCalle || "");
        setCodigoPostal(prospectoEdicion.direccionCodigoPostal || "");
        setCiudad(prospectoEdicion.direccionCiudad || "");
        setProvincia(prospectoEdicion.direccionProvincia || "");
        setPais(prospectoEdicion.direccionPais || "Argentina");
      } else {
        setNombre("");
        setRubro("");
        setPrioridad("Media");

        setWhatsapp("");
        setInstagram("");
        setFacebook("");
        setEmail("");

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
      rubro: rubro.trim(),
      prioridad,
      whatsapp: whatsapp.trim(),
      instagram: instagram.trim(),
      facebook: facebook.trim(),
      email: email.trim(),
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
              : "Nuevo Potencial Cliente (Prospección Física)"}
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
            label="Rubro / Categoría"
            list="rubros-prospect-datalist"
            value={rubro}
            onChange={(e) => setRubro(e.target.value)}
            placeholder="Ej. Gastronomía, Estética, Salud"
          />
          <datalist id="rubros-prospect-datalist">
            {rubrosExistentes.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] font-bold text-zinc-400 uppercase">
              Prioridad / Grado
            </label>
            <select
              value={prioridad}
              onChange={(e) =>
                setPrioridad(e.target.value as "Alta" | "Media" | "Baja")
              }
              className="w-full rounded-xl border border-zinc-800 bg-[#18181B] p-2.5 font-mono text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="Alta">Alta (Visitar Primero / Crítico)</option>
              <option value="Media">Media (Estándar)</option>
              <option value="Baja">Baja (De Paso / Secundario)</option>
            </select>
          </div>

          {/* Redes sociales — opcional */}
          <div className="flex flex-col gap-2 border-t border-[#2A2A2E]/40 pt-3 sm:col-span-2">
            <label className="font-mono text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Redes sociales (opcional)
            </label>
            <p className="-mt-1 text-[10px] text-zinc-500">
              Solo para tener el link a mano y abrirlo con un click. No hace
              falta completarlo.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Instagram (usuario o URL)"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="Ej. @negocio o link al perfil"
              />
              <Input
                label="WhatsApp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ej. +5492914123456"
              />
              <Input
                label="Facebook (enlace)"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="Ej. https://facebook.com/pagina"
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej. contacto@negocio.com"
              />
            </div>
          </div>

          {/* Structured Address */}
          <div className="flex flex-col gap-2 border-t border-[#2A2A2E]/40 pt-3 sm:col-span-2">
            <label className="font-mono text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Dirección Postal (Geocodificación / Campo)
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
              className="mt-2 self-start rounded-xl border border-zinc-800 bg-[#2A2A2E] px-4 py-2 font-mono text-[11px] font-bold text-zinc-300 transition-all hover:bg-zinc-800 active:scale-95"
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
                <span className="text-red-400">Error: {testResult.error}</span>
              )}
              {testResult.latitud !== undefined && (
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-emerald-400">
                    Coordenadas localizadas (Se guardarán al confirmar)
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
