"use client";

import React, { useState } from "react";
import { Card } from "../card";
import { Select } from "../select";
import { PotencialCliente } from "./ModalPotencialCliente";

interface PlanificadorDigitalProps {
  clientes: PotencialCliente[];
  onRegistrarContactoClick: (p: PotencialCliente) => void;
}

function limpiarTelefono(tel: string): string {
  return tel.replace(/[^\d]/g, ""); // Keep only digits
}

function formatearInstagram(inst: string): string {
  if (!inst) return "";
  const cleaned = inst.trim();
  if (cleaned.startsWith("@")) {
    return `https://instagram.com/${cleaned.substring(1)}`;
  }
  if (cleaned.startsWith("http")) {
    return cleaned;
  }
  return `https://instagram.com/${cleaned}`;
}

function formatearFacebook(fb: string): string {
  if (!fb) return "";
  const cleaned = fb.trim();
  if (cleaned.startsWith("http")) {
    return cleaned;
  }
  return `https://facebook.com/${cleaned}`;
}

export const PlanificadorDigital: React.FC<PlanificadorDigitalProps> = ({
  clientes,
  onRegistrarContactoClick,
}) => {
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [rubroSeleccionado, setRubroSeleccionado] = useState("Todos");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState("Todos");
  const [soloSinContactar, setSoloSinContactar] = useState(false);

  // Pitch dynamic template
  const [pitchPlantilla, setPitchPlantilla] = useState(
    "Hola {contacto}, te contacto de MateCode. Estuve viendo {nombre} y queríamos presentarte nuestra propuesta para {servicio}. ¿Te interesaría charlar brevemente?"
  );

  const toggleSeleccion = (id: string) => {
    if (seleccionados.includes(id)) {
      setSeleccionados(seleccionados.filter((s) => s !== id));
    } else {
      setSeleccionados([...seleccionados, id]);
    }
  };

  const getPitchReemplazado = (p: PotencialCliente): string => {
    let res = pitchPlantilla;
    res = res.replace(/{nombre}/g, p.nombre || "tu negocio");
    res = res.replace(/{contacto}/g, p.contacto || "cómo estás");
    res = res.replace(
      /{servicio}/g,
      p.tipoServicio || "nuestras soluciones digitales"
    );
    return res;
  };

  const abrirCanal = (
    p: PotencialCliente,
    canal: "whatsapp" | "instagram" | "facebook" | "email"
  ) => {
    const text = getPitchReemplazado(p);
    if (canal === "whatsapp" && p.whatsapp) {
      const telClean = limpiarTelefono(p.whatsapp);
      window.open(
        `https://wa.me/${telClean}?text=${encodeURIComponent(text)}`,
        "_blank"
      );
    } else if (canal === "instagram" && p.instagram) {
      window.open(formatearInstagram(p.instagram), "_blank");
    } else if (canal === "facebook" && p.facebook) {
      window.open(formatearFacebook(p.facebook), "_blank");
    } else if (canal === "email" && p.email) {
      window.open(
        `mailto:${p.email}?subject=${encodeURIComponent(
          "Contacto Comercial"
        )}&body=${encodeURIComponent(text)}`,
        "_blank"
      );
    }
  };

  // Unique lists for filtering dropdowns
  const rubrosExistentes = Array.from(
    new Set(clientes.map((c) => c.rubro || "General").filter(Boolean))
  );

  const filteredClientes = clientes.filter((c) => {
    // Filter by Rubro
    if (
      rubroSeleccionado !== "Todos" &&
      (c.rubro || "General") !== rubroSeleccionado
    ) {
      return false;
    }
    // Filter by Contact Status
    if (
      estadoSeleccionado !== "Todos" &&
      (c.estadoContacto || "Pendiente") !== estadoSeleccionado
    ) {
      return false;
    }
    // Filter only uncontacted
    if (
      soloSinContactar &&
      c.estadoContacto &&
      c.estadoContacto !== "Pendiente"
    ) {
      return false;
    }
    return true;
  });

  const queuedClientes = clientes.filter((c) => seleccionados.includes(c.id));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Selection Column */}
      <Card>
        <div className="mb-3 border-b border-[#2A2A2E] pb-3">
          <h4 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            Cola de Prospección Digital
          </h4>
          <p className="font-mono text-[10px] text-zinc-500">
            Filtra por rubro y estado para encolar leads de redes
          </p>
        </div>

        {/* Filter controls */}
        <div className="mb-4 grid grid-cols-2 gap-3 border-b border-[#2A2A2E]/50 pb-3">
          <Select
            label="Filtrar Rubro"
            options={[
              { value: "Todos", label: "Todos los Rubros" },
              ...rubrosExistentes.map((r) => ({ value: r, label: r })),
            ]}
            value={rubroSeleccionado}
            onChange={(val) => setRubroSeleccionado(val)}
          />

          <Select
            label="Estado Contacto"
            options={[
              { value: "Todos", label: "Todos los Estados" },
              { value: "Pendiente", label: "Pendientes" },
              { value: "Contactado", label: "Contactados" },
              { value: "Respondido", label: "Respondidos" },
              { value: "Sin Interés", label: "Sin Interés" },
            ]}
            value={estadoSeleccionado}
            onChange={(val) => setEstadoSeleccionado(val)}
          />

          <div className="col-span-2 flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="chkSoloSinContactar"
              checked={soloSinContactar}
              onChange={(e) => setSoloSinContactar(e.target.checked)}
              className="cursor-pointer rounded border-[#2A2A2E] bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
            />
            <label
              htmlFor="chkSoloSinContactar"
              className="cursor-pointer font-mono text-[10px] font-bold text-zinc-300 select-none"
            >
              Solo pendientes (Sin contactar aún)
            </label>
          </div>
        </div>

        {/* List of matching leads */}
        <div className="mb-4 flex max-h-[220px] flex-col gap-2 overflow-y-auto pr-1">
          {filteredClientes.map((c) => {
            const hasAnyDigital =
              c.whatsapp || c.email || c.instagram || c.facebook;
            return (
              <label
                key={c.id}
                className="flex cursor-pointer items-start gap-2 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-2.5 font-mono text-xs text-zinc-300 transition-all hover:border-zinc-800"
              >
                <input
                  type="checkbox"
                  checked={seleccionados.includes(c.id)}
                  onChange={() => toggleSeleccion(c.id)}
                  className="mt-0.5 cursor-pointer rounded border-[#2A2A2E] bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
                />
                <div className="flex w-full flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-100">{c.nombre}</span>
                    <span className="py-0.2 rounded border border-zinc-800 bg-zinc-900 px-1.5 text-[8px] font-bold text-zinc-400 uppercase">
                      {c.rubro || "General"}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {c.whatsapp && (
                      <span className="py-0.2 rounded bg-emerald-500/10 px-1 text-[8px] font-bold text-emerald-400">
                        💬 WA
                      </span>
                    )}
                    {c.instagram && (
                      <span className="py-0.2 rounded bg-pink-500/10 px-1 text-[8px] font-bold text-pink-400">
                        📸 IG
                      </span>
                    )}
                    {c.email && (
                      <span className="py-0.2 rounded bg-blue-500/10 px-1 text-[8px] font-bold text-blue-400">
                        ✉️ Mail
                      </span>
                    )}
                    {c.facebook && (
                      <span className="py-0.2 rounded bg-indigo-500/10 px-1 text-[8px] font-bold text-indigo-400">
                        📘 FB
                      </span>
                    )}
                    {!hasAnyDigital && (
                      <span className="text-[8px] text-red-400 italic">
                        ✗ Sin canales cargados
                      </span>
                    )}
                  </div>

                  {c.estadoContacto && c.estadoContacto !== "Pendiente" && (
                    <span className="mt-1 text-[9px] font-bold text-emerald-400">
                      Estado: {c.estadoContacto}
                    </span>
                  )}
                </div>
              </label>
            );
          })}
          {filteredClientes.length === 0 && (
            <span className="py-6 text-center font-mono text-xs text-zinc-500 italic">
              Ningún prospecto coincide con los filtros de contacto digital.
            </span>
          )}
        </div>

        {/* Pitch template editor */}
        <div className="flex flex-col gap-1.5 border-t border-[#2A2A2E]/50 pt-3">
          <label className="font-mono text-[10px] font-bold text-zinc-400 uppercase">
            Plantilla del Mensaje de Presentación (Pitch)
          </label>
          <textarea
            value={pitchPlantilla}
            onChange={(e) => setPitchPlantilla(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-zinc-800 bg-[#18181B] p-2.5 font-mono text-[11px] text-zinc-300 placeholder-zinc-700 focus:border-emerald-500 focus:outline-none"
          />
          <span className="font-mono text-[8px] leading-normal text-zinc-500">
            Variables disponibles: <b>{"{nombre}"}</b> (Negocio),{" "}
            <b>{"{contacto}"}</b> (Persona), <b>{"{servicio}"}</b> (Tipo
            servicio).
          </span>
        </div>
      </Card>

      {/* Action / Outreach Workspace Column */}
      <Card>
        <div className="mb-3 border-b border-[#2A2A2E] pb-3">
          <h4 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            Canales de Envío Activos ({queuedClientes.length})
          </h4>
          <p className="font-mono text-[10px] text-zinc-500">
            Abre los canales de mensajería y registra la gestión comercial
          </p>
        </div>

        <div className="flex max-h-[360px] flex-col gap-2.5 overflow-y-auto pr-1">
          {queuedClientes.length === 0 ? (
            <span className="py-16 text-center font-mono text-xs text-zinc-500 italic">
              Selecciona prospectos de la lista izquierda para iniciar el
              contacto.
            </span>
          ) : (
            queuedClientes.map((p) => {
              const replaces = getPitchReemplazado(p);
              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3 font-mono text-xs transition-all hover:border-zinc-800"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-100">
                        {p.nombre}
                      </span>
                      {p.contacto && (
                        <span className="ml-1 text-[10px] text-zinc-500">
                          ({p.contacto})
                        </span>
                      )}
                    </div>
                    <span className="py-0.2 rounded border border-zinc-800 bg-zinc-900 px-1 text-[8px] font-bold text-zinc-400 uppercase">
                      {p.estadoContacto || "Pendiente"}
                    </span>
                  </div>

                  {/* Pitch preview tooltip/box */}
                  <div className="max-h-[45px] overflow-y-auto rounded border border-[#2A2A2E] bg-[#18181B] p-2 text-[9px] leading-relaxed text-zinc-400 italic">
                    {replaces}
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 border-t border-[#2A2A2E]/50 pt-1">
                    {p.whatsapp && (
                      <button
                        onClick={() => abrirCanal(p, "whatsapp")}
                        className="rounded-lg border border-emerald-500/20 bg-emerald-600/10 px-2 py-1 text-[10px] font-bold text-emerald-400 transition-all hover:bg-emerald-600 hover:text-black"
                        title="Enviar WhatsApp"
                      >
                        💬 WhatsApp
                      </button>
                    )}
                    {p.instagram && (
                      <button
                        onClick={() => abrirCanal(p, "instagram")}
                        className="rounded-lg border border-pink-500/20 bg-pink-600/10 px-2 py-1 text-[10px] font-bold text-pink-400 transition-all hover:bg-pink-600 hover:text-black"
                        title="Ir a Instagram"
                      >
                        📸 Instagram
                      </button>
                    )}
                    {p.facebook && (
                      <button
                        onClick={() => abrirCanal(p, "facebook")}
                        className="rounded-lg border border-indigo-500/20 bg-indigo-600/10 px-2 py-1 text-[10px] font-bold text-indigo-400 transition-all hover:bg-indigo-600 hover:text-black"
                        title="Ir a Facebook"
                      >
                        📘 Facebook
                      </button>
                    )}
                    {p.email && (
                      <button
                        onClick={() => abrirCanal(p, "email")}
                        className="rounded-lg border border-blue-500/20 bg-blue-600/10 px-2 py-1 text-[10px] font-bold text-blue-400 transition-all hover:bg-blue-600 hover:text-black"
                        title="Enviar Correo"
                      >
                        ✉️ Mail
                      </button>
                    )}

                    <button
                      onClick={() => onRegistrarContactoClick(p)}
                      className="ml-auto rounded-lg border border-[#2A2A2E] bg-zinc-900 px-2 py-1 text-[10px] font-bold text-zinc-300 transition-all hover:bg-zinc-800"
                    >
                      Registrar Contacto ✓
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
