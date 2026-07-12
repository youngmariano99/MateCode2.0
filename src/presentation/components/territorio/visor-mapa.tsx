"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card } from "../card";

interface MarkerProspecto {
  id: string;
  nombre: string;
  latitud?: number;
  longitud?: number;
  visitado?: boolean;
  convertido?: boolean;
  direccion?: string;
  tipoServicio?: string;
  contacto?: string;
}

interface VisorMapaProps {
  clientes: MarkerProspecto[];
  rutaPuntos?: { id: string; nombre: string }[];
}

export const VisorMapa: React.FC<VisorMapaProps> = ({
  clientes,
  rutaPuntos = [],
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // 1. Load Leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.id = "leaflet-css-territorio";
    if (!document.getElementById("leaflet-css-territorio")) {
      document.head.appendChild(link);
    }

    // 2. Load Leaflet JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.id = "leaflet-js-territorio";
    script.onload = () => setMapLoaded(true);

    if (!document.getElementById("leaflet-js-territorio")) {
      document.head.appendChild(script);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).L) {
        Promise.resolve().then(() => setMapLoaded(true));
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const defaultLat = -38.7183;
    const defaultLng = -62.2663;

    const map = L.map(mapRef.current).setView([defaultLat, defaultLng], 12);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const uLat = position.coords.latitude;
          const uLng = position.coords.longitude;
          map.setView([uLat, uLng], 13);

          L.circle([uLat, uLng], {
            color: "#3B82F6",
            fillColor: "#3B82F6",
            fillOpacity: 0.15,
            radius: 150,
          })
            .addTo(map)
            .bindPopup("<b>Mi Posición Actual</b>")
            .openPopup();
        },
        () => {
          fitRouteBounds(map, L);
        }
      );
    } else {
      fitRouteBounds(map, L);
    }

    const routeCoords: [number, number][] = [];

    // Prepend user position to route path if "mi_posicion_actual" is in the route
    if (rutaPuntos.some((rp) => rp.id === "mi_posicion_actual")) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          routeCoords.push([pos.coords.latitude, pos.coords.longitude]);
        });
      }
    }

    clientes.forEach((c) => {
      if (c.latitud && c.longitud) {
        const isEnRuta = rutaPuntos.some((rp) => rp.id === c.id);
        const routeOrder = rutaPuntos.findIndex((rp) => rp.id === c.id) + 1;

        let colorHex = "#10B981"; // Active: Emerald-500
        let labelEstado = "Prospecto Activo";
        if (c.convertido) {
          colorHex = "#6B7280"; // Converted to CRM: Gray-500
          labelEstado = "Convertido a Cliente";
        } else if (c.visitado) {
          colorHex = "#F59E0B"; // Visited: Amber-500
          labelEstado = "Visitado (Prospecto)";
        }

        const iconHtml = `
          <div style="background-color: ${colorHex}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 7px; color: white; font-weight: bold;">
            ${isEnRuta ? routeOrder : ""}
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "custom-marker-icon",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([c.latitud, c.longitud], {
          icon: customIcon,
        }).addTo(map);

        const popupContent = `
          <div style="font-family: monospace; font-size: 11px; min-width: 160px;">
            <b style="color: ${colorHex}; font-size: 12px; display: block; margin-bottom: 4px;">${c.nombre}</b>
            <span><b>Estado:</b> ${labelEstado}</span><br/>
            ${c.contacto ? `<span><b>Contacto:</b> ${c.contacto}</b><br/>` : ""}
            ${c.tipoServicio ? `<span><b>Servicio:</b> ${c.tipoServicio}</b><br/>` : ""}
            <span><b>Dirección:</b> ${c.direccion || "Sin dirección"}</span><br/>
            ${isEnRuta ? `<b style="color: #10B981; display: block; margin-top: 4px;">Parada #${routeOrder} en tu Ruta Activa</b>` : ""}
            <a href="https://www.google.com/maps/search/?api=1&query=${c.latitud},${c.longitud}" target="_blank" style="color: #3B82F6; text-decoration: underline; display: block; margin-top: 6px; font-weight: bold;">Navegar ↗</a>
          </div>
        `;
        marker.bindPopup(popupContent);
      }
    });

    rutaPuntos.forEach((rp) => {
      if (rp.id === "mi_posicion_actual") return;
      const match = clientes.find((c) => c.id === rp.id);
      if (match && match.latitud && match.longitud) {
        routeCoords.push([match.latitud, match.longitud]);
      }
    });

    if (routeCoords.length > 1) {
      L.polyline(routeCoords, {
        color: "#10B981",
        weight: 3,
        opacity: 0.8,
        dashArray: "6, 12",
      }).addTo(map);

      const bounds = L.latLngBounds(routeCoords);
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function fitRouteBounds(mapObj: any, LObj: any) {
      const validCoords = clientes
        .filter((c) => c.latitud && c.longitud)
        .map((c) => [c.latitud, c.longitud] as [number, number]);

      if (validCoords.length > 0) {
        const bounds = LObj.latLngBounds(validCoords);
        mapObj.fitBounds(bounds, { padding: [30, 30] });
      }
    }
  }, [mapLoaded, clientes, rutaPuntos]);

  return (
    <Card>
      <div className="mb-4 border-b border-[#2A2A2E] pb-3">
        <h4 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
          Mapa General de Prospección
        </h4>
        <p className="font-mono text-[10px] text-zinc-500">
          Ubicación de potenciales clientes y recorridos óptimos de campo
        </p>
      </div>

      <div className="relative h-[360px] w-full overflow-hidden rounded-xl border border-[#2A2A2E] bg-zinc-950">
        <div ref={mapRef} className="z-10 h-full w-full" />

        {!mapLoaded ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950 font-mono text-xs text-zinc-500">
            Cargando mapa interactivo...
          </div>
        ) : (
          <>
            <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-1.5 rounded-lg border border-[#2A2A2E] bg-[#18181B]/95 p-2.5 font-mono text-[9px] text-zinc-400 backdrop-blur-sm">
              <span className="mb-0.5 animate-pulse font-bold tracking-wider text-white uppercase">
                Estados
              </span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Activo (Sin Visitar)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Visitado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gray-500" />
                <span>Convertido a Cliente</span>
              </div>
            </div>

            {rutaPuntos.length > 1 && (
              <div className="absolute top-3 right-3 z-20 rounded-lg border border-emerald-500/20 bg-[#18181B]/90 p-2 font-mono text-[9px] font-bold text-emerald-400 backdrop-blur-sm">
                ✓ Ruta Activa: {rutaPuntos.length} paradas optimizadas
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};
