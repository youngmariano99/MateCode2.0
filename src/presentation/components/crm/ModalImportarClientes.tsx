"use client";

import React, { useState } from "react";
import { Icono } from "../icons";
import { OpenStreetMapGeocodificacionStrategy } from "../../../application/services/territorio/geocodificacion.strategy";

export interface ClienteCRM {
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

interface ImportItem {
  nombre: string;
  empresa?: string;
  correo?: string;
  telefono?: string;
  whatsapp?: string;
  direccionCalle: string;
  direccionCiudad: string;
  direccionProvincia: string;
  direccionPais: string;
  estado?: string;
  origenContacto?: string;
  responsable?: string;
  etiquetas?: string[];
  observaciones?: string;

  // Geocoding state
  buscando: boolean;
  error?: string;
  latitud?: number;
  longitud?: number;
  direccionFormateada?: string;
}

interface ModalImportarClientesProps {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmarImportacion: (clientes: Partial<ClienteCRM>[]) => void;
}

export const ModalImportarClientes: React.FC<ModalImportarClientesProps> = ({
  abierto,
  onCerrar,
  onConfirmarImportacion,
}) => {
  const [jsonText, setJsonText] = useState("");
  const [errorJson, setErrorJson] = useState<string | null>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [paso, setPaso] = useState<"cargar" | "verificar">("cargar");
  const [copiado, setCopiado] = useState(false);

  const jsonTemplate = [
    {
      nombre: "Juguetería y libreria Vieytes",
      empresa: "Juguetería y libreria Vieytes",
      correo: "contacto@vieytes.com",
      telefono: "+54 291 123-4567",
      whatsapp: "+54 9 291 123-4567",
      direccionCalle: "Vieytes 539",
      direccionCiudad: "Bahía Blanca",
      direccionProvincia: "Buenos Aires",
      direccionPais: "Argentina",
      estado: "Contacto Detectado",
      origenContacto: "Contacto en Frío",
      responsable: "Mariano",
      etiquetas: ["Frío", "Juguetería"],
      observaciones: "Llamar por la tarde",
    },
    {
      nombre: "Café Central Colón",
      empresa: "Café Central",
      correo: "info@cafecentral.com",
      direccionCalle: "Av. Colón 120",
      direccionCiudad: "Bahía Blanca",
      direccionProvincia: "Buenos Aires",
      direccionPais: "Argentina",
      estado: "Leads",
      origenContacto: "Web",
      etiquetas: ["Cafetería"],
    },
  ];

  if (!abierto) return null;

  const handleCopiarTemplate = () => {
    navigator.clipboard.writeText(JSON.stringify(jsonTemplate, null, 2));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleValidarJSON = async () => {
    try {
      setErrorJson(null);
      const parsed = JSON.parse(jsonText);

      const parsedArray = Array.isArray(parsed) ? parsed : [parsed];

      // Map properties with safe fallbacks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: ImportItem[] = parsedArray.map((x: any) => ({
        nombre: String(x.nombre || x.empresa || "Contacto Sin Nombre").trim(),
        empresa: String(x.empresa || x.nombre || "").trim(),
        correo: String(x.correo || "").trim(),
        telefono: String(x.telefono || "").trim(),
        whatsapp: String(x.whatsapp || "").trim(),
        direccionCalle: String(x.direccionCalle || "").trim(),
        direccionCiudad: String(x.direccionCiudad || "").trim(),
        direccionProvincia: String(x.direccionProvincia || "").trim(),
        direccionPais: String(x.direccionPais || "Argentina").trim(),
        estado: String(x.estado || "Contacto Detectado").trim(),
        origenContacto: String(x.origenContacto || "Contacto en Frío").trim(),
        responsable: String(x.responsable || "Mariano").trim(),
        etiquetas: Array.isArray(x.etiquetas) ? x.etiquetas : [],
        observaciones: String(x.observaciones || "").trim(),
        buscando: false,
      }));

      setItems(mapped);
      setPaso("verificar");

      // Automatically trigger batch geocoding
      void ejecutarGeocodificacionLote(mapped);
    } catch (e: unknown) {
      setErrorJson(
        `JSON inválido: ${(e as Error).message || "Error de sintaxis"}`
      );
    }
  };

  const ejecutarGeocodificacionLote = async (lote: ImportItem[]) => {
    const strategy = new OpenStreetMapGeocodificacionStrategy();

    // Geocode sequential to avoid Nominatim rate-limit issues
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
    value: string | string[] | number | undefined
  ) => {
    setItems((current) => {
      const copy = [...current];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (copy[index] as any)[field] = value;
      return copy;
    });
  };

  const handleConfirmarImportar = () => {
    const listadoFinal: Partial<ClienteCRM>[] = items.map((x) => ({
      id: `cli_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      nombre: x.nombre,
      empresa: x.empresa,
      correo: x.correo,
      telefono: x.telefono,
      whatsapp: x.whatsapp,
      direccion: [
        x.direccionCalle,
        x.direccionCiudad,
        x.direccionProvincia,
        x.direccionPais,
      ]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", "),
      direccionCalle: x.direccionCalle,
      direccionCiudad: x.direccionCiudad,
      direccionProvincia: x.direccionProvincia,
      direccionPais: x.direccionPais,
      observaciones: x.observaciones,
      origenContacto: x.origenContacto,
      estado: x.estado || "Contacto Detectado",
      responsable: x.responsable,
      etiquetas: x.etiquetas,
      latitud: x.latitud ?? -34.6 + Math.random() * 0.1,
      longitud: x.longitud ?? -58.4 - Math.random() * 0.1,
      favorito: false,
    }));

    onConfirmarImportacion(listadoFinal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="animate-in zoom-in flex max-h-[85vh] w-full max-w-4xl flex-col overflow-y-auto rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6 shadow-2xl duration-150">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
          <div className="flex items-center gap-2">
            <Icono.Upload className="h-5 w-5 text-emerald-400" />
            <h3 className="font-mono text-base font-extrabold tracking-tight text-white">
              Importador Masivo de Negocios (JSON)
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
            <div className="flex flex-col gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-zinc-300">
                  Plantilla de Entrada JSON para IAs
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
                Pasa esta estructura a tu Asistente de IA o exportador y pídele
                que genere la lista de comercios mapeados en este formato de
                array.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs font-bold text-zinc-400">
                Pega el JSON aquí:
              </label>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='[{"nombre": "Ejemplo Comercio", "direccionCalle": "Calle Falsa 123", "direccionCiudad": "Bahía Blanca"}]'
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
              ✓ JSON cargado con éxito. Se está realizando la comprobación de
              direcciones geográficas mediante Nominatim. Puedes editar
              directamente cualquier fila errónea e intentar re-testear.
            </div>

            {/* List and inline editor */}
            <div className="overflow-x-auto rounded-xl border border-[#2A2A2E] bg-zinc-950">
              <table className="w-full min-w-[700px] border-collapse text-left font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-[#2A2A2E] bg-zinc-900/50 text-zinc-500">
                    <th className="px-3 py-2.5">Comercio</th>
                    <th className="px-3 py-2.5">Calle y Altura</th>
                    <th className="px-3 py-2.5">Ciudad / Provincia</th>
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
                      </td>
                      <td className="flex gap-1 px-3 py-2">
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
                          className="w-1/2 rounded border border-transparent bg-transparent px-1 py-0.5 text-zinc-400 focus:border-zinc-800 focus:bg-zinc-900 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={item.direccionProvincia}
                          onChange={(e) =>
                            handleUpdateField(
                              idx,
                              "direccionProvincia",
                              e.target.value
                            )
                          }
                          placeholder="Provincia"
                          className="w-1/2 rounded border border-transparent bg-transparent px-1 py-0.5 text-zinc-400 focus:border-zinc-800 focus:bg-zinc-900 focus:outline-none"
                        />
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
                            ✓ OK ({item.latitud.toFixed(4)},{" "}
                            {item.longitud?.toFixed(4)})
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
