"use client";

import React, { useState } from "react";
import { Icono } from "../icons";
import { OpenStreetMapGeocodificacionStrategy } from "../../../application/services/territorio/geocodificacion.strategy";
import { PotencialCliente } from "./ModalPotencialCliente";

interface ImportItem {
  nombre: string;
  contacto?: string;
  tipoServicio?: string;
  pitch?: string;
  rubro?: string;
  direccionCalle: string;
  direccionCodigoPostal: string;
  direccionCiudad: string;
  direccionProvincia: string;
  direccionPais: string;

  // Digital fields
  whatsapp?: string;
  email?: string;
  instagram?: string;
  facebook?: string;

  // Geocoding state
  buscando: boolean;
  error?: string;
  latitud?: number;
  longitud?: number;
  direccionFormateada?: string;
}

interface ModalImportarPotencialesProps {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmarImportacion: (potenciales: Partial<PotencialCliente>[]) => void;
}

export const ModalImportarPotenciales: React.FC<
  ModalImportarPotencialesProps
> = ({ abierto, onCerrar, onConfirmarImportacion }) => {
  const [tipoImportacion, setTipoImportacion] = useState<"basica" | "completa">(
    "basica"
  );
  const [jsonText, setJsonText] = useState("");
  const [errorJson, setErrorJson] = useState<string | null>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [paso, setPaso] = useState<"cargar" | "verificar">("cargar");
  const [copiado, setCopiado] = useState(false);

  const templateBasico = [
    {
      nombre: "Panadería Colón",
      rubro: "Gastronomía",
      whatsapp: "+5492914123456",
      instagram: "@panaderia_colon",
      direccionCalle: "Av. Colón 450",
      direccionCodigoPostal: "8000",
      direccionCiudad: "Bahía Blanca",
      direccionProvincia: "Buenos Aires",
      direccionPais: "Argentina",
      tipoServicio: "Página Web y Menú QR",
    },
    {
      nombre: "Gimnasio Estilo",
      rubro: "Deportes",
      whatsapp: "+5492914444555",
      instagram: "@gimnasio_estilo",
      direccionCalle: "Vieytes 1020",
      direccionCodigoPostal: "8000",
      direccionCiudad: "Bahía Blanca",
      direccionProvincia: "Buenos Aires",
      direccionPais: "Argentina",
      tipoServicio: "PWA de Reservas",
    },
  ];

  const templateCompleto = [
    {
      nombre: "Panadería Colón",
      rubro: "Gastronomía",
      contacto: "Roberto (Dueño)",
      whatsapp: "+5492914123456",
      email: "roberto@colon.com",
      instagram: "https://instagram.com/panaderiacolon",
      facebook: "https://facebook.com/panaderiacolon",
      tipoServicio: "Página Web y Menú QR",
      pitch: "Digitalizar su cartelería física con código QR dinámico",
      direccionCalle: "Av. Colón 450",
      direccionCodigoPostal: "8000",
      direccionCiudad: "Bahía Blanca",
      direccionProvincia: "Buenos Aires",
      direccionPais: "Argentina",
    },
    {
      nombre: "Gimnasio Estilo",
      rubro: "Deportes",
      contacto: "Gaby (Propietario)",
      whatsapp: "+5492914444555",
      email: "gaby@estilo.com",
      instagram: "https://instagram.com/gimnasioestilo",
      facebook: "",
      tipoServicio: "PWA de Reservas y Clases",
      pitch: "Automatizar los cupos de las clases cruzadas",
      direccionCalle: "Vieytes 1020",
      direccionCodigoPostal: "8000",
      direccionCiudad: "Bahía Blanca",
      direccionProvincia: "Buenos Aires",
      direccionPais: "Argentina",
    },
  ];

  if (!abierto) return null;

  const handleCopiarTemplate = () => {
    const template =
      tipoImportacion === "basica" ? templateBasico : templateCompleto;
    navigator.clipboard.writeText(JSON.stringify(template, null, 2));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleValidarJSON = async () => {
    try {
      setErrorJson(null);
      const parsed = JSON.parse(jsonText);
      const parsedArray = Array.isArray(parsed) ? parsed : [parsed];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: ImportItem[] = parsedArray.map((x: any) => ({
        nombre: String(x.nombre || "Prospecto Sin Nombre").trim(),
        contacto: String(x.contacto || "").trim(),
        tipoServicio: String(x.tipoServicio || "").trim(),
        pitch: String(x.pitch || "").trim(),
        rubro: String(x.rubro || "General").trim(),
        direccionCalle: String(x.direccionCalle || "").trim(),
        direccionCodigoPostal: String(x.direccionCodigoPostal || "").trim(),
        direccionCiudad: String(x.direccionCiudad || "").trim(),
        direccionProvincia: String(x.direccionProvincia || "").trim(),
        direccionPais: String(x.direccionPais || "Argentina").trim(),
        whatsapp: String(x.whatsapp || "").trim(),
        email: String(x.email || "").trim(),
        instagram: String(x.instagram || "").trim(),
        facebook: String(x.facebook || "").trim(),
        buscando: false,
      }));

      setItems(mapped);
      setPaso("verificar");

      // Auto trigger batch geocoding
      void ejecutarGeocodificacionLote(mapped);
    } catch (e: unknown) {
      setErrorJson(
        `JSON inválido: ${(e as Error).message || "Error de sintaxis"}`
      );
    }
  };

  const ejecutarGeocodificacionLote = async (lote: ImportItem[]) => {
    const strategy = new OpenStreetMapGeocodificacionStrategy();

    for (let i = 0; i < lote.length; i++) {
      setItems((current) => {
        const copy = [...current];
        copy[i].buscando = true;
        copy[i].error = undefined;
        return copy;
      });

      const item = lote[i];
      const dirCompleta = [
        item.direccionCalle,
        item.direccionCodigoPostal,
        item.direccionCiudad,
        item.direccionProvincia,
        item.direccionPais,
      ]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", ");

      if (!dirCompleta) {
        setItems((current) => {
          const copy = [...current];
          copy[i].buscando = false;
          copy[i].error = "Dirección vacía";
          return copy;
        });
        continue;
      }

      const res = await strategy.geocodificar(dirCompleta);

      setItems((current) => {
        const copy = [...current];
        copy[i].buscando = false;
        if (res.ok) {
          copy[i].latitud = res.valor.latitud;
          copy[i].longitud = res.valor.longitud;
          copy[i].direccionFormateada = res.valor.direccionFormateada;
        } else {
          copy[i].error = "No encontrada";
        }
        return copy;
      });
    }
  };

  const retestearFila = async (index: number) => {
    setItems((current) => {
      const copy = [...current];
      copy[index].buscando = true;
      copy[index].error = undefined;
      copy[index].latitud = undefined;
      copy[index].longitud = undefined;
      return copy;
    });

    const item = items[index];
    const dirCompleta = [
      item.direccionCalle,
      item.direccionCodigoPostal,
      item.direccionCiudad,
      item.direccionProvincia,
      item.direccionPais,
    ]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");

    if (!dirCompleta) {
      setItems((current) => {
        const copy = [...current];
        copy[index].buscando = false;
        copy[index].error = "Dirección vacía";
        return copy;
      });
      return;
    }

    const strategy = new OpenStreetMapGeocodificacionStrategy();
    const res = await strategy.geocodificar(dirCompleta);

    setItems((current) => {
      const copy = [...current];
      copy[index].buscando = false;
      if (res.ok) {
        copy[index].latitud = res.valor.latitud;
        copy[index].longitud = res.valor.longitud;
        copy[index].direccionFormateada = res.valor.direccionFormateada;
      } else {
        copy[index].error = "No encontrada";
      }
      return copy;
    });
  };

  const handleUpdateField = (
    index: number,
    field: keyof ImportItem,
    value: string | undefined
  ) => {
    setItems((current) => {
      const copy = [...current];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (copy[index] as any)[field] = value;
      return copy;
    });
  };

  const handleConfirmarImportar = () => {
    const listadoFinal: Partial<PotencialCliente>[] = items.map((x) => ({
      id: `pot_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      nombre: x.nombre,
      contacto: x.contacto,
      tipoServicio: x.tipoServicio,
      pitch: x.pitch,
      rubro: x.rubro || "General",
      whatsapp: x.whatsapp,
      email: x.email,
      instagram: x.instagram,
      facebook: x.facebook,
      estadoContacto: "Pendiente",
      direccion: [
        x.direccionCalle,
        x.direccionCodigoPostal,
        x.direccionCiudad,
        x.direccionProvincia,
        x.direccionPais,
      ]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", "),
      direccionCalle: x.direccionCalle,
      direccionCodigoPostal: x.direccionCodigoPostal,
      direccionCiudad: x.direccionCiudad,
      direccionProvincia: x.direccionProvincia,
      direccionPais: x.direccionPais,
      visitado: false,
      visitasCount: 0,
      convertido: false,
      latitud: x.latitud,
      longitud: x.longitud,
      creadoEn: Date.now(),
      actualizadoEn: Date.now(),
    }));

    onConfirmarImportacion(listadoFinal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="animate-in zoom-in flex max-h-[85vh] w-full max-w-5xl flex-col overflow-y-auto rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6 shadow-2xl duration-150">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
          <div className="flex items-center gap-2">
            <Icono.Upload className="h-5 w-5 text-emerald-400" />
            <h3 className="font-mono text-base font-extrabold tracking-tight text-white">
              Importar Potenciales Clientes (JSON)
            </h3>
          </div>
          <button
            onClick={onCerrar}
            className="p-1 text-zinc-500 hover:text-zinc-300"
          >
            <Icono.Close className="h-5 w-5" />
          </button>
        </div>

        {paso === "cargar" ? (
          <div className="flex flex-col gap-4">
            {/* Template Selector */}
            <div className="flex rounded-xl border border-[#2A2A2E] bg-zinc-950 p-1">
              <button
                type="button"
                onClick={() => setTipoImportacion("basica")}
                className={`flex-1 rounded-lg py-2 text-center font-mono text-xs font-bold transition-all ${
                  tipoImportacion === "basica"
                    ? "bg-emerald-500 text-black shadow-lg"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Importación Básica (Simplificada)
              </button>
              <button
                type="button"
                onClick={() => setTipoImportacion("completa")}
                className={`flex-1 rounded-lg py-2 text-center font-mono text-xs font-bold transition-all ${
                  tipoImportacion === "completa"
                    ? "bg-emerald-500 text-black shadow-lg"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Importación Completa (Con Argumento/Pitch)
              </button>
            </div>

            <div className="flex flex-col gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-zinc-300">
                  Plantilla de Entrada (
                  {tipoImportacion === "basica" ? "Básica" : "Completa"})
                </span>
                <button
                  type="button"
                  onClick={handleCopiarTemplate}
                  className="rounded-lg border border-[#2A2A2E] bg-zinc-900 px-2.5 py-1 font-mono text-[10px] text-emerald-400 transition-all hover:bg-zinc-800"
                >
                  {copiado ? "✓ Copiado" : "Copiar Plantilla"}
                </button>
              </div>
              <p className="mt-2 font-mono text-[10px] leading-normal text-zinc-500">
                Genera tu JSON con la dirección dividida en campos e incluye el
                rubro (`rubro`), celular (`whatsapp`), email (`email`) e
                instagram (`instagram`) para alimentar la Inteligencia Comercial
                y el planificador digital.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs font-bold text-zinc-400">
                Pega el JSON aquí:
              </label>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder={
                  tipoImportacion === "basica"
                    ? '[\n  {\n    "nombre": "Panadería Colón",\n    "rubro": "Gastronomía",\n    "whatsapp": "+5492914123456",\n    "instagram": "@panaderia_colon",\n    "direccionCalle": "Av. Colón 450",\n    "direccionCodigoPostal": "8000",\n    "direccionCiudad": "Bahía Blanca",\n    "direccionProvincia": "Buenos Aires",\n    "direccionPais": "Argentina",\n    "tipoServicio": "Página Web y Menú QR"\n  }\n]'
                    : '[\n  {\n    "nombre": "Panadería Colón",\n    "rubro": "Gastronomía",\n    "contacto": "Roberto (Dueño)",\n    "whatsapp": "+5492914123456",\n    "email": "roberto@colon.com",\n    "instagram": "@panaderiacolon",\n    "facebook": "",\n    "tipoServicio": "Página Web y Menú QR",\n    "pitch": "Digitalizar su cartelería física con código QR dinámico",\n    "direccionCalle": "Av. Colón 450",\n    "direccionCodigoPostal": "8000",\n    "direccionCiudad": "Bahía Blanca",\n    "direccionProvincia": "Buenos Aires",\n    "direccionPais": "Argentina"\n  }\n]'
                }
                rows={12}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-100 placeholder-zinc-700 transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 focus:outline-none"
              />
            </div>

            {errorJson && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 font-mono text-xs text-red-400">
                {errorJson}
              </div>
            )}

            <div className="mt-2 flex justify-end gap-3 border-t border-[#2A2A2E] pt-4">
              <button
                onClick={onCerrar}
                className="rounded-xl bg-zinc-800 px-4 py-2.5 font-mono text-xs font-bold text-zinc-100 transition-all hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleValidarJSON}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 font-mono text-xs font-bold text-black transition-all hover:bg-emerald-600 active:scale-95"
              >
                Validar y Testear Ubicaciones
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 font-mono text-[10px] text-emerald-400">
              ✓ JSON validado. Se geocodificará cada dirección. Corrige inline
              cualquier error e intenta re-testear la dirección con el botón de
              búsqueda.
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#2A2A2E] bg-zinc-950">
              <table className="w-full min-w-[950px] border-collapse text-left font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-[#2A2A2E] bg-zinc-900/50 text-zinc-500">
                    <th className="px-3 py-2.5">Negocio</th>
                    <th className="px-3 py-2.5">Rubro</th>
                    <th className="px-3 py-2.5">WhatsApp / Cel</th>
                    <th className="px-3 py-2.5">Email / Instagram</th>
                    <th className="px-3 py-2.5">Dirección</th>
                    <th className="px-3 py-2.5">Estado Mapa</th>
                    <th className="px-3 py-2.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-[#2A2A2E]/50 transition-all last:border-0 hover:bg-[#18181B]"
                    >
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.nombre}
                          onChange={(e) =>
                            handleUpdateField(idx, "nombre", e.target.value)
                          }
                          className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 font-bold text-zinc-100 focus:border-zinc-800 focus:bg-zinc-900 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.rubro}
                          onChange={(e) =>
                            handleUpdateField(idx, "rubro", e.target.value)
                          }
                          className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-zinc-300 focus:border-zinc-800 focus:bg-zinc-900 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.whatsapp}
                          onChange={(e) =>
                            handleUpdateField(idx, "whatsapp", e.target.value)
                          }
                          placeholder="Sin WhatsApp"
                          className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-zinc-300 focus:border-zinc-800 focus:bg-zinc-900 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-0.5">
                          <input
                            type="text"
                            value={item.instagram}
                            onChange={(e) =>
                              handleUpdateField(
                                idx,
                                "instagram",
                                e.target.value
                              )
                            }
                            placeholder="Instagram"
                            className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-zinc-300 focus:border-zinc-800 focus:bg-zinc-900 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={item.email}
                            onChange={(e) =>
                              handleUpdateField(idx, "email", e.target.value)
                            }
                            placeholder="Email"
                            className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-zinc-400 focus:border-zinc-800 focus:bg-zinc-900 focus:outline-none"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-0.5">
                          <input
                            type="text"
                            value={item.direccionCalle}
                            onChange={(e) =>
                              handleUpdateField(
                                idx,
                                "direccionCalle",
                                e.target.value
                              )
                            }
                            className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-zinc-300 focus:border-zinc-800 focus:bg-zinc-900 focus:outline-none"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={item.direccionCodigoPostal}
                              onChange={(e) =>
                                handleUpdateField(
                                  idx,
                                  "direccionCodigoPostal",
                                  e.target.value
                                )
                              }
                              placeholder="CP"
                              className="w-[50px] rounded border border-transparent bg-transparent px-0.5 px-1 text-[10px] text-zinc-400 focus:border-zinc-800 focus:bg-zinc-900 focus:outline-none"
                            />
                            <input
                              type="text"
                              value={item.direccionCiudad}
                              onChange={(e) =>
                                handleUpdateField(
                                  idx,
                                  "direccionCiudad",
                                  e.target.value
                                )
                              }
                              placeholder="Ciudad"
                              className="w-[80px] rounded border border-transparent bg-transparent px-0.5 px-1 text-[10px] text-zinc-400 focus:border-zinc-800 focus:bg-zinc-900 focus:outline-none"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {item.buscando ? (
                          <span className="animate-pulse text-zinc-500">
                            Buscando...
                          </span>
                        ) : item.error ? (
                          <span className="font-bold text-red-400">
                            ✗ {item.error}
                          </span>
                        ) : item.latitud ? (
                          <span
                            className="font-bold text-emerald-400"
                            title={item.direccionFormateada}
                          >
                            ✓ OK
                          </span>
                        ) : (
                          <span className="text-zinc-500">Pendiente</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => retestearFila(idx)}
                          className="rounded bg-zinc-800 p-1 text-emerald-400 transition-all hover:bg-zinc-700"
                          title="Re-testear Dirección"
                        >
                          <Icono.Search className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-2 flex justify-between border-t border-[#2A2A2E] pt-4">
              <button
                onClick={() => setPaso("cargar")}
                className="rounded-xl bg-zinc-800 px-4 py-2.5 font-mono text-xs font-bold text-zinc-100 transition-all hover:bg-zinc-700"
              >
                ← Volver a Cargar
              </button>
              <button
                onClick={handleConfirmarImportar}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 font-mono text-xs font-bold text-black transition-all hover:bg-emerald-600 active:scale-95"
              >
                Confirmar Importación ({items.length})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
