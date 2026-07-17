"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, react-hooks/purity, react/no-unescaped-entities */

import React, { useState, useEffect } from "react";
import { MainLayout } from "../../../presentation/components/layout";
import { Card } from "../../../presentation/components/card";
import { db } from "../../../offline/dexie/db";
import { useLiveQuery } from "dexie-react-hooks";
import { GestionarContactosUseCase } from "../../../application/use-cases/crm/gestionar-contactos.use-case";
import { useToast } from "../../../presentation/hooks/useToast";

export default function TallerContacto() {
  const { mostrarToast } = useToast();
  const uc = new GestionarContactosUseCase();

  // Active view tab: "session" or "followup"
  const [activeTab, setActiveTab] = useState<"session" | "followup">("session");

  // CRM DB collections
  const sesiones = (useLiveQuery(() => db.contacto_sesiones.toArray()) ||
    []) as any[];
  const servicios = (useLiveQuery(() => db.servicios_agencia.toArray()) ||
    []) as any[];
  const todosPotenciales = (useLiveQuery(() =>
    db.potenciales_clientes.toArray()
  ) || []) as any[];
  const reuniones = (useLiveQuery(() => db.reuniones_contacto.toArray()) ||
    []) as any[];

  // Active selections
  const [sesionActivaId, setSesionActivaId] = useState("");
  const [prospectoActivoId, setProspectoActivoId] = useState<string | null>(
    null
  );

  // New session form
  const [nuevaSesionNombre, setNuevaSesionNombre] = useState("");

  // New prospect al vuelo form
  const [nuevoProspectoNombre, setNuevoProspectoNombre] = useState("");
  const [nuevoProspectoInstagram, setNuevoProspectoInstagram] = useState("");
  const [nuevoProspectoWhatsapp, setNuevoProspectoWhatsapp] = useState("");
  const [nuevoProspectoEmail, setNuevoProspectoEmail] = useState("");

  // Ficha Form states
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [rubro, setRubro] = useState("");
  const [ganchoEmpatico, setGanchoEmpatico] = useState("");
  const [canalVentaActual, setCanalVentaActual] = useState("");
  const [dolorDetectado, setDolorDetectado] = useState("");
  const [servicioOfrecidoId, setServicioOfrecidoId] = useState("");
  const [checklistWarming, setChecklistWarming] = useState<string[]>([]);

  // Pitch text area state
  const [pitchText, setPitchText] = useState("");

  // Modal triggers
  const [modalRechazoAbierto, setModalRechazoAbierto] = useState(false);
  const [motivoRechazoText, setMotivoRechazoText] = useState("");

  const [modalReunionAbierto, setModalReunionAbierto] = useState(false);
  const [tipoReunion, setTipoReunion] = useState<"sincronica" | "loom">("loom");
  const [fechaReunion, setFechaReunion] = useState("");
  const [linkLoom, setLinkLoom] = useState("");

  // Default selection
  useEffect(() => {
    if (sesiones.length > 0 && !sesionActivaId) {
      setSesionActivaId(sesiones[0].id);
    }
  }, [sesiones, sesionActivaId]);

  // Load prospectos assigned to active session
  const prospectosSesion = (useLiveQuery(async () => {
    if (!sesionActivaId) return [];
    return await db.potenciales_clientes
      .where("sesionId")
      .equals(sesionActivaId)
      .toArray();
  }, [sesionActivaId]) || []) as any[];

  // Active prospect record
  const activeProspect = todosPotenciales.find(
    (p) => p.id === prospectoActivoId
  );

  // Load prospect details into form
  useEffect(() => {
    if (activeProspect) {
      setNombreNegocio(
        activeProspect.nombreNegocio || activeProspect.nombre || ""
      );
      setRubro(activeProspect.rubro || "");
      setGanchoEmpatico(activeProspect.ganchoEmpatico || "");
      setCanalVentaActual(activeProspect.canalVentaActual || "");
      setDolorDetectado(activeProspect.dolorDetectado || "");
      setServicioOfrecidoId(activeProspect.servicioOfrecidoId || "");
      setChecklistWarming(activeProspect.checklistWarming || []);
      setPitchText(activeProspect.pitch || "");
    } else {
      setNombreNegocio("");
      setRubro("");
      setGanchoEmpatico("");
      setCanalVentaActual("");
      setDolorDetectado("");
      setServicioOfrecidoId("");
      setChecklistWarming([]);
      setPitchText("");
    }
  }, [prospectoActivoId, todosPotenciales]);

  // Load calculated follow-up list
  const calculatedFollowups = (useLiveQuery(async () => {
    const list = await db.potenciales_clientes
      .where("estadoOutbound")
      .equals("En Seguimiento")
      .toArray();

    const mapped = list.map((p) => {
      const lastContact = (p as any).fechaUltimoContacto || p.creadoEn;
      const diffMs = Date.now() - lastContact;
      const diasSinRespuesta = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return {
        ...p,
        dias_sin_respuesta: diasSinRespuesta,
      };
    });

    return mapped.sort((a, b) => b.dias_sin_respuesta - a.dias_sin_respuesta);
  }, [todosPotenciales]) || []) as any[];

  // Analytics Metrics
  const totalEnSesion = prospectosSesion.length;
  const totalEnSeguimiento = todosPotenciales.filter(
    (p) => p.estadoOutbound === "En Seguimiento"
  ).length;

  const totalConvertidos = todosPotenciales.filter(
    (p) => p.estadoOutbound && p.estadoOutbound !== "Por Contactar"
  ).length;
  const totalLoomReunion = todosPotenciales.filter(
    (p) => p.estadoOutbound === "Reunión / Loom"
  ).length;
  const totalAceptados = todosPotenciales.filter(
    (p) => p.estadoOutbound === "Aceptado"
  ).length;

  const tasaConversionLoom =
    totalConvertidos > 0
      ? ((totalLoomReunion / totalConvertidos) * 100).toFixed(0)
      : "0";
  const tasaCierre =
    totalConvertidos > 0
      ? ((totalAceptados / totalConvertidos) * 100).toFixed(0)
      : "0";

  // Rejections frequency calculation
  const rejectionMotifs = todosPotenciales
    .filter((p) => p.estadoOutbound === "Rechazado" && p.motivoRechazo)
    .map((p) => p.motivoRechazo);

  // Actions
  const crearNuevaSesion = async () => {
    if (!nuevaSesionNombre.trim()) {
      mostrarToast("Escribe un nombre para la sesión.", "error");
      return;
    }
    const res = await uc.crearSesion(nuevaSesionNombre);
    if (res.ok) {
      setNuevaSesionNombre("");
      setSesionActivaId(res.valor);
      mostrarToast("Sesión creada con éxito.", "exito");
    } else {
      mostrarToast(res.error?.mensaje || "Error al crear sesión.", "error");
    }
  };

  const crearProspectoVuelo = async () => {
    if (!nuevoProspectoNombre.trim()) {
      mostrarToast("Escribe el nombre del cliente/empresa.", "error");
      return;
    }
    if (!sesionActivaId) {
      mostrarToast(
        "Debes seleccionar o crear una sesión de contacto primero.",
        "error"
      );
      return;
    }

    const resP = await uc.crearProspectoAlVuelo(
      nuevoProspectoNombre,
      nuevoProspectoInstagram,
      nuevoProspectoWhatsapp,
      nuevoProspectoEmail
    );

    if (resP.ok) {
      const resAdd = await uc.agregarProspectoSesion(
        sesionActivaId,
        resP.valor
      );
      if (resAdd.ok) {
        setNuevoProspectoNombre("");
        setNuevoProspectoInstagram("");
        setNuevoProspectoWhatsapp("");
        setNuevoProspectoEmail("");
        setProspectoActivoId(resP.valor);
        mostrarToast("Prospecto agregado al lote.", "exito");
      } else {
        mostrarToast(
          resAdd.error?.mensaje || "Error al asignar prospecto.",
          "error"
        );
      }
    } else {
      mostrarToast(
        resP.error?.mensaje || "Error al registrar prospecto.",
        "error"
      );
    }
  };

  const agregarBaseExistente = async (prospectoId: string) => {
    if (!sesionActivaId) return;
    const res = await uc.agregarProspectoSesion(sesionActivaId, prospectoId);
    if (res.ok) {
      setProspectoActivoId(prospectoId);
      mostrarToast("Prospecto agregado de la base existente.", "exito");
    } else {
      mostrarToast(
        res.error?.mensaje || "Error al agregar de la base.",
        "error"
      );
    }
  };

  const quitarDelLote = async (prospectoId: string) => {
    const res = await uc.quitarProspectoSesion(prospectoId);
    if (res.ok) {
      if (prospectoActivoId === prospectoId) {
        setProspectoActivoId(null);
      }
      mostrarToast("Prospecto removido del lote.", "info");
    } else {
      mostrarToast(res.error?.mensaje || "Error al quitar prospecto.", "error");
    }
  };

  const alternarChecklistWarming = async (stepId: string) => {
    if (!prospectoActivoId) return;
    let newList = [...checklistWarming];
    if (newList.includes(stepId)) {
      newList = newList.filter((id) => id !== stepId);
    } else {
      newList.push(stepId);
    }
    setChecklistWarming(newList);

    await uc.actualizarFichaProspecto(prospectoActivoId, {
      nombreNegocio,
      rubro,
      ganchoEmpatico,
      canalVentaActual,
      dolorDetectado,
      servicioOfrecidoId,
      checklist: newList,
    });
  };

  const guardarCambiosFicha = async () => {
    if (!prospectoActivoId) return;
    const res = await uc.actualizarFichaProspecto(prospectoActivoId, {
      nombreNegocio,
      rubro,
      ganchoEmpatico,
      canalVentaActual,
      dolorDetectado,
      servicioOfrecidoId,
      checklist: checklistWarming,
    });

    if (res.ok) {
      mostrarToast("Ficha guardada localmente.", "exito");
    } else {
      mostrarToast(res.error?.mensaje || "Error al guardar ficha.", "error");
    }
  };

  const copiarPromptPitch = async () => {
    if (!prospectoActivoId) return;
    // Auto save form before compiling
    await uc.actualizarFichaProspecto(prospectoActivoId, {
      nombreNegocio,
      rubro,
      ganchoEmpatico,
      canalVentaActual,
      dolorDetectado,
      servicioOfrecidoId,
      checklist: checklistWarming,
    });

    const res = await uc.compilarPitchPrompt(prospectoActivoId);
    if (res.ok) {
      navigator.clipboard.writeText(res.valor);
      mostrarToast("¡Prompt de pitch copiado al portapapeles!", "exito");
    } else {
      mostrarToast(res.error?.mensaje || "Error al compilar prompt.", "error");
    }
  };

  const guardarPitchIA = async () => {
    if (!prospectoActivoId) return;
    const res = await uc.guardarPitchFinal(prospectoActivoId, pitchText);
    if (res.ok) {
      mostrarToast("Pitch guardado con éxito.", "exito");
    } else {
      mostrarToast(res.error?.mensaje || "Error al guardar pitch.", "error");
    }
  };

  // State Transitions
  const cambiarAEnSeguimiento = async () => {
    if (!prospectoActivoId) return;
    const res = await uc.cambiarEstadoProspecto(
      prospectoActivoId,
      "En Seguimiento"
    );
    if (res.ok) {
      mostrarToast("Prospecto marcado en Seguimiento.", "info");
    } else {
      mostrarToast(res.error?.mensaje || "Error al cambiar estado.", "error");
    }
  };

  const registrarRechazo = async () => {
    if (!prospectoActivoId || !motivoRechazoText.trim()) return;
    const res = await uc.cambiarEstadoProspecto(
      prospectoActivoId,
      "Rechazado",
      {
        motivoRechazo: motivoRechazoText,
      }
    );
    if (res.ok) {
      setModalRechazoAbierto(false);
      setMotivoRechazoText("");
      mostrarToast("Rechazo registrado correctamente.", "info");
    } else {
      mostrarToast(
        res.error?.mensaje || "Error al registrar rechazo.",
        "error"
      );
    }
  };

  const registrarAgendamientoReunion = async () => {
    if (!prospectoActivoId) return;
    const epoch = fechaReunion ? new Date(fechaReunion).getTime() : Date.now();
    const res = await uc.cambiarEstadoProspecto(
      prospectoActivoId,
      "Reunión / Loom",
      {
        tipoReunion,
        fechaReunion: epoch,
        linkLoom,
      }
    );

    if (res.ok) {
      setModalReunionAbierto(false);
      setLinkLoom("");
      setFechaReunion("");
      mostrarToast("Reunión / Video Loom agendado con éxito.", "exito");
    } else {
      mostrarToast(res.error?.mensaje || "Error al agendar reunión.", "error");
    }
  };

  const registrarAceptado = async () => {
    if (!prospectoActivoId) return;
    const res = await uc.cambiarEstadoProspecto(prospectoActivoId, "Aceptado");
    if (res.ok) {
      mostrarToast(
        "¡Felicidades! Convertido en Cliente real del Core CRM.",
        "exito"
      );
    } else {
      mostrarToast(
        res.error?.mensaje || "Error al convertir cliente.",
        "error"
      );
    }
  };

  // Filter prospects outside this session to add
  const candidatosParaAgregar = todosPotenciales.filter(
    (p) => p.sesionId !== sesionActivaId && !p.convertido
  );

  // Check if warming checklist is complete to unlock pitch generator
  const isWarmingComplete = checklistWarming.length >= 3;

  return (
    <MainLayout>
      <div className="flex flex-col gap-5 font-mono text-xs text-zinc-300">
        {/* Header Title */}
        <div className="flex flex-col justify-between border-b border-[#2A2A2E] pb-3.5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-mono text-sm font-bold text-white uppercase">
              Taller de Contacto & Prospección Outbound
            </h2>
            <p className="text-zinc-550 mt-0.5 font-mono text-[10px]">
              Outbound Sales Micro-CRM orientado a prospección en frío asistida
              por IA
            </p>
          </div>
          <div className="mt-3 flex shrink-0 items-center gap-2 rounded-lg border border-zinc-900 bg-zinc-950/40 p-1.5 sm:mt-0">
            <button
              onClick={() => setActiveTab("session")}
              className={`rounded px-3 py-1 text-[9px] font-bold uppercase transition-all ${
                activeTab === "session"
                  ? "bg-emerald-500 text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sesión de Contacto
            </button>
            <button
              onClick={() => setActiveTab("followup")}
              className={`rounded px-3 py-1 text-[9px] font-bold uppercase transition-all ${
                activeTab === "followup"
                  ? "bg-emerald-500 text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Lista de Seguimientos ({totalEnSeguimiento})
            </button>
          </div>
        </div>

        {/* Analytics Top widgets */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <div className="flex flex-col">
              <span className="text-zinc-650 text-[9px] font-bold uppercase">
                Prospectos en Sesión
              </span>
              <span className="mt-1 text-base font-bold text-white">
                {totalEnSesion}{" "}
                <span className="text-zinc-550 text-[10px]">/ 15</span>
              </span>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col">
              <span className="text-zinc-650 text-[9px] font-bold uppercase">
                Esperando Respuesta
              </span>
              <span className="mt-1 text-base font-bold text-sky-400">
                {totalEnSeguimiento}
              </span>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col">
              <span className="text-zinc-650 text-[9px] font-bold uppercase">
                Conversión a Loom/Reunión
              </span>
              <span className="mt-1 text-base font-bold text-amber-400">
                {tasaConversionLoom}%
              </span>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col">
              <span className="text-zinc-650 text-[9px] font-bold uppercase">
                Tasa de Cierre (Clientes)
              </span>
              <span className="mt-1 text-base font-bold text-emerald-400">
                {tasaCierre}%
              </span>
            </div>
          </Card>
        </div>

        {/* Dashboard Workspace */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* LEFT COLUMN: Sessions / List of prospects */}
          <div className="flex flex-col gap-4 lg:col-span-1">
            {activeTab === "session" ? (
              <>
                {/* Outbound Sessions selector / creation card */}
                <Card>
                  <div className="flex flex-col gap-3">
                    <span className="border-b border-zinc-900 pb-1 font-bold text-white uppercase">
                      📅 Sesión Activa
                    </span>
                    <div className="flex flex-col gap-2">
                      <select
                        value={sesionActivaId}
                        onChange={(e) => {
                          setSesionActivaId(e.target.value);
                          setProspectoActivoId(null);
                        }}
                        className="rounded border border-zinc-800 bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
                      >
                        <option value="" disabled>
                          Selecciona sesión...
                        </option>
                        {sesiones.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre} (
                            {new Date(s.creadoEn).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                      <div className="mt-1 flex items-center gap-1.5 border-t border-zinc-950 pt-2.5">
                        <input
                          type="text"
                          value={nuevaSesionNombre}
                          onChange={(e) => setNuevaSesionNombre(e.target.value)}
                          placeholder="Nueva Sesión de Outbound..."
                          className="border-zinc-850 flex-1 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
                        />
                        <button
                          onClick={crearNuevaSesion}
                          className="rounded bg-emerald-500 px-3 py-1.5 text-[10px] font-bold text-zinc-950"
                        >
                          Crear
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Prospects in active session */}
                <Card>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-1">
                      <span className="font-bold text-white uppercase">
                        📋 Prospectos en Lote ({prospectosSesion.length})
                      </span>
                      {prospectosSesion.length >= 15 && (
                        <span className="text-[8px] font-bold text-amber-500 uppercase">
                          Lote Completo
                        </span>
                      )}
                    </div>

                    <div className="flex max-h-[30vh] flex-col gap-1.5 overflow-y-auto pr-1">
                      {prospectosSesion.length === 0 ? (
                        <span className="text-zinc-650 py-4 text-center italic">
                          Lote vacío. Agrega de la base o crea uno nuevo.
                        </span>
                      ) : (
                        prospectosSesion.map((p) => {
                          let badgeColor = "border-zinc-850 text-zinc-500";
                          if (p.estadoOutbound === "En Seguimiento")
                            badgeColor =
                              "border-sky-900/30 text-sky-400 bg-sky-950/20";
                          else if (p.estadoOutbound === "Reunión / Loom")
                            badgeColor =
                              "border-amber-900/30 text-amber-400 bg-amber-950/20";
                          else if (p.estadoOutbound === "Aceptado")
                            badgeColor =
                              "border-emerald-900/30 text-emerald-400 bg-emerald-950/20";
                          else if (p.estadoOutbound === "Rechazado")
                            badgeColor =
                              "border-red-900/30 text-red-400 bg-red-950/20";

                          return (
                            <div
                              key={p.id}
                              onClick={() => setProspectoActivoId(p.id)}
                              className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-all hover:bg-zinc-950/40 ${
                                prospectoActivoId === p.id
                                  ? "border-emerald-500/40 bg-zinc-950"
                                  : "border-zinc-900 bg-zinc-950/20"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <span className="block truncate font-bold text-zinc-200">
                                  {p.nombre}
                                </span>
                                <span className="mt-0.5 block truncate text-[9px] text-zinc-600">
                                  {p.instagram ||
                                    p.email ||
                                    "Sin datos de contacto"}
                                </span>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <span
                                  className={`rounded border px-1.5 py-0.5 text-[8px] font-bold ${badgeColor}`}
                                >
                                  {p.estadoOutbound || "Por Contactar"}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    quitarDelLote(p.id);
                                  }}
                                  className="text-zinc-650 p-0.5 text-[10px] hover:text-zinc-400"
                                  title="Quitar de esta sesión"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Add Existing selector */}
                    {candidatosParaAgregar.length > 0 && (
                      <div className="flex flex-col gap-1 border-t border-zinc-950 pt-2.5">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase">
                          Agregar de la Base Existente
                        </span>
                        <select
                          value=""
                          onChange={(e) => agregarBaseExistente(e.target.value)}
                          className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
                        >
                          <option value="" disabled>
                            Selecciona prospecto...
                          </option>
                          {candidatosParaAgregar.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre} ({(c as any).rubro || "Sin rubro"})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Create al vuelo prospect Card */}
                <Card>
                  <div className="flex flex-col gap-3">
                    <span className="border-b border-zinc-900 pb-1 font-bold text-white uppercase">
                      ✍️ Registrar Prospecto "Al Vuelo"
                    </span>
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={nuevoProspectoNombre}
                        onChange={(e) =>
                          setNuevoProspectoNombre(e.target.value)
                        }
                        placeholder="Nombre de la Empresa o Cliente..."
                        className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none focus:border-emerald-500"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={nuevoProspectoInstagram}
                          onChange={(e) =>
                            setNuevoProspectoInstagram(e.target.value)
                          }
                          placeholder="Instagram (ej. @negocio)..."
                          className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none focus:border-emerald-500"
                        />
                        <input
                          type="text"
                          value={nuevoProspectoWhatsapp}
                          onChange={(e) =>
                            setNuevoProspectoWhatsapp(e.target.value)
                          }
                          placeholder="WhatsApp..."
                          className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none focus:border-emerald-500"
                        />
                      </div>
                      <input
                        type="email"
                        value={nuevoProspectoEmail}
                        onChange={(e) => setNuevoProspectoEmail(e.target.value)}
                        placeholder="Correo electrónico..."
                        className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={crearProspectoVuelo}
                        className="mt-1 w-full rounded bg-emerald-500 py-1.5 text-[10px] font-bold text-zinc-950 transition-all hover:bg-emerald-600"
                      >
                        Registrar y Añadir a Sesión
                      </button>
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              /* Tab Follow-up Special List */
              <Card>
                <div className="flex flex-col gap-3">
                  <span className="border-b border-zinc-900 pb-1 font-bold text-white uppercase">
                    🔍 Seguimientos Pendientes
                  </span>
                  <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1">
                    {calculatedFollowups.length === 0 ? (
                      <span className="text-zinc-650 py-4 text-center italic">
                        No hay prospectos en seguimiento activo.
                      </span>
                    ) : (
                      calculatedFollowups.map((p) => {
                        let alarmColor =
                          "text-zinc-500 bg-zinc-950 border-zinc-900";
                        if (p.dias_sin_respuesta >= 7)
                          alarmColor =
                            "text-red-400 bg-red-950/20 border-red-900/30 animate-pulse";
                        else if (p.dias_sin_respuesta >= 3)
                          alarmColor =
                            "text-amber-400 bg-amber-950/20 border-amber-900/30";

                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setProspectoActivoId(p.id);
                            }}
                            className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-all hover:bg-zinc-950/40 ${
                              prospectoActivoId === p.id
                                ? "border-emerald-500/40 bg-zinc-950"
                                : "border-zinc-900 bg-zinc-950/20"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <span className="block truncate font-bold text-zinc-200">
                                {p.nombre}
                              </span>
                              <span className="mt-0.5 block text-[8px] text-zinc-600">
                                Último contacto:{" "}
                                {new Date(
                                  p.fechaUltimoContacto
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <div
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-bold ${alarmColor}`}
                            >
                              ⏱️ {p.dias_sin_respuesta} d
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* CENTER & RIGHT COLUMN: Active Prospect Outbound Workspace */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            {!activeProspect ? (
              <Card>
                <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
                  <span className="text-zinc-650 text-[11px] italic">
                    Selecciona un prospecto del lote o de la lista de
                    seguimiento.
                  </span>
                  <p className="text-zinc-550 max-w-sm text-[9px] leading-relaxed">
                    El Taller de Outbound te guiará en la investigación del
                    perfil, te forzará a realizar el checklist de calentamiento
                    de cuenta, y compilará el prompt para generar el pitch
                    perfecto.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Main Workspace Ficha Form */}
                <Card>
                  <div className="flex flex-col gap-4">
                    {/* Prospect Header with external links */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 pb-3">
                      <div>
                        <span className="block text-sm font-bold text-white uppercase">
                          👤 {activeProspect.nombre}
                        </span>
                        <span className="text-zinc-550 mt-0.5 block text-[9px]">
                          Estado Outbound:{" "}
                          <b className="text-emerald-400">
                            {activeProspect.estadoOutbound || "Por Contactar"}
                          </b>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeProspect.instagram && (
                          <a
                            href={`https://instagram.com/${activeProspect.instagram.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded border border-purple-900/30 bg-purple-950/40 px-2 py-1 text-[9px] font-bold text-purple-400 hover:bg-purple-900/30"
                          >
                            📸 Instagram
                          </a>
                        )}
                        {activeProspect.whatsapp && (
                          <a
                            href={`https://wa.me/${activeProspect.whatsapp.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded border border-green-900/30 bg-green-950/40 px-2 py-1 text-[9px] font-bold text-green-400 hover:bg-green-900/30"
                          >
                            💬 WhatsApp
                          </a>
                        )}
                        {activeProspect.email && (
                          <a
                            href={`mailto:${activeProspect.email}`}
                            className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[9px] font-bold text-zinc-300 hover:bg-zinc-800"
                          >
                            ✉️ Email
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Split Form: qualification inputs left, checklist right */}
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
                      {/* Qualification Inputs Form */}
                      <div className="flex flex-col gap-2.5 md:col-span-3">
                        <span className="text-[9px] font-bold text-white uppercase">
                          Ficha de Calificación (IA Outbound)
                        </span>
                        <div className="flex flex-col gap-2 rounded-2xl border border-zinc-900 bg-zinc-950/20 p-3.5">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase">
                                Nombre Negocio
                              </span>
                              <input
                                type="text"
                                value={nombreNegocio}
                                onChange={(e) =>
                                  setNombreNegocio(e.target.value)
                                }
                                className="rounded border border-zinc-800 bg-zinc-900 p-1 text-zinc-200 outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase">
                                Rubro / Sector
                              </span>
                              <input
                                type="text"
                                value={rubro}
                                onChange={(e) => setRubro(e.target.value)}
                                className="rounded border border-zinc-800 bg-zinc-900 p-1 text-zinc-200 outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase">
                              Gancho Empático (¿Qué viste en su perfil?)
                            </span>
                            <input
                              type="text"
                              value={ganchoEmpatico}
                              onChange={(e) =>
                                setGanchoEmpatico(e.target.value)
                              }
                              placeholder="Ej. Vi que abrieron local en Palermo y sus Reels tienen buena edición..."
                              className="rounded border border-zinc-800 bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase">
                                Canal Venta Actual
                              </span>
                              <input
                                type="text"
                                value={canalVentaActual}
                                onChange={(e) =>
                                  setCanalVentaActual(e.target.value)
                                }
                                placeholder="Ej. Link PDF en bio..."
                                className="rounded border border-zinc-800 bg-zinc-900 p-1 text-zinc-200 outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase">
                                Dolor / Falla Técnica
                              </span>
                              <input
                                type="text"
                                value={dolorDetectado}
                                onChange={(e) =>
                                  setDolorDetectado(e.target.value)
                                }
                                placeholder="Ej. No se puede comprar online..."
                                className="rounded border border-zinc-800 bg-zinc-900 p-1 text-zinc-200 outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase">
                              Servicio a Ofrecer
                            </span>
                            <select
                              value={servicioOfrecidoId}
                              onChange={(e) =>
                                setServicioOfrecidoId(e.target.value)
                              }
                              className="rounded border border-zinc-800 bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
                            >
                              <option value="">Selecciona oferta...</option>
                              {servicios.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.nombre}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            onClick={guardarCambiosFicha}
                            className="hover:bg-zinc-850 mt-2 self-end rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[10px] font-bold text-zinc-300"
                          >
                            Guardar Ficha
                          </button>
                        </div>
                      </div>

                      {/* Checklist of Warming actions (likes, stories, etc) */}
                      <div className="flex flex-col gap-2.5 border-l border-zinc-900 pl-0 md:col-span-2 md:pl-5">
                        <span className="text-[9px] font-bold text-white uppercase">
                          Checklist de Calentamiento
                        </span>
                        <div className="flex flex-col gap-2">
                          {[
                            {
                              id: "warming_1",
                              label: "Dar 2 Likes en su Feed",
                            },
                            {
                              id: "warming_2",
                              label: "Responder a 1 Historia",
                            },
                            {
                              id: "warming_3",
                              label: "Detectar dolor/falla técnica",
                            },
                          ].map((step) => {
                            const done = checklistWarming.includes(step.id);
                            return (
                              <div
                                key={step.id}
                                className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                                  done
                                    ? "border-emerald-500/20 bg-zinc-900/40"
                                    : "border-zinc-900 bg-zinc-950/20"
                                }`}
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={done}
                                    onChange={() =>
                                      alternarChecklistWarming(step.id)
                                    }
                                    className="h-3.5 w-3.5 cursor-pointer rounded border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                                  />
                                  <span
                                    className={`block truncate text-[10px] ${done ? "text-zinc-600 line-through" : "text-zinc-300"}`}
                                  >
                                    {step.label}
                                  </span>
                                </div>
                                <button
                                  onClick={() =>
                                    alternarChecklistWarming(step.id)
                                  }
                                  className="text-zinc-650 rounded border border-zinc-900 px-1.5 py-0.5 text-[8px] font-bold uppercase hover:text-zinc-400"
                                >
                                  {done ? "Omitido" : "Omitir"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <div className="bg-zinc-905 text-zinc-550 mt-2 rounded-lg border border-zinc-900/60 p-3 text-[9px] leading-relaxed">
                          💡 <b>Regla estricta:</b> Debes tildar (o marcar como
                          omitido) los 3 pasos de calentamiento para habilitar
                          la generación de tu prompt de venta en frío.
                        </div>
                      </div>
                    </div>

                    {/* Prompt Compilation & Copy section */}
                    <div className="flex flex-col gap-3 border-t border-zinc-900 pt-4">
                      <span className="text-[9px] font-bold text-white uppercase">
                        Generador de Pitch Dinámico
                      </span>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={copiarPromptPitch}
                            disabled={!isWarmingComplete}
                            className={`w-full rounded py-2.5 text-[10px] font-bold transition-all ${
                              isWarmingComplete
                                ? "cursor-pointer bg-emerald-500 text-zinc-950 hover:bg-emerald-600 active:scale-95"
                                : "border-zinc-850 cursor-not-allowed border bg-zinc-900 text-zinc-700"
                            }`}
                          >
                            🚀 Generar y Copiar Prompt de Pitch Maestro
                          </button>
                          <span className="text-zinc-650 text-center text-[8.5px] italic">
                            {!isWarmingComplete
                              ? "🔒 Completa el calentamiento para desbloquear"
                              : "✅ ¡Desbloqueado! Haz clic para copiar el prompt."}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={pitchText}
                            onChange={(e) => setPitchText(e.target.value)}
                            placeholder="Pega aquí el Pitch final redactado por Claude..."
                            rows={3}
                            className="border-zinc-850 resize-none rounded border bg-zinc-950 p-2 font-mono text-[9px] text-zinc-300 outline-none focus:border-emerald-500"
                          />
                          <button
                            onClick={guardarPitchIA}
                            className="hover:bg-zinc-750 self-end rounded border border-zinc-700 bg-zinc-800 px-4 py-1 text-[10px] font-bold text-zinc-200"
                          >
                            Guardar Pitch IA
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Outbound state Transitions */}
                    <div className="flex flex-col gap-2.5 border-t border-zinc-900 pt-4">
                      <span className="text-[9px] font-bold text-white uppercase">
                        Actualizar Estatus de Contacto (Handoff)
                      </span>
                      <div className="flex flex-wrap gap-2.5">
                        <button
                          onClick={cambiarAEnSeguimiento}
                          className="rounded-xl border border-sky-900/30 bg-sky-950/40 px-3 py-2 text-[10px] font-bold text-sky-400 hover:bg-sky-900/30"
                        >
                          ⏱️ Esperando Respuesta / Seguimiento
                        </button>
                        <button
                          onClick={() => setModalReunionAbierto(true)}
                          className="rounded-xl border border-amber-900/30 bg-amber-950/40 px-3 py-2 text-[10px] font-bold text-amber-400 hover:bg-amber-900/30"
                        >
                          📅 Reunión / Video Loom
                        </button>
                        <button
                          onClick={registrarAceptado}
                          className="rounded-xl border border-emerald-900/30 bg-emerald-950/40 px-3 py-2 text-[10px] font-bold text-emerald-400 hover:bg-emerald-900/30"
                        >
                          🎉 Aceptó Oferta (Crear Cliente Core)
                        </button>
                        <button
                          onClick={() => setModalRechazoAbierto(true)}
                          className="ml-auto rounded-xl border border-red-900/30 bg-red-950/40 px-3 py-2 text-[10px] font-bold text-red-400 hover:bg-red-900/30"
                        >
                          ❌ Rechazado
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* MODAL: Reject Reason (Rechazado) */}
        {modalRechazoAbierto && (
          <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div>
                <span className="block text-xs font-bold text-white uppercase">
                  Registrar Rechazo del Prospecto
                </span>
                <span className="text-zinc-550 mt-1 block text-[9px]">
                  Por favor especifica por qué el cliente declinó la propuesta.
                  Esto alimentará las analíticas del taller.
                </span>
              </div>
              <input
                type="text"
                value={motivoRechazoText}
                onChange={(e) => setMotivoRechazoText(e.target.value)}
                placeholder="Ej. No tienen presupuesto, Ya tienen agencia..."
                className="rounded border border-zinc-800 bg-zinc-900 p-2 text-[10px] text-zinc-200 outline-none focus:border-emerald-500"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => setModalRechazoAbierto(false)}
                  className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[10px] text-zinc-400 hover:text-zinc-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={registrarRechazo}
                  className="rounded bg-red-500 px-4 py-1.5 text-[10px] font-bold text-zinc-950 hover:bg-red-600"
                >
                  Guardar Rechazo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Agendar Reunión / Loom */}
        {modalReunionAbierto && (
          <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div>
                <span className="block text-xs font-bold text-white uppercase">
                  Handoff de Reunión o Video Loom
                </span>
                <span className="text-zinc-555 mt-1 block text-[9px]">
                  Establece la fecha de llamada en vivo o adjunta el enlace del
                  video personalizado.
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-zinc-500 uppercase">
                  Tipo de Handoff
                </span>
                <div className="flex gap-2">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      checked={tipoReunion === "sincronica"}
                      onChange={() => setTipoReunion("sincronica")}
                      className="text-emerald-500 focus:ring-0"
                    />
                    <span>Reunión en Vivo</span>
                  </label>
                  <label className="ml-3 flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      checked={tipoReunion === "loom"}
                      onChange={() => setTipoReunion("loom")}
                      className="text-emerald-500 focus:ring-0"
                    />
                    <span>Video Loom</span>
                  </label>
                </div>
              </div>

              {tipoReunion === "sincronica" ? (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">
                    Fecha / Hora de Llamada
                  </span>
                  <input
                    type="datetime-local"
                    value={fechaReunion}
                    onChange={(e) => setFechaReunion(e.target.value)}
                    className="rounded border border-zinc-800 bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">
                    Enlace del Video Loom
                  </span>
                  <input
                    type="text"
                    value={linkLoom}
                    onChange={(e) => setLinkLoom(e.target.value)}
                    placeholder="https://loom.com/share/..."
                    className="rounded border border-zinc-800 bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
                  />
                </div>
              )}

              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => setModalReunionAbierto(false)}
                  className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[10px] text-zinc-400 hover:text-zinc-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={registrarAgendamientoReunion}
                  className="rounded bg-emerald-500 px-4 py-1.5 text-[10px] font-bold text-zinc-950 hover:bg-emerald-600"
                >
                  Agendar Handoff
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
