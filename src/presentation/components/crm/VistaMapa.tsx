"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card } from "../card";

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

interface VistaMapaProps {
  clientes: ClienteCRM[];
}

export const VistaMapa: React.FC<VistaMapaProps> = ({ clientes }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // 1. Load Leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.id = "leaflet-css";
    if (!document.getElementById("leaflet-css")) {
      document.head.appendChild(link);
    }

    // 2. Load Leaflet JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.id = "leaflet-js";
    script.onload = () => setMapLoaded(true);

    if (!document.getElementById("leaflet-js")) {
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

    const defaultLat = -34.6037;
    const defaultLng = -58.3816;

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

          const userCircle = L.circle([uLat, uLng], {
            color: "#10B981",
            fillColor: "#10B981",
            fillOpacity: 0.15,
            radius: 120,
          }).addTo(map);
          userCircle.bindPopup("<b>Mi Ubicación Actual</b>").openPopup();
        },
        () => {
          fitClientsBounds(map, L);
        }
      );
    } else {
      fitClientsBounds(map, L);
    }

    clientes.forEach((c) => {
      if (c.latitud && c.longitud) {
        const marker = L.marker([c.latitud, c.longitud]).addTo(map);
        const popupContent = `
          <div style="font-family: monospace; font-size: 11px;">
            <b style="color: #10B981; font-size: 12px;">${c.nombre || c.empresa}</b><br/>
            <span><b>Estado:</b> ${c.estado}</span><br/>
            <span><b>Dirección:</b> ${c.direccion || "Sin dirección"}</span><br/>
            <a href="https://www.google.com/maps/search/?api=1&query=${c.latitud},${c.longitud}" target="_blank" style="color: #10B981; text-decoration: underline; display: block; margin-top: 5px;">Abrir en Google Maps</a>
          </div>
        `;
        marker.bindPopup(popupContent);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function fitClientsBounds(mapObj: any, LObj: any) {
      const validCoords = clientes
        .filter((c) => c.latitud && c.longitud)
        .map((c) => [c.latitud, c.longitud] as [number, number]);

      if (validCoords.length > 0) {
        const bounds = LObj.latLngBounds(validCoords);
        mapObj.fitBounds(bounds, { padding: [30, 30] });
      }
    }
  }, [mapLoaded, clientes]);

  return (
    <Card>
      <div className="mb-4 border-b border-[#2A2A2E] pb-4">
        <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-100 uppercase">
          Geolocalización de Clientes
        </h3>
        <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
          Coordenadas reales geocodificadas para gestión territorial
        </p>
      </div>

      <div className="relative h-[400px] w-full overflow-hidden rounded-2xl border border-[#2A2A2E] bg-zinc-950">
        <div ref={mapRef} className="z-10 h-full w-full" />
        {!mapLoaded && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950 font-mono text-xs text-zinc-500">
            Cargando visor cartográfico Leaflet...
          </div>
        )}
      </div>
    </Card>
  );
};
