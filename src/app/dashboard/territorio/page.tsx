"use client";

import React, { useState } from "react";
import { MainLayout } from "../../../presentation/components/layout";
import { Card } from "../../../presentation/components/card";
import { Button } from "../../../presentation/components/button";
import { useToast } from "../../../presentation/hooks/useToast";
import { db } from "../../../offline/dexie/db";
import { useLiveQuery } from "dexie-react-hooks";
import { VisorMapa } from "../../../presentation/components/territorio/visor-mapa";
import { PlanificadorDiario } from "../../../presentation/components/territorio/planificador-diario";
import { PlanificadorDigital } from "../../../presentation/components/territorio/planificador-digital";
import {
  ModalPotencialCliente,
  PotencialCliente,
} from "../../../presentation/components/territorio/ModalPotencialCliente";
import { ModalImportarPotenciales } from "../../../presentation/components/territorio/ModalImportarPotenciales";
import { ModalRegistrarVisitaProspecto } from "../../../presentation/components/territorio/ModalRegistrarVisitaProspecto";
import { ModalRegistrarContacto } from "../../../presentation/components/territorio/ModalRegistrarContacto";
import { ModalCliente } from "../../../presentation/components/crm/ModalCliente";

export default function TerritorioPage() {
  const { mostrarToast } = useToast();

  // Navigation workspace tabs
  const [activeTab, setActiveTab] = useState<"campo" | "digital">("campo");

  // Modals visibility
  const [modalManualAbierto, setModalManualAbierto] = useState(false);
  const [modalImportarAbierto, setModalImportarAbierto] = useState(false);
  const [modalVisitaAbierto, setModalVisitaAbierto] = useState(false);
  const [modalContactoAbierto, setModalContactoAbierto] = useState(false);
  const [modalCrmAbierto, setModalCrmAbierto] = useState(false);

  // Selected items for edit / actions
  const [prospectoEdicion, setProspectoEdicion] =
    useState<PotencialCliente | null>(null);
  const [prospectoVisita, setProspectoVisita] =
    useState<PotencialCliente | null>(null);
  const [prospectoContacto, setProspectoContacto] =
    useState<PotencialCliente | null>(null);
  const [prospectoAConvertir, setProspectoAConvertir] =
    useState<PotencialCliente | null>(null);

  // Route Planning State
  const [rutaPuntos, setRutaPuntos] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [rutaGeometria, setRutaGeometria] = useState<
    [number, number][] | undefined
  >(undefined);

  // Advanced Filters
  const [filtroConversion, setFiltroConversion] = useState<
    "todos" | "potenciales" | "convertidos"
  >("potenciales");
  const [filtroVisita, setFiltroVisita] = useState<
    "todos" | "visitados" | "no_visitados"
  >("todos");
  const [filtroRubro, setFiltroRubro] = useState<string>("todos");
  const [filtroOrden, setFiltroOrden] = useState<"recientes" | "antiguos">(
    "recientes"
  );

  // Load potential clients from IndexedDB
  const rawProspectos =
    useLiveQuery(() => db.potenciales_clientes.toArray()) || [];
  const prospectos = rawProspectos as unknown as PotencialCliente[];

  // Get distinct rubros for filter dropdown
  const rubrosDisponiblesDashboard = Array.from(
    new Set(prospectos.map((p) => p.rubro || "General").filter(Boolean))
  );

  // Apply filters
  const prospectosFiltrados = prospectos
    .filter((p) => {
      // Conversion Filter
      if (filtroConversion === "potenciales" && p.convertido) return false;
      if (filtroConversion === "convertidos" && !p.convertido) return false;

      // Visit Filter
      if (filtroVisita === "visitados" && !p.visitado) return false;
      if (filtroVisita === "no_visitados" && p.visitado) return false;

      // Rubro Filter
      if (filtroRubro !== "todos" && (p.rubro || "General") !== filtroRubro)
        return false;

      return true;
    })
    .sort((a, b) => {
      if (filtroOrden === "recientes") {
        return (b.creadoEn || 0) - (a.creadoEn || 0);
      } else {
        return (a.creadoEn || 0) - (b.creadoEn || 0);
      }
    });

  // KPI calculations
  const totalProspectos = prospectos.length;
  const prospectosActivos = prospectos.filter((p) => !p.convertido).length;
  const visitadosProspectos = prospectos.filter(
    (p) => p.visitado && !p.convertido
  ).length;
  const contactadosDigitales = prospectos.filter(
    (p) => p.estadoContacto && p.estadoContacto !== "Pendiente" && !p.convertido
  ).length;

  const handleCrearOEditarProspecto = async (
    payload: Partial<PotencialCliente>
  ) => {
    try {
      if (prospectoEdicion) {
        // Edit mode
        const updated: PotencialCliente = {
          ...prospectoEdicion,
          ...payload,
          actualizadoEn: Date.now(),
        };
        await db.potenciales_clientes.put(
          updated as unknown as Record<string, unknown>
        );
        mostrarToast("Prospecto actualizado con éxito.", "exito");
      } else {
        // Create mode
        const nuevo: PotencialCliente = {
          id: `pot_${Date.now()}`,
          nombre: payload.nombre || "Prospecto Sin Nombre",
          contacto: payload.contacto || "",
          tipoServicio: payload.tipoServicio || "",
          pitch: payload.pitch || "",
          rubro: payload.rubro || "General",
          whatsapp: payload.whatsapp || "",
          email: payload.email || "",
          instagram: payload.instagram || "",
          facebook: payload.facebook || "",
          direccion: payload.direccion || "",
          direccionCalle: payload.direccionCalle || "",
          direccionCodigoPostal: payload.direccionCodigoPostal || "",
          direccionCiudad: payload.direccionCiudad || "",
          direccionProvincia: payload.direccionProvincia || "",
          direccionPais: payload.direccionPais || "Argentina",
          visitado: false,
          visitasCount: 0,
          convertido: false,
          estadoContacto: "Pendiente",
          latitud: payload.latitud,
          longitud: payload.longitud,
          creadoEn: Date.now(),
          actualizadoEn: Date.now(),
        };
        await db.potenciales_clientes.add(
          nuevo as unknown as Record<string, unknown>
        );
        mostrarToast("Prospecto registrado con éxito.", "exito");
      }
      setModalManualAbierto(false);
      setProspectoEdicion(null);
    } catch {
      mostrarToast("Ocurrió un error al guardar el prospecto.", "error");
    }
  };

  const handleImportarLote = async (lote: Partial<PotencialCliente>[]) => {
    try {
      for (const p of lote) {
        await db.potenciales_clientes.add(
          p as unknown as Record<string, unknown>
        );
      }
      mostrarToast(
        `Se importaron ${lote.length} prospectos correctamente.`,
        "exito"
      );
      setModalImportarAbierto(false);
    } catch {
      mostrarToast("Error al importar prospectos en lote.", "error");
    }
  };

  const handleRegistrarVisita = async (resultado: {
    visitado: boolean;
    motivoNoVisita?: string;
    volverFecha?: string;
  }) => {
    if (!prospectoVisita) return;
    try {
      const updated: PotencialCliente = {
        ...prospectoVisita,
        visitado: true, // Mark as visited
        visitasCount: (prospectoVisita.visitasCount || 0) + 1,
        motivoNoVisita: resultado.motivoNoVisita,
        volverFecha: resultado.volverFecha,
        actualizadoEn: Date.now(),
      };
      await db.potenciales_clientes.put(
        updated as unknown as Record<string, unknown>
      );

      // Log activity offline
      await db.logs_sincronizacion.add({
        tipo: "exito",
        mensaje: `Visita registrada para prospecto ${prospectoVisita.nombre}. Visitado: ${resultado.visitado ? "Sí" : "No"}.`,
        fecha: Date.now(),
      });

      mostrarToast("Visita registrada comercialmente en IndexedDB.", "exito");
      setModalVisitaAbierto(false);
      setProspectoVisita(null);
    } catch {
      mostrarToast("Error al registrar la visita.", "error");
    }
  };

  const handleRegistrarContactoDigital = async (resultado: {
    canal: "whatsapp" | "email" | "instagram" | "facebook";
    estado: "Contactado" | "Respondido" | "Sin Interés";
    notas: string;
  }) => {
    if (!prospectoContacto) return;
    try {
      const updated: PotencialCliente = {
        ...prospectoContacto,
        estadoContacto: resultado.estado,
        ultimoCanalContacto: resultado.canal,
        notasContacto: resultado.notas,
        fechaUltimoContacto: Date.now(),
        actualizadoEn: Date.now(),
      };
      await db.potenciales_clientes.put(
        updated as unknown as Record<string, unknown>
      );

      // Log activity offline
      await db.logs_sincronizacion.add({
        tipo: "exito",
        mensaje: `Contacto digital registrado para prospecto ${prospectoContacto.nombre} vía ${resultado.canal} (${resultado.estado}).`,
        fecha: Date.now(),
      });

      mostrarToast("Gestión de contacto digital guardada con éxito.", "exito");
      setModalContactoAbierto(false);
      setProspectoContacto(null);
    } catch {
      mostrarToast("Error al registrar contacto digital.", "error");
    }
  };

  const handleConfirmarConversionCrm = async (
    crmPayload: Record<string, unknown>
  ) => {
    if (!prospectoAConvertir) return;
    try {
      const clienteId = `cli_${Date.now()}`;

      // 1. Insert in CRM Clientes table
      await db.clientes.add({
        id: clienteId,
        ...crmPayload,
        latitud: prospectoAConvertir.latitud,
        longitud: prospectoAConvertir.longitud,
        creadoEn: Date.now(),
      });

      // 2. Mark prospect as converted and link it
      await db.potenciales_clientes.update(prospectoAConvertir.id, {
        convertido: true,
        clienteIdRef: clienteId,
        actualizadoEn: Date.now(),
      });

      // 3. Log event
      await db.logs_sincronizacion.add({
        tipo: "exito",
        mensaje: `Prospecto '${prospectoAConvertir.nombre}' convertido con éxito en cliente CRM.`,
        fecha: Date.now(),
      });

      mostrarToast(
        "¡Felicidades! Prospecto convertido con éxito a Cliente CRM.",
        "exito"
      );
      setModalCrmAbierto(false);
      setProspectoAConvertir(null);
    } catch {
      mostrarToast("Error al convertir el prospecto.", "error");
    }
  };

  const eliminarProspecto = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este prospecto?")) {
      try {
        await db.potenciales_clientes.delete(id);
        mostrarToast("Prospecto eliminado.", "info");
      } catch {
        mostrarToast("Error al eliminar prospecto.", "error");
      }
    }
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Potenciales Clientes" },
  ];

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        {/* Header Title */}
        <div className="flex flex-col justify-between gap-4 border-b border-[#2A2A2E] pb-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Gestión de Potenciales Clientes (Prospección)
            </h1>
            <p className="mt-1 font-mono text-sm text-zinc-400">
              Inteligencia Territorial para Campo & Prospección Digital en Frío
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setProspectoEdicion(null);
                setModalManualAbierto(true);
              }}
              className="animate-in fade-in rounded-xl bg-emerald-500 px-4 py-2.5 font-mono text-xs font-bold text-zinc-950 transition-all select-none hover:bg-emerald-600 active:scale-95"
            >
              Nuevo Prospecto
            </button>
            <Button onClick={() => setModalImportarAbierto(true)}>
              Importar JSON
            </Button>
          </div>
        </div>

        {/* Stats KPIs widgets */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Card>
            <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
              Prospectos Totales
            </span>
            <span className="mt-1 block font-mono text-xl font-bold text-white">
              {totalProspectos}
            </span>
          </Card>
          <Card>
            <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
              Prospectos Activos
            </span>
            <span className="mt-1 block font-mono text-xl font-bold text-emerald-400">
              {prospectosActivos}
            </span>
          </Card>
          <Card>
            <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
              Visitas de Campo
            </span>
            <span className="mt-1 block font-mono text-xl font-bold text-amber-400">
              {visitadosProspectos}
            </span>
          </Card>
          <Card>
            <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
              Contactados por Redes
            </span>
            <span className="animate-in zoom-in mt-1 block font-mono text-xl font-bold text-pink-400">
              {contactadosDigitales}
            </span>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex rounded-xl border-b border-[#2A2A2E] bg-zinc-950/20 p-1">
          <button
            onClick={() => setActiveTab("campo")}
            className={`flex-1 rounded-lg py-2.5 text-center font-mono text-xs font-bold transition-all ${
              activeTab === "campo"
                ? "border border-zinc-800 bg-zinc-900 font-extrabold text-emerald-400 shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            📍 Prospección en Campo (Mapa y Ruteo)
          </button>
          <button
            onClick={() => setActiveTab("digital")}
            className={`flex-1 rounded-lg py-2.5 text-center font-mono text-xs font-bold transition-all ${
              activeTab === "digital"
                ? "animate-pulse-subtle border border-zinc-800 bg-zinc-900 font-extrabold text-emerald-400 shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            📱 Prospección Digital (Redes y WhatsApp)
          </button>
        </div>

        {/* Workspaces Conditional Rendering */}
        {activeTab === "campo" ? (
          <div className="animate-in fade-in flex flex-col gap-6 duration-200">
            <VisorMapa
              clientes={prospectosFiltrados}
              rutaPuntos={rutaPuntos}
              rutaGeometria={rutaGeometria}
            />

            <PlanificadorDiario
              clientes={prospectosFiltrados.filter(
                (p) => p.latitud && p.longitud
              )}
              onRutaCalculada={(puntos, geometria) => {
                setRutaPuntos(puntos);
                setRutaGeometria(geometria);
              }}
              onRegistrarVisitaClick={(c) => {
                const matched = prospectos.find((p) => p.id === c.id);
                if (matched) {
                  setProspectoVisita(matched);
                  setModalVisitaAbierto(true);
                }
              }}
            />
          </div>
        ) : (
          <div className="animate-in slide-in-from-right-3 flex flex-col gap-6 duration-200">
            <PlanificadorDigital
              clientes={prospectosFiltrados}
              onRegistrarContactoClick={(c) => {
                const matched = prospectos.find((p) => p.id === c.id);
                if (matched) {
                  setProspectoContacto(matched);
                  setModalContactoAbierto(true);
                }
              }}
            />
          </div>
        )}

        {/* Advanced Filters Panel */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#2A2A2E] bg-zinc-950 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Conversion Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
                Estado Conversión
              </label>
              <select
                value={filtroConversion}
                onChange={(e) =>
                  setFiltroConversion(e.target.value as typeof filtroConversion)
                }
                className="rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 font-mono text-xs text-zinc-300 focus:border-emerald-500 focus:outline-none"
              >
                <option value="todos">Mostrar Todos</option>
                <option value="potenciales">Solo Potenciales (Activos)</option>
                <option value="convertidos">Solo Convertidos a CRM</option>
              </select>
            </div>

            {/* Visit Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
                Estado Visita (Campo)
              </label>
              <select
                value={filtroVisita}
                onChange={(e) =>
                  setFiltroVisita(e.target.value as typeof filtroVisita)
                }
                className="rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 font-mono text-xs text-zinc-300 focus:border-emerald-500 focus:outline-none"
              >
                <option value="todos">Mostrar Todos</option>
                <option value="visitados">Visitados</option>
                <option value="no_visitados">Sin Visitar</option>
              </select>
            </div>

            {/* Rubro Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
                Filtrar Rubro
              </label>
              <select
                value={filtroRubro}
                onChange={(e) => setFiltroRubro(e.target.value)}
                className="rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 font-mono text-xs text-zinc-300 focus:border-emerald-500 focus:outline-none"
              >
                <option value="todos">Todos los Rubros</option>
                {rubrosDisponiblesDashboard.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Age Sort */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
                Antigüedad
              </label>
              <select
                value={filtroOrden}
                onChange={(e) =>
                  setFiltroOrden(e.target.value as typeof filtroOrden)
                }
                className="rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 font-mono text-xs text-zinc-300 focus:border-emerald-500 focus:outline-none"
              >
                <option value="recientes">Más recientes primero</option>
                <option value="antiguos">Más antiguos primero</option>
              </select>
            </div>
          </div>

          <span className="self-end rounded-xl border border-[#2A2A2E] bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-500">
            Mostrando <b>{prospectosFiltrados.length}</b> de{" "}
            <b>{prospectos.length}</b> registrados
          </span>
        </div>

        {/* Prospects List Grid */}
        <div className="flex flex-col gap-3">
          <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Listado de Prospectos (
            {filtroConversion === "potenciales" ? "Activos" : "Todos"})
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {prospectosFiltrados.map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl border bg-zinc-950 p-4 transition-all hover:border-zinc-800 ${
                  p.convertido
                    ? "border-zinc-800/30 opacity-70"
                    : p.visitado ||
                        (p.estadoContacto && p.estadoContacto !== "Pendiente")
                      ? "border-amber-500/20 bg-zinc-950/90"
                      : "border-[#2A2A2E]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-zinc-100">
                        {p.nombre}
                      </span>
                      <span className="py-0.2 rounded border border-zinc-800 bg-zinc-900 px-1.5 font-mono text-[9px] font-bold text-zinc-400 uppercase">
                        {p.rubro || "General"}
                      </span>
                    </div>
                    {p.contacto && (
                      <span className="font-mono text-[10px] text-zinc-400">
                        Contacto: {p.contacto}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {p.convertido ? (
                      <span className="rounded-full border border-zinc-800 bg-gray-500/10 px-2 py-0.5 font-mono text-[8px] font-bold text-zinc-400 uppercase">
                        CRM
                      </span>
                    ) : p.estadoContacto && p.estadoContacto !== "Pendiente" ? (
                      <span className="rounded-full border border-pink-500/20 bg-pink-500/10 px-2 py-0.5 font-mono text-[8px] font-bold text-pink-400 uppercase">
                        {p.estadoContacto}
                      </span>
                    ) : p.visitado ? (
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-mono text-[8px] font-bold text-amber-400 uppercase">
                        Visitado
                      </span>
                    ) : (
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[8px] font-bold text-emerald-400 uppercase">
                        Activo
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-1 border-t border-[#2A2A2E]/50 pt-2.5 font-mono text-[10px] text-zinc-400">
                  {p.direccion && (
                    <span>
                      <b>📍 Dirección:</b> {p.direccion}
                    </span>
                  )}
                  {p.tipoServicio && (
                    <span>
                      <b>💼 Servicio:</b> {p.tipoServicio}
                    </span>
                  )}
                  {p.pitch && (
                    <span>
                      <b>📣 Argumento:</b> {p.pitch}
                    </span>
                  )}

                  {/* Digital channels indicator */}
                  <div className="mt-1.5 flex gap-2 border-y border-[#2A2A2E]/20 py-1">
                    {p.whatsapp && (
                      <span className="text-[9px] text-emerald-400">
                        ✓ WA: {p.whatsapp}
                      </span>
                    )}
                    {p.email && (
                      <span className="text-[9px] text-blue-400">✓ Mail</span>
                    )}
                    {p.instagram && (
                      <span className="text-[9px] text-pink-400">✓ IG</span>
                    )}
                    {p.facebook && (
                      <span className="text-[9px] text-indigo-400">✓ FB</span>
                    )}
                  </div>

                  <span>
                    <b>🔄 Visitas Campo:</b> {p.visitasCount || 0}
                  </span>
                  {p.ultimoCanalContacto && (
                    <span>
                      <b>📱 Último Contacto:</b> por {p.ultimoCanalContacto} (
                      {p.estadoContacto})
                    </span>
                  )}
                  {p.notasContacto && (
                    <span className="mt-1 block rounded border border-[#2A2A2E]/50 bg-zinc-900/50 p-1.5 text-zinc-500 italic">
                      &quot;{p.notasContacto}&quot;
                    </span>
                  )}
                  {p.motivoNoVisita && (
                    <span className="text-red-400">
                      <b>⚠️ Salteado:</b> {p.motivoNoVisita}
                    </span>
                  )}
                  {p.volverFecha && (
                    <span className="font-bold text-blue-400">
                      <b>📅 Volver el:</b> {p.volverFecha}
                    </span>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#2A2A2E]/50 pt-3">
                  {!p.convertido && (
                    <>
                      <button
                        onClick={() => {
                          setProspectoVisita(p);
                          setModalVisitaAbierto(true);
                        }}
                        className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-amber-400 transition-all hover:bg-amber-500 hover:text-black"
                      >
                        Visita Campo
                      </button>
                      <button
                        onClick={() => {
                          setProspectoContacto(p);
                          setModalContactoAbierto(true);
                        }}
                        className="rounded-xl border border-pink-500/20 bg-pink-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-pink-400 transition-all hover:bg-pink-500 hover:text-black"
                      >
                        Log Digital
                      </button>
                      <button
                        onClick={() => {
                          setProspectoAConvertir(p);
                          setModalCrmAbierto(true);
                        }}
                        className="ml-auto rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-blue-400 transition-all hover:bg-blue-500 hover:text-black"
                      >
                        Pasar a CRM
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => {
                      setProspectoEdicion(p);
                      setModalManualAbierto(true);
                    }}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-2 py-1.5 font-mono text-[9px] text-zinc-300 transition-all hover:border-zinc-700"
                    title="Editar Prospecto"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarProspecto(p.id)}
                    className="rounded-xl border border-red-900/30 bg-red-950/20 px-2 py-1.5 font-mono text-[9px] text-red-400 transition-all hover:bg-red-900 hover:text-white"
                    title="Eliminar Prospecto"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}
            {prospectosFiltrados.length === 0 && (
              <span className="col-span-full rounded-2xl border border-dashed border-[#2A2A2E] py-16 text-center font-mono text-xs text-zinc-500 italic">
                Ningún potencial cliente coincide con los filtros activos.
              </span>
            )}
          </div>
        </div>

        {/* Modal: Manual Creation */}
        <ModalPotencialCliente
          abierto={modalManualAbierto}
          prospectoEdicion={prospectoEdicion}
          onCerrar={() => {
            setModalManualAbierto(false);
            setProspectoEdicion(null);
          }}
          onConfirmar={handleCrearOEditarProspecto}
        />

        {/* Modal: JSON Bulk Import */}
        <ModalImportarPotenciales
          abierto={modalImportarAbierto}
          onCerrar={() => setModalImportarAbierto(false)}
          onConfirmarImportacion={handleImportarLote}
        />

        {/* Modal: Visit Registration */}
        {prospectoVisita && (
          <ModalRegistrarVisitaProspecto
            key={prospectoVisita.id}
            abierto={modalVisitaAbierto}
            onCerrar={() => {
              setModalVisitaAbierto(false);
              setProspectoVisita(null);
            }}
            nombreProspecto={prospectoVisita.nombre}
            onConfirmar={handleRegistrarVisita}
          />
        )}

        {/* Modal: Digital Contact Registration */}
        {prospectoContacto && (
          <ModalRegistrarContacto
            key={prospectoContacto.id}
            abierto={modalContactoAbierto}
            onCerrar={() => {
              setModalContactoAbierto(false);
              setProspectoContacto(null);
            }}
            nombreProspecto={prospectoContacto.nombre}
            onConfirmar={handleRegistrarContactoDigital}
          />
        )}

        {/* Modal: CRM Client Conversion */}
        {prospectoAConvertir && (
          <ModalCliente
            abierto={modalCrmAbierto}
            clienteEdicion={{
              id: "",
              nombre: prospectoAConvertir.nombre,
              correo: prospectoAConvertir.email || "",
              direccion: prospectoAConvertir.direccion || "",
              direccionCalle: prospectoAConvertir.direccionCalle || "",
              direccionCodigoPostal:
                prospectoAConvertir.direccionCodigoPostal || "",
              direccionCiudad: prospectoAConvertir.direccionCiudad || "",
              direccionProvincia: prospectoAConvertir.direccionProvincia || "",
              direccionPais: prospectoAConvertir.direccionPais || "Argentina",
              estado: "Lead",
              observaciones: `Convertido de Prospecto de Campo. Rubro: ${prospectoAConvertir.rubro || "General"}. Pitch: ${prospectoAConvertir.pitch || "N/A"}. Servicio: ${prospectoAConvertir.tipoServicio || "N/A"}. Contacto WhatsApp: ${prospectoAConvertir.whatsapp || "N/A"}.`,
            }}
            onCerrar={() => {
              setModalCrmAbierto(false);
              setProspectoAConvertir(null);
            }}
            onConfirmar={handleConfirmarConversionCrm}
            estados={["Lead", "Negociación", "Cliente Activo", "Archivado"]}
            origenes={[
              "Prospección Campo",
              "Recomendado",
              "Redes Sociales",
              "Contacto Directo",
              "Búsqueda Web",
            ]}
            responsables={[
              "Sin Asignar",
              "Ejecutivo de Cuentas",
              "Agencia General",
            ]}
          />
        )}
      </div>
    </MainLayout>
  );
}
