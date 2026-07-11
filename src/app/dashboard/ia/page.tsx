"use client";

import React, { useState, useRef, useEffect } from "react";
import { MainLayout } from "../../../presentation/components/layout";
import { Card } from "../../../presentation/components/card";
import { Input } from "../../../presentation/components/input";
import { Select } from "../../../presentation/components/select";
import { db } from "../../../offline/dexie/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Icono } from "../../../presentation/components/icons";

interface Mensaje {
  id: string;
  autor: "ia" | "usuario";
  texto: string;
  fecha: Date;
}

export default function IAPage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: "1",
      autor: "ia",
      texto:
        "¡Hola! Soy el asistente inteligente de MateCode. ¿En qué puedo ayudarte hoy? Puedo analizar tus estándares de desarrollo, auditar logs locales o sugerir mejoras en tus proyectos y sprints.",
      fecha: new Date(),
    },
  ]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [contexto, setContexto] = useState("general");
  const [escribiendo, setEscribiendo] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const rawClientes = useLiveQuery(() => db.clientes.toArray()) || [];
  const rawProyectos = useLiveQuery(() => db.proyectos.toArray()) || [];
  const rawSprints = useLiveQuery(() => db.sprints.toArray()) || [];
  const rawLogs = useLiveQuery(() => db.logs_sincronizacion.toArray()) || [];

  const autoScroll = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    autoScroll();
  }, [mensajes, escribiendo]);

  const handleEnviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;

    const msgUsuario: Mensaje = {
      id: `usr_${Date.now()}`,
      autor: "usuario",
      texto: nuevoMensaje,
      fecha: new Date(),
    };

    setMensajes((prev) => [...prev, msgUsuario]);
    setNuevoMensaje("");
    setEscribiendo(true);

    // Simulate AI response response
    setTimeout(() => {
      let respuestaText = "";

      const query = nuevoMensaje.toLowerCase();

      if (contexto === "clientes") {
        respuestaText = `He analizado tus contactos de CRM (${rawClientes.length} registros). `;
        if (rawClientes.length === 0) {
          respuestaText +=
            "Actualmente no tienes clientes registrados localmente. Te recomiendo ir a la sección CRM y registrar tu primera oportunidad comercial.";
        } else {
          const leads = rawClientes.filter(
            (c) => c.estado === "Lead" || c.estado === "Contacto Detectado"
          );
          respuestaText += `Tienes ${leads.length} leads en fase de prospección. Te sugiero programar un contacto de seguimiento para mantener caliente el embudo comercial.`;
        }
      } else if (contexto === "proyectos") {
        respuestaText = `Actualmente gestionas ${rawProyectos.length} proyectos activos en el workspace. `;
        if (rawProyectos.length > 0) {
          respuestaText += `El proyecto "${rawProyectos[0].nombre}" se encuentra en estado "${rawProyectos[0].estado}". Te sugiero planificar el próximo sprint o verificar si hay tareas pendientes asociadas.`;
        } else {
          respuestaText +=
            "No se registran proyectos activos en la base de datos local. Podrías crear uno desde la sección de Proyectos.";
        }
      } else if (contexto === "auditoria") {
        respuestaText = `He auditado los logs de sincronización de la app (${rawLogs.length} eventos registrados). `;
        const errores = rawLogs.filter((l) => l.tipo === "error");
        if (errores.length > 0) {
          respuestaText += `Alerta: He detectado ${errores.length} registros de error. El último error registrado indica: "${errores[errores.length - 1].mensaje}".`;
        } else {
          respuestaText +=
            "¡Todo marcha a la perfección! No se registran fallos ni conflictos en la cola local de sincronización.";
        }
      } else {
        // General query processing
        if (query.includes("hola") || query.includes("buen")) {
          respuestaText =
            "¡Hola! ¿Qué tal? Estoy listo para responder consultas técnicas o comerciales sobre tus clientes y proyectos. Elige un contexto en el selector de la izquierda para darme más información.";
        } else if (query.includes("sprint") || query.includes("sprints")) {
          respuestaText = `Actualmente hay ${rawSprints.length} sprints en tu base de datos local. Para iniciar la planificación de ingeniería, ve a la sección Proyectos -> pestaña Sprint Planner para configurar el backlog.`;
        } else if (query.includes("ayuda") || query.includes("hacer")) {
          respuestaText =
            "Puedo ayudarte a: \n1. Analizar el pipeline de ventas (CRM)\n2. Auditar logs de sincronización y offline\n3. Revisar el estado de desarrollo de proyectos\n\nElige el contexto que prefieras en la parte superior.";
        } else {
          respuestaText =
            "Entendido. He registrado tu consulta en el modelo de análisis. Si deseas una auditoría específica de datos, cambia el selector de contexto a 'Clientes', 'Proyectos' o 'Auditoría' para ofrecerte un reporte personalizado.";
        }
      }

      const msgIA: Mensaje = {
        id: `ia_${Date.now()}`,
        autor: "ia",
        texto: respuestaText,
        fecha: new Date(),
      };

      setMensajes((prev) => [...prev, msgIA]);
      setEscribiendo(false);
    }, 1200);
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-100px)] flex-col gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Copiloto Inteligente
          </h1>
          <p className="mt-1 font-mono text-xs tracking-wide text-zinc-400 uppercase">
            Asistencia de IA integrada con tu base de datos local
          </p>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-4">
          {/* Settings Panel */}
          <div className="flex flex-col gap-4 lg:col-span-1">
            <Card className="flex flex-col gap-4">
              <h3 className="font-mono text-xs font-bold text-zinc-300 uppercase">
                Contexto de Análisis
              </h3>
              <Select
                label="Filtro de Datos"
                options={[
                  { value: "general", label: "General (Sugerencias)" },
                  { value: "clientes", label: "CRM & Clientes" },
                  { value: "proyectos", label: "Proyectos & Sprints" },
                  { value: "auditoria", label: "Auditoría & Logs Offline" },
                ]}
                value={contexto}
                onChange={(val) => setContexto(val)}
              />
              <div className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                <p className="font-bold text-zinc-400">¿Cómo funciona?</p>
                <p className="mt-1">
                  Al cambiar de contexto, el asistente lee los datos
                  estructurados en tu base local IndexedDB de forma segura para
                  dar respuestas precisas de tu negocio.
                </p>
              </div>
            </Card>
          </div>

          {/* Chat Container */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-[#2A2A2E] bg-zinc-950 lg:col-span-3">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-[#2A2A2E] bg-[#141416]/60 px-4 py-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Icono.IA className="h-3.5 w-3.5" />
              </div>
              <span className="font-mono text-xs font-bold text-zinc-300">
                MateCode IA Agent (Offline-Aware)
              </span>
              <span className="ml-auto flex items-center gap-1.5 font-mono text-[9px] text-emerald-400">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" />
                Listo
              </span>
            </div>

            {/* Message Area */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {mensajes.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.autor === "usuario" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 font-sans text-sm ${
                      m.autor === "usuario"
                        ? "rounded-tr-none bg-[#10B981] font-semibold text-black"
                        : "rounded-tl-none border border-[#2A2A2E] bg-[#18181B] text-zinc-100"
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.texto}</p>
                    <span className="mt-1 block text-right text-[9px] opacity-60">
                      {m.fecha.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
              {escribiendo && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-none border border-[#2A2A2E] bg-[#18181B] px-4 py-3 text-zinc-100">
                    <div className="flex gap-1.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleEnviar}
              className="flex items-center gap-2 border-t border-[#2A2A2E] bg-[#141416]/40 p-3"
            >
              <div className="flex-1">
                <Input
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  placeholder="Haz una pregunta o pide recomendaciones comerciales..."
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                disabled={!nuevoMensaje.trim() || escribiendo}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-emerald-500 font-mono text-black transition-all hover:bg-emerald-600 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
