"use client";

import React, { useState } from "react";
import { MainLayout } from "../../../presentation/components/layout";
import { Card } from "../../../presentation/components/card";
import { Button } from "../../../presentation/components/button";
import { useToast } from "../../../presentation/hooks/useToast";
import { db } from "../../../offline/dexie/db";
import { useLiveQuery } from "dexie-react-hooks";
import { GeocodificarDireccionUseCase } from "../../../application/use-cases/territorio/geocodificar-direccion.use-case";
import { RegistrarVisitaUseCase } from "../../../application/use-cases/territorio/registrar-visita.use-case";
import { GoogleMapsNavegacionStrategy } from "../../../application/services/territorio/navegacion.strategy";

// Sub-views
import { VisorMapa } from "../../../presentation/components/territorio/visor-mapa";
import { PlanificadorDiario } from "../../../presentation/components/territorio/planificador-diario";
import { ModoCalle } from "../../../presentation/components/territorio/modo-calle";
import { ModalVisita } from "../../../presentation/components/territorio/modal-visita";

interface ClienteCRM {
  id: string;
  nombre: string;
  correo: string;
  estado: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  empresa?: string;
  telefono?: string;
  whatsapp?: string;
  ultimaVisita?: number;
}

export default function TerritorioPage() {
  const { mostrarToast } = useToast();
  const geocodeUC = new GeocodificarDireccionUseCase();
  const visitaUC = new RegistrarVisitaUseCase();

  const [modoCelular, setModoCelular] = useState(false);
  const [rutaPuntos, setRutaPuntos] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [modalVisitaCliente, setModalVisitaCliente] =
    useState<ClienteCRM | null>(null);

  const rawClientes = useLiveQuery(() => db.clientes.toArray()) || [];
  const clientes = rawClientes as unknown as ClienteCRM[];

  const geocodificarFaltantes = async () => {
    let cnt = 0;
    for (const c of clientes) {
      if (!c.latitud && c.direccion?.trim()) {
        const res = await geocodeUC.ejecutar(c.id, c.direccion);
        if (res.ok) cnt++;
      }
    }
    if (cnt > 0) {
      mostrarToast(
        `Se geocodificaron ${cnt} direcciones automáticamente.`,
        "exito"
      );
    } else {
      mostrarToast("Todas las direcciones están geocodificadas.", "info");
    }
  };

  const handleConfirmarVisita = async (payload: {
    horaLlegada: string;
    horaSalida: string;
    resultado: string;
    notas: string;
  }) => {
    if (!modalVisitaCliente) return;
    const res = await visitaUC.ejecutar({
      clienteId: modalVisitaCliente.id,
      ...payload,
    });

    if (res.ok) {
      mostrarToast("Visita registrada comercialmente en el CRM.", "exito");
      setModalVisitaCliente(null);
    }
  };

  const handleNavegarModoCalle = (p: {
    id: string;
    nombre: string;
    latitud?: number;
    longitud?: number;
  }) => {
    if (!p.latitud || !p.longitud) return;
    const strategy = new GoogleMapsNavegacionStrategy();
    const url = strategy.obtenerUrl(p.latitud, p.longitud, p.nombre);
    window.open(url, "_blank");
  };

  const paradasModoCalle = rutaPuntos.map((rp) => {
    const matched = clientes.find((c) => c.id === rp.id);
    return {
      id: rp.id,
      nombre: rp.nombre,
      direccion: matched?.direccion,
      telefono: matched?.telefono,
      whatsapp: matched?.whatsapp,
      latitud: matched?.latitud,
      longitud: matched?.longitud,
    };
  });

  const geocodificados = clientes.filter((c) => c.latitud && c.longitud);
  const visitasRealizadas = clientes.filter((c) => c.ultimaVisita).length;

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Inteligencia Territorial" },
  ];

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#2A2A2E] pb-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Inteligencia Territorial Comercial
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Geocodificación offline, optimización y visitas de campo Mobile
              First.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={geocodificarFaltantes}>
              Geocodificar Direcciones
            </Button>
            <button
              onClick={() => setModoCelular(!modoCelular)}
              className={`rounded-xl border px-4 py-2.5 font-mono text-xs font-bold transition-all select-none ${
                modoCelular
                  ? "border-emerald-500 bg-emerald-500 text-zinc-950 hover:bg-emerald-600"
                  : "border-[#2A2A2E] bg-[#18181B] text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {modoCelular ? "Volver a Escritorio" : "Modo Calle (Celular)"}
            </button>
          </div>
        </div>

        {!modoCelular && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
                Clientes Totales
              </span>
              <span className="mt-1 block font-mono text-xl font-bold text-white">
                {clientes.length}
              </span>
            </Card>
            <Card>
              <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
                Geocodificados
              </span>
              <span className="mt-1 block font-mono text-xl font-bold text-emerald-400">
                {geocodificados.length} / {clientes.length}
              </span>
            </Card>
            <Card>
              <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
                Visitas Hechas
              </span>
              <span className="mt-1 block font-mono text-xl font-bold text-blue-400">
                {visitasRealizadas}
              </span>
            </Card>
          </div>
        )}

        {modoCelular ? (
          <ModoCalle
            paradas={paradasModoCalle}
            onRegistrarVisita={(p) =>
              setModalVisitaCliente(clientes.find((c) => c.id === p.id) || null)
            }
            onNavegar={handleNavegarModoCalle}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <VisorMapa clientes={clientes} rutaPuntos={rutaPuntos} />
            <PlanificadorDiario
              clientes={clientes}
              onRutaCalculada={setRutaPuntos}
              onRegistrarVisitaClick={(c) =>
                setModalVisitaCliente(
                  clientes.find((cl) => cl.id === c.id) || null
                )
              }
            />
          </div>
        )}

        <ModalVisita
          abierto={!!modalVisitaCliente}
          onCerrar={() => setModalVisitaCliente(null)}
          onConfirmar={handleConfirmarVisita}
          clienteNombre={modalVisitaCliente?.nombre || ""}
        />
      </div>
    </MainLayout>
  );
}
