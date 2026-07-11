"use client";

import React, { useState } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { Select } from "../select";
import { CalcularRecorridoUseCase } from "../../../application/use-cases/territorio/calcular-recorrido.use-case";
import {
  GoogleMapsNavegacionStrategy,
  AppleMapsNavegacionStrategy,
  WazeNavegacionStrategy,
} from "../../../application/services/territorio/navegacion.strategy";
import { useToast } from "../../hooks/useToast";

interface ClienteGeocodificado {
  id: string;
  nombre: string;
  latitud?: number;
  longitud?: number;
  direccion?: string;
}

interface PlanificadorDiarioProps {
  clientes: ClienteGeocodificado[];
  onRutaCalculada: (puntos: { id: string; nombre: string }[]) => void;
  onRegistrarVisitaClick: (c: ClienteGeocodificado) => void;
}

export const PlanificadorDiario: React.FC<PlanificadorDiarioProps> = ({
  clientes,
  onRutaCalculada,
  onRegistrarVisitaClick,
}) => {
  const { mostrarToast } = useToast();
  const routeUC = new CalcularRecorridoUseCase();

  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [iniciarDesdeGps, setIniciarDesdeGps] = useState(false);
  const [proveedorRuta, setProveedorRuta] = useState<"GraphHopper" | "OSRM">(
    "GraphHopper"
  );
  const [proveedorGps, setProveedorGps] = useState<"Google" | "Apple" | "Waze">(
    "Google"
  );

  const [rutaResultado, setRutaResultado] = useState<{
    puntos: {
      id: string;
      nombre: string;
      latitud: number;
      longitud: number;
    }[];
    distanciaKm: number;
    duracionMin: number;
    proveedor: string;
  } | null>(null);

  const toggleSeleccion = (id: string) => {
    if (seleccionados.includes(id)) {
      setSeleccionados(seleccionados.filter((s) => s !== id));
    } else {
      setSeleccionados([...seleccionados, id]);
    }
  };

  const handleCalcularRuta = async () => {
    let seleccionadosInfo = clientes
      .filter((c) => seleccionados.includes(c.id) && c.latitud && c.longitud)
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        latitud: c.latitud!,
        longitud: c.longitud!,
      }));

    if (iniciarDesdeGps) {
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
            });
          }
        );
        const gpsPoint = {
          id: "mi_posicion_actual",
          nombre: "Mi Posición Actual",
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
        };
        // Prepend GPS start coordinates as first element of route selection
        seleccionadosInfo = [gpsPoint, ...seleccionadosInfo];
      } catch {
        mostrarToast(
          "No se pudo obtener tu ubicación actual. Asegúrate de dar permisos de GPS.",
          "error"
        );
        return;
      }
    }

    if (seleccionadosInfo.length < 2) {
      mostrarToast(
        "Selecciona al menos 2 clientes para optimizar recorrido.",
        "error"
      );
      return;
    }

    const res = await routeUC.ejecutar(seleccionadosInfo, proveedorRuta);
    if (res.ok) {
      const val = res.valor;
      setRutaResultado(val);
      onRutaCalculada(val.puntos.map((p) => ({ id: p.id, nombre: p.nombre })));
      mostrarToast(
        `Ruta optimizada con ${val.proveedor}. Total: ${val.distanciaKm} km.`,
        "exito"
      );
    }
  };

  const openNavigation = (lat: number, lng: number, label: string) => {
    const strategies = {
      Google: new GoogleMapsNavegacionStrategy(),
      Apple: new AppleMapsNavegacionStrategy(),
      Waze: new WazeNavegacionStrategy(),
    };
    const url = strategies[proveedorGps].obtenerUrl(lat, lng, label);
    window.open(url, "_blank");
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <div className="mb-3 border-b border-[#2A2A2E] pb-3">
          <h4 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            Planificador: Paradas y Clientes
          </h4>
          <p className="font-mono text-[10px] text-zinc-500">
            Selecciona los puntos de visita comercial
          </p>
        </div>

        <div className="mb-4 flex max-h-[220px] flex-col gap-2 overflow-y-auto pr-1">
          {clientes.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-2.5 font-mono text-xs text-zinc-300 transition-all select-none hover:border-zinc-800"
            >
              <input
                type="checkbox"
                checked={seleccionados.includes(c.id)}
                onChange={() => toggleSeleccion(c.id)}
                className="cursor-pointer rounded border-[#2A2A2E] bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
              />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-zinc-100">{c.nombre}</span>
                {c.latitud && c.longitud ? (
                  <span className="text-[9px] text-emerald-400">
                    ✓ Geolocalizado
                  </span>
                ) : (
                  <span className="text-[9px] text-red-400">
                    ✗ Sin coordenadas
                  </span>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <Select
            label="Motor de cálculo"
            options={[
              { value: "GraphHopper", label: "GraphHopper API" },
              { value: "OSRM", label: "OSRM Server" },
            ]}
            value={proveedorRuta}
            onChange={(val) => setProveedorRuta(val as "GraphHopper" | "OSRM")}
          />
          <Select
            label="Aplicación GPS"
            options={[
              { value: "Google", label: "Google Maps" },
              { value: "Apple", label: "Apple Maps" },
              { value: "Waze", label: "Waze app" },
            ]}
            value={proveedorGps}
            onChange={(val) =>
              setProveedorGps(val as "Google" | "Apple" | "Waze")
            }
          />
        </div>

        {/* GPS Start Location Toggle Checkbox */}
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#2A2A2E] bg-[#18181B] p-3">
          <input
            type="checkbox"
            id="chkGpsStart"
            checked={iniciarDesdeGps}
            onChange={(e) => setIniciarDesdeGps(e.target.checked)}
            className="cursor-pointer rounded border-[#2A2A2E] bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
          />
          <label
            htmlFor="chkGpsStart"
            className="cursor-pointer font-mono text-[11px] leading-normal font-bold text-zinc-300 select-none"
          >
            Iniciar recorrido desde mi ubicación actual
          </label>
        </div>

        <Button onClick={handleCalcularRuta} className="w-full">
          Calcular Recorrido Óptimo
        </Button>
      </Card>

      <Card>
        <div className="mb-3 border-b border-[#2A2A2E] pb-3">
          <h4 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            Recorrido Optimizado
          </h4>
          {rutaResultado ? (
            <p className="font-mono text-[10px] text-emerald-400">
              Distancia: {rutaResultado.distanciaKm} km • Duración:{" "}
              {rutaResultado.duracionMin} min ({rutaResultado.proveedor})
            </p>
          ) : (
            <p className="font-mono text-[10px] text-zinc-500">
              Calcula un recorrido para visualizar las paradas
            </p>
          )}
        </div>

        <div className="flex max-h-[300px] flex-col gap-2.5 overflow-y-auto pr-1">
          {!rutaResultado ? (
            <span className="py-10 text-center font-mono text-xs text-zinc-500 italic">
              Completa el cálculo de ruta en la columna izquierda.
            </span>
          ) : (
            rutaResultado.puntos.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3 font-mono text-xs transition-all hover:border-zinc-800"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-zinc-100">
                    Parada #{idx + 1}: {p.nombre}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    Lat: {p.latitud.toFixed(5)} • Lng: {p.longitud.toFixed(5)}
                  </span>
                </div>
                <div className="flex gap-2">
                  {p.id !== "mi_posicion_actual" && (
                    <button
                      onClick={() => onRegistrarVisitaClick(p)}
                      className="rounded-lg border border-emerald-500/20 bg-emerald-600/10 px-2 py-1 text-[10px] font-bold text-emerald-400 transition-all hover:bg-emerald-600 hover:text-black"
                    >
                      Visitar
                    </button>
                  )}
                  <button
                    onClick={() =>
                      openNavigation(p.latitud, p.longitud, p.nombre)
                    }
                    className="rounded-lg border border-[#2A2A2E] bg-zinc-900 px-2 py-1 text-[10px] font-bold text-zinc-300 transition-all hover:bg-zinc-800"
                  >
                    Navegar ↗
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
