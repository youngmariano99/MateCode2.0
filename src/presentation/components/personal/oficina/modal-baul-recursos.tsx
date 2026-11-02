"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Dialog } from "../../dialog";
import { Icono } from "../../icons";
import { Badge } from "../../badge";
import { Button } from "../../button";
import { useToast } from "../../../hooks/useToast";
import { GestionarRecursosOficinaUseCase } from "../../../../application/use-cases/personal/gestionar-recursos-oficina.use-case";
import { obtenerDiaTareaHoy } from "../../../../domain/entidades/personal.entity";
import { calcularEstadoHito } from "../../../../domain/entidades/recurso-oficina.entity";
import { QueueService } from "../../../../offline/services/queue.service";

interface ModalBaulRecursosProps {
  abierto: boolean;
  onCerrar: () => void;
  pestanaInicial?: "links" | "hitos" | "prospecto" | "notas";
}

const recursosUseCase = new GestionarRecursosOficinaUseCase();

export const ModalBaulRecursos: React.FC<ModalBaulRecursosProps> = ({
  abierto,
  onCerrar,
  pestanaInicial = "links",
}) => {
  const { mostrarToast } = useToast();
  const [pestana, setPestana] = useState(pestanaInicial);
  const hoy = obtenerDiaTareaHoy();

  // Estados para pestaña Links
  const [busquedaLink, setBusquedaLink] = useState("");
  const [tagSeleccionado, setTagSeleccionado] = useState<string | null>(null);
  const [mostrarFormLink, setMostrarFormLink] = useState(false);
  const [nuevoLinkTitulo, setNuevoLinkTitulo] = useState("");
  const [nuevoLinkUrl, setNuevoLinkUrl] = useState("");
  const [nuevoLinkTags, setNuevoLinkTags] = useState("");
  const [nuevoLinkDesc, setNuevoLinkDesc] = useState("");

  // Estados para pestaña Hitos
  const [mostrarFormHito, setMostrarFormHito] = useState(false);
  const [nuevoHitoTitulo, setNuevoHitoTitulo] = useState("");
  const [nuevoHitoFecha, setNuevoHitoFecha] = useState("");
  const [nuevoHitoAviso, setNuevoHitoAviso] = useState("3");
  const [nuevoHitoDesc, setNuevoHitoDesc] = useState("");

  // Estados para pestaña Quick-Add Prospecto
  const [prospectoNombre, setProspectoNombre] = useState("");
  const [prospectoRubro, setProspectoRubro] = useState("");
  const [prospectoPrioridad, setProspectoPrioridad] = useState<
    "Alta" | "Media" | "Baja"
  >("Media");
  const [prospectoTelefono, setProspectoTelefono] = useState("");
  const [prospectoInstagram, setProspectoInstagram] = useState("");
  const [prospectoNota, setProspectoNota] = useState("");
  const [guardandoProspecto, setGuardandoProspecto] = useState(false);

  // Estados para pestaña Notas Rápidas
  const [textoNota, setTextoNota] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);

  // Queries reactivas a Dexie
  const links =
    useLiveQuery(
      () => db.recurso_oficina.where("tipo").equals("link_util").toArray(),
      []
    ) ?? [];

  const hitos =
    useLiveQuery(
      () => db.recurso_oficina.where("tipo").equals("hito_fecha").toArray(),
      []
    ) ?? [];

  const notasInbox =
    useLiveQuery(
      () =>
        db.inbox_item
          .where("estado")
          .equals("pendiente")
          .reverse()
          .limit(10)
          .toArray(),
      []
    ) ?? [];

  // Tags únicos de links
  const tagsDisponibles = Array.from(
    new Set(links.flatMap((l) => l.etiquetas || []))
  );

  const linksFiltrados = links.filter((l) => {
    const coincideTexto =
      !busquedaLink.trim() ||
      l.titulo.toLowerCase().includes(busquedaLink.toLowerCase()) ||
      (l.descripcion &&
        l.descripcion.toLowerCase().includes(busquedaLink.toLowerCase()));
    const coincideTag =
      !tagSeleccionado ||
      (l.etiquetas && l.etiquetas.includes(tagSeleccionado));
    return coincideTexto && coincideTag;
  });

  const hitosOrdenados = [...hitos].sort((a, b) =>
    (a.fechaLimite ?? "").localeCompare(b.fechaLimite ?? "")
  );

  // Handler Guardar Link
  const handleGuardarLink = async () => {
    if (!nuevoLinkTitulo.trim() || !nuevoLinkUrl.trim()) {
      mostrarToast("El título y la URL son obligatorios.", "error");
      return;
    }
    const etiquetas = nuevoLinkTags
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    const res = await recursosUseCase.crearRecurso({
      tipo: "link_util",
      titulo: nuevoLinkTitulo.trim(),
      url: nuevoLinkUrl.trim(),
      etiquetas,
      descripcion: nuevoLinkDesc.trim() || undefined,
    });

    if (res.ok) {
      mostrarToast("Enlace guardado con éxito.", "exito");
      setNuevoLinkTitulo("");
      setNuevoLinkUrl("");
      setNuevoLinkTags("");
      setNuevoLinkDesc("");
      setMostrarFormLink(false);
    } else {
      mostrarToast(res.error?.mensaje || "Error al guardar enlace.", "error");
    }
  };

  // Handler Guardar Hito
  const handleGuardarHito = async () => {
    if (!nuevoHitoTitulo.trim() || !nuevoHitoFecha.trim()) {
      mostrarToast("El título y la fecha son obligatorios.", "error");
      return;
    }

    const res = await recursosUseCase.crearRecurso({
      tipo: "hito_fecha",
      titulo: nuevoHitoTitulo.trim(),
      fechaLimite: nuevoHitoFecha,
      diasAvisoPrevio: Number(nuevoHitoAviso) || 0,
      descripcion: nuevoHitoDesc.trim() || undefined,
      etiquetas: ["hito"],
    });

    if (res.ok) {
      mostrarToast("Hito agendado con éxito.", "exito");
      setNuevoHitoTitulo("");
      setNuevoHitoFecha("");
      setNuevoHitoAviso("3");
      setNuevoHitoDesc("");
      setMostrarFormHito(false);
    } else {
      mostrarToast(res.error?.mensaje || "Error al agendar hito.", "error");
    }
  };

  // Handler Quick-Add Prospecto
  const handleGuardarProspecto = async () => {
    if (!prospectoNombre.trim()) {
      mostrarToast(
        "El nombre o empresa del prospecto es obligatorio.",
        "error"
      );
      return;
    }

    setGuardandoProspecto(true);
    const ahora = Date.now();
    const id = `pot_${ahora}_${Math.random().toString(36).substring(2, 6)}`;

    try {
      await db.potencial_cliente.put({
        id,
        nombre: prospectoNombre.trim(),
        rubro: prospectoRubro.trim() || undefined,
        prioridad: prospectoPrioridad,
        estado: "Nuevo",
        creadoEn: ahora,
        actualizadoEn: ahora,
      });

      if (
        prospectoTelefono.trim() ||
        prospectoInstagram.trim() ||
        prospectoNota.trim()
      ) {
        await db.ficha_digital.put({
          potencialClienteId: id,
          whatsapp: prospectoTelefono.trim() || undefined,
          instagram: prospectoInstagram.trim() || undefined,
          notasExtra: prospectoNota.trim() || undefined,
          dolorTags: [],
          tieneWeb: "no",
          usaCatalogoNativoWhatsapp: false,
          actualizadoEn: ahora,
        });
      }

      await QueueService.encolar("potencial_cliente", "crear", id, {
        id,
        nombre: prospectoNombre.trim(),
        estado: "Nuevo",
      });

      mostrarToast(
        `Prospecto "${prospectoNombre}" registrado exitosamente.`,
        "exito"
      );
      setProspectoNombre("");
      setProspectoRubro("");
      setProspectoTelefono("");
      setProspectoInstagram("");
      setProspectoNota("");
    } catch {
      mostrarToast("Error al registrar el prospecto.", "error");
    } finally {
      setGuardandoProspecto(false);
    }
  };

  // Handler Guardar Nota Rápida
  const handleGuardarNota = async () => {
    if (!textoNota.trim()) return;
    setGuardandoNota(true);
    const ahora = Date.now();
    const id = `inbox_${ahora}_${Math.random().toString(36).substring(2, 6)}`;

    try {
      await db.inbox_item.put({
        id,
        texto: textoNota.trim(),
        estado: "pendiente",
        creadoEn: ahora,
        actualizadoEn: ahora,
      });

      await QueueService.encolar("inbox_item", "crear", id, {
        id,
        texto: textoNota.trim(),
      });

      mostrarToast("Nota enviada a la bandeja de entrada.", "exito");
      setTextoNota("");
    } catch {
      mostrarToast("Error al guardar la nota.", "error");
    } finally {
      setGuardandoNota(false);
    }
  };

  if (!abierto) return null;

  return (
    <Dialog
      abierto={abierto}
      onClose={onCerrar}
      titulo="Baúl de Recursos & Escritorio Rápido"
      maxWidth="xl"
    >
      <div className="flex flex-col gap-4">
        {/* Selector de pestañas */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#2A2A2E] pb-3">
          <button
            onClick={() => setPestana("links")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              pestana === "links"
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Icono.Package className="h-3.5 w-3.5" />
            Links Útiles ({links.length})
          </button>
          <button
            onClick={() => setPestana("hitos")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              pestana === "hitos"
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Icono.Calendario className="h-3.5 w-3.5" />
            Hitos y Fechas ({hitos.length})
          </button>
          <button
            onClick={() => setPestana("prospecto")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              pestana === "prospecto"
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Icono.Plus className="h-3.5 w-3.5" />+ Prospecto Rápido
          </button>
          <button
            onClick={() => setPestana("notas")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              pestana === "notas"
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Icono.Inbox className="h-3.5 w-3.5" />
            Notas Rápidas
          </button>
        </div>

        {/* CONTENIDO PESTAÑA 1: LINKS ÚTILES */}
        {pestana === "links" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <input
                type="text"
                placeholder="Buscar recursos o enlaces..."
                value={busquedaLink}
                onChange={(e) => setBusquedaLink(e.target.value)}
                className="min-w-48 flex-1 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
              />
              <Button
                variant="outline"
                onClick={() => setMostrarFormLink(!mostrarFormLink)}
                className="px-2.5 py-1.5 text-xs"
              >
                {mostrarFormLink ? "Cancelar" : "+ Nuevo Link"}
              </Button>
            </div>

            {/* Tags para filtrar */}
            {tagsDisponibles.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={() => setTagSeleccionado(null)}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase transition-colors ${
                    tagSeleccionado === null
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-[#0D0D0F] text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Todos
                </button>
                {tagsDisponibles.map((tag) => (
                  <button
                    key={tag}
                    onClick={() =>
                      setTagSeleccionado(tag === tagSeleccionado ? null : tag)
                    }
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                      tagSeleccionado === tag
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-[#0D0D0F] text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {/* Formulario nuevo link */}
            {mostrarFormLink && (
              <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                <span className="text-xs font-bold text-emerald-400">
                  Guardar nuevo enlace
                </span>
                <input
                  type="text"
                  placeholder="Título o nombre del recurso"
                  value={nuevoLinkTitulo}
                  onChange={(e) => setNuevoLinkTitulo(e.target.value)}
                  className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
                />
                <input
                  type="url"
                  placeholder="URL (https://...)"
                  value={nuevoLinkUrl}
                  onChange={(e) => setNuevoLinkUrl(e.target.value)}
                  className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Etiquetas separadas por coma (ej. ERP, Docs, Portfolio)"
                    value={nuevoLinkTags}
                    onChange={(e) => setNuevoLinkTags(e.target.value)}
                    className="flex-1 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
                  />
                  <Button
                    onClick={handleGuardarLink}
                    className="px-3 py-1.5 text-xs"
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            )}

            {/* Listado de links */}
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
              {linksFiltrados.length === 0 ? (
                <p className="py-4 text-center text-xs text-zinc-500">
                  No hay enlaces guardados {busquedaLink && "con esa búsqueda"}.
                </p>
              ) : (
                linksFiltrados.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3 transition-colors hover:border-zinc-700"
                  >
                    <div className="flex flex-col gap-1 overflow-hidden">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm font-semibold text-zinc-200 hover:text-emerald-400"
                      >
                        {link.titulo} ↗
                      </a>
                      <span className="truncate text-xs text-zinc-500">
                        {link.url}
                      </span>
                      {link.etiquetas && link.etiquetas.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {link.etiquetas.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[9px] text-zinc-400"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        void recursosUseCase.eliminarRecurso(link.id)
                      }
                      title="Eliminar link"
                      className="shrink-0 p-1.5 text-zinc-600 hover:text-red-400"
                    >
                      <Icono.Close className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CONTENIDO PESTAÑA 2: HITOS Y FECHAS IMPORTANTES */}
        {pestana === "hitos" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Fechas clave con aviso previo en el banner de la Oficina.
              </span>
              <Button
                variant="outline"
                onClick={() => setMostrarFormHito(!mostrarFormHito)}
                className="px-2.5 py-1.5 text-xs"
              >
                {mostrarFormHito ? "Cancelar" : "+ Nuevo Hito"}
              </Button>
            </div>

            {/* Formulario nuevo hito */}
            {mostrarFormHito && (
              <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                <span className="text-xs font-bold text-emerald-400">
                  Agendar Fecha Clave / Hito
                </span>
                <input
                  type="text"
                  placeholder="Título (ej: Parcial de Base de Datos, Entrega de Cliente)"
                  value={nuevoHitoTitulo}
                  onChange={(e) => setNuevoHitoTitulo(e.target.value)}
                  className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] text-zinc-500">
                      Fecha del evento
                    </label>
                    <input
                      type="date"
                      value={nuevoHitoFecha}
                      onChange={(e) => setNuevoHitoFecha(e.target.value)}
                      className="w-full rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-zinc-500">
                      Avisarme con anticipación
                    </label>
                    <select
                      value={nuevoHitoAviso}
                      onChange={(e) => setNuevoHitoAviso(e.target.value)}
                      className="w-full rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
                    >
                      <option value="0">El mismo día</option>
                      <option value="1">1 día antes</option>
                      <option value="3">3 días antes</option>
                      <option value="7">1 semana antes</option>
                    </select>
                  </div>
                </div>
                <Button
                  onClick={handleGuardarHito}
                  className="mt-1 self-end px-3 py-1.5 text-xs"
                >
                  Guardar Hito
                </Button>
              </div>
            )}

            {/* Listado de hitos */}
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
              {hitosOrdenados.length === 0 ? (
                <p className="py-4 text-center text-xs text-zinc-500">
                  No tenés fechas importantes agendadas.
                </p>
              ) : (
                hitosOrdenados.map((hito) => {
                  const estado = calcularEstadoHito(hito, hoy);
                  const colorBadge =
                    estado?.estado === "hoy"
                      ? "emerald"
                      : estado?.estado === "proximo"
                        ? "amber"
                        : estado?.estado === "vencido"
                          ? "zinc"
                          : "sky";

                  return (
                    <div
                      key={hito.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-zinc-200">
                            {hito.titulo}
                          </span>
                          {estado && (
                            <Badge color={colorBadge}>
                              {estado.mensajeAlerta}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500">
                          Fecha: {hito.fechaLimite} · Alerta:{" "}
                          {hito.diasAvisoPrevio ?? 0} días antes
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          void recursosUseCase.eliminarRecurso(hito.id)
                        }
                        title="Eliminar hito"
                        className="shrink-0 p-1.5 text-zinc-600 hover:text-red-400"
                      >
                        <Icono.Close className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* CONTENIDO PESTAÑA 3: QUICK-ADD PROSPECTO */}
        {pestana === "prospecto" && (
          <div className="flex flex-col gap-3 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-4">
            <span className="text-xs text-zinc-400">
              Registrá rápidamente un nuevo potencial cliente en tu embudo de
              Contacto en Frío sin salir de la Oficina.
            </span>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-zinc-400 uppercase">
                  Empresa o Nombre *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Panadería San Martín"
                  value={prospectoNombre}
                  onChange={(e) => setProspectoNombre(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2E] bg-[#18181B] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-zinc-400 uppercase">
                  Rubro
                </label>
                <input
                  type="text"
                  placeholder="Ej: Gastronomía / Comercio"
                  value={prospectoRubro}
                  onChange={(e) => setProspectoRubro(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2E] bg-[#18181B] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-zinc-400 uppercase">
                  WhatsApp o Teléfono
                </label>
                <input
                  type="text"
                  placeholder="+54 9 11 ..."
                  value={prospectoTelefono}
                  onChange={(e) => setProspectoTelefono(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2E] bg-[#18181B] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-zinc-400 uppercase">
                  Instagram / Web
                </label>
                <input
                  type="text"
                  placeholder="@cuenta o link"
                  value={prospectoInstagram}
                  onChange={(e) => setProspectoInstagram(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2E] bg-[#18181B] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold text-zinc-400 uppercase">
                Prioridad
              </label>
              <div className="flex gap-2">
                {(["Alta", "Media", "Baja"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProspectoPrioridad(p)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                      prospectoPrioridad === p
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold text-zinc-400 uppercase">
                Dolor o Comentario Rápido
              </label>
              <input
                type="text"
                placeholder="Ej: Usa Excel manual para stock, necesita automatización"
                value={prospectoNota}
                onChange={(e) => setProspectoNota(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A2E] bg-[#18181B] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
              />
            </div>

            <Button
              onClick={handleGuardarProspecto}
              cargando={guardandoProspecto}
              className="mt-2 self-end px-4 py-2 text-xs"
            >
              Guardar en Contacto en Frío
            </Button>
          </div>
        )}

        {/* CONTENIDO PESTAÑA 4: NOTAS RÁPIDAS (INBOX) */}
        {pestana === "notas" && (
          <div className="flex flex-col gap-3">
            <span className="text-xs text-zinc-400">
              Captura rápida de pensamientos o pendientes. Se guardan
              directamente en tu Bandeja de Entrada.
            </span>
            <div className="flex flex-col gap-2">
              <textarea
                rows={3}
                placeholder="Escribí una idea o nota rápida..."
                value={textoNota}
                onChange={(e) => setTextoNota(e.target.value)}
                className="w-full resize-none rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
              />
              <Button
                onClick={handleGuardarNota}
                cargando={guardandoNota}
                disabled={!textoNota.trim()}
                className="self-end px-3 py-1.5 text-xs"
              >
                Capturar en Inbox
              </Button>
            </div>

            {/* Últimas notas capturadas */}
            {notasInbox.length > 0 && (
              <div className="mt-2 flex flex-col gap-1.5">
                <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                  Últimas capturas recientes
                </span>
                <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
                  {notasInbox.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-2 text-xs text-zinc-300"
                    >
                      {item.texto}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};
