"use client";

import React, { useState } from "react";
import { MainLayout } from "../../../presentation/components/layout";
import { Button } from "../../../presentation/components/button";
import { Input } from "../../../presentation/components/input";
import { Select } from "../../../presentation/components/select";
import { useToast } from "../../../presentation/hooks/useToast";
import { Icono } from "../../../presentation/components/icons";
import { db } from "../../../offline/dexie/db";
import { useLiveQuery } from "dexie-react-hooks";
import { CrmUseCase } from "../../../application/use-cases/crm/CrmUseCase";

// Modular Views
import { VistaKanban } from "../../../presentation/components/crm/VistaKanban";
import { VistaTabla } from "../../../presentation/components/crm/VistaTabla";
import { VistaTarjetas } from "../../../presentation/components/crm/VistaTarjetas";
import { VistaCalendario } from "../../../presentation/components/crm/VistaCalendario";
import { VistaMapa } from "../../../presentation/components/crm/VistaMapa";
import { ModalCliente } from "../../../presentation/components/crm/ModalCliente";

type TabVista = "kanban" | "tabla" | "tarjetas" | "calendario" | "mapa";

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

const ESTADOS = [
  "Contacto Detectado",
  "Lead",
  "Negociación",
  "Cliente Activo",
  "Archivado",
];

const ORIGENES = ["Recomendación", "Redes Sociales", "Llamado en frío", "Web"];
const RESPONSABLES = ["Mateo Gomez", "Mariano", "Sofía Diaz"];

export default function ClientesPage() {
  const { mostrarToast } = useToast();
  const crmUseCase = new CrmUseCase();

  const [vista, setVista] = useState<TabVista>("kanban");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteEdicion, setClienteEdicion] = useState<ClienteCRM | null>(null);

  // Filters State
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroResponsable, setFiltroResponsable] = useState("Todos");
  const [filtroFavorito, setFiltroFavorito] = useState(false);

  // Bulk Selection State
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [bulkEstado, setBulkEstado] = useState("Contacto Detectado");
  const [bulkResponsable, setBulkResponsable] = useState("Mariano");
  const [bulkEtiquetas, setBulkEtiquetas] = useState("");

  const rawClientes = useLiveQuery(() => db.clientes.toArray()) || [];

  const clientes = (rawClientes as unknown as ClienteCRM[]).filter((c) => {
    const matchBusqueda =
      c.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
      (c.empresa || "").toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
      (c.correo || "").toLowerCase().includes(filtroBusqueda.toLowerCase());

    const matchEstado = filtroEstado === "Todos" || c.estado === filtroEstado;

    const matchResponsable =
      filtroResponsable === "Todos" || c.responsable === filtroResponsable;

    const matchFavorito = !filtroFavorito || c.favorito === true;

    return matchBusqueda && matchEstado && matchResponsable && matchFavorito;
  });

  const abrirCreacion = () => {
    setClienteEdicion(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (c: ClienteCRM) => {
    setClienteEdicion(c);
    setModalAbierto(true);
  };

  const guardarCliente = async (payload: Partial<ClienteCRM>) => {
    if (!payload.nombre?.trim() && !payload.empresa?.trim()) {
      mostrarToast(
        "Debes ingresar al menos el Nombre de la persona o la Empresa/Compañía.",
        "error"
      );
      return;
    }

    const completo = {
      ...payload,
      latitud:
        payload.latitud ??
        clienteEdicion?.latitud ??
        -34.6 + Math.random() * 0.1,
      longitud:
        payload.longitud ??
        clienteEdicion?.longitud ??
        -58.4 - Math.random() * 0.1,
    };

    if (clienteEdicion) {
      const res = await crmUseCase.actualizarCliente(
        clienteEdicion.id,
        completo as Record<string, unknown>
      );
      if (res.ok) {
        mostrarToast("Cliente actualizado con éxito.", "exito");
      }
    } else {
      const res = await crmUseCase.crearCliente(
        completo as Record<string, unknown>
      );
      if (res.ok) {
        mostrarToast("Cliente registrado correctamente.", "exito");
      }
    }

    setModalAbierto(false);
  };

  const eliminarCliente = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este contacto?")) {
      const res = await crmUseCase.eliminarCliente(id);
      if (res.ok) {
        mostrarToast("Cliente eliminado correctamente.", "exito");
      }
    }
  };

  const alternarFavorito = async (c: ClienteCRM) => {
    const res = await crmUseCase.actualizarCliente(c.id, {
      ...c,
      favorito: !c.favorito,
    } as unknown as Record<string, unknown>);
    if (res.ok) {
      mostrarToast(
        c.favorito ? "Quitado de favoritos." : "Marcado como favorito.",
        "exito"
      );
    }
  };

  // Bulk actions handlers
  const handleBulkEstado = async () => {
    if (seleccionados.length === 0) return;
    const res = await crmUseCase.cambiarEstadoMasivo(seleccionados, bulkEstado);
    if (res.ok) {
      mostrarToast("Estados masivos actualizados.", "exito");
      setSeleccionados([]);
    }
  };

  const handleBulkResponsable = async () => {
    if (seleccionados.length === 0) return;
    const res = await crmUseCase.asignarResponsableMasivo(
      seleccionados,
      bulkResponsable
    );
    if (res.ok) {
      mostrarToast("Responsables asignados masivamente.", "exito");
      setSeleccionados([]);
    }
  };

  const handleBulkEtiquetas = async () => {
    if (seleccionados.length === 0) return;
    const list = bulkEtiquetas
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const res = await crmUseCase.agregarEtiquetasMasivas(seleccionados, list);
    if (res.ok) {
      mostrarToast("Etiquetas añadidas masivamente.", "exito");
      setSeleccionados([]);
    }
  };

  const handleBulkEliminar = async () => {
    if (seleccionados.length === 0) return;
    if (confirm(`¿Confirmas eliminar ${seleccionados.length} contactos?`)) {
      for (const id of seleccionados) {
        await crmUseCase.eliminarCliente(id);
      }
      mostrarToast("Contactos eliminados masivamente.", "exito");
      setSeleccionados([]);
    }
  };

  const toggleSeleccion = (id: string) => {
    if (seleccionados.includes(id)) {
      setSeleccionados(seleccionados.filter((s) => s !== id));
    } else {
      setSeleccionados([...seleccionados, id]);
    }
  };

  const toggleTodos = () => {
    if (seleccionados.length === clientes.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(clientes.map((c) => c.id));
    }
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "CRM Comercial" },
  ];

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              CRM Comercial Inteligente
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Fidelización, leads, visitas y embudo de conversión comercial.
            </p>
          </div>
          <Button
            onClick={abrirCreacion}
            icono={<Icono.Plus className="h-4 w-4" />}
          >
            Registrar Contacto
          </Button>
        </div>

        <div className="grid grid-cols-1 items-end gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4 md:grid-cols-4">
          <Input
            label="Buscar por texto"
            value={filtroBusqueda}
            onChange={(e) => setFiltroBusqueda(e.target.value)}
            placeholder="Compañía, mail, nombre..."
          />

          <Select
            label="Filtrar por estado"
            options={[
              { value: "Todos", label: "Todos los estados" },
              ...ESTADOS.map((e) => ({ value: e, label: e })),
            ]}
            value={filtroEstado}
            onChange={(val) => setFiltroEstado(val)}
          />

          <Select
            label="Asignado a"
            options={[
              { value: "Todos", label: "Cualquiera" },
              ...RESPONSABLES.map((r) => ({ value: r, label: r })),
            ]}
            value={filtroResponsable}
            onChange={(val) => setFiltroResponsable(val)}
          />

          <div className="mb-2.5 flex items-center gap-3.5">
            <button
              onClick={() => setFiltroFavorito(!filtroFavorito)}
              className={`flex w-full items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 font-mono text-xs font-bold transition-all select-none ${
                filtroFavorito
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Favoritos
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-[#2A2A2E]">
          {(
            [
              { id: "kanban", label: "Tablero Kanban" },
              { id: "tabla", label: "Vista de Lista / Tabla" },
              { id: "tarjetas", label: "Vista de Tarjetas" },
              { id: "calendario", label: "Agenda y Seguimientos" },
              { id: "mapa", label: "Geolocalización / Mapa" },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              onClick={() => setVista(v.id)}
              className={`border-b-2 px-4 py-2.5 font-mono text-xs font-bold tracking-wide whitespace-nowrap transition-all ${
                vista === v.id
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {seleccionados.length > 0 && vista === "tabla" && (
          <div className="animate-in slide-in-from-top flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 duration-200">
            <span className="font-mono text-xs font-bold text-emerald-400">
              {seleccionados.length} elementos seleccionados
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Select
                  options={ESTADOS.map((e) => ({ value: e, label: e }))}
                  value={bulkEstado}
                  onChange={(val) => setBulkEstado(val)}
                />
                <Button onClick={handleBulkEstado}>Mover Estado</Button>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  options={RESPONSABLES.map((r) => ({ value: r, label: r }))}
                  value={bulkResponsable}
                  onChange={(val) => setBulkResponsable(val)}
                />
                <Button onClick={handleBulkResponsable}>
                  Asignar Propietario
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={bulkEtiquetas}
                  onChange={(e) => setBulkEtiquetas(e.target.value)}
                  placeholder="Etiqueta1, Etiqueta2"
                />
                <Button onClick={handleBulkEtiquetas}>Añadir Tags</Button>
              </div>

              <button
                onClick={handleBulkEliminar}
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 font-mono text-xs font-bold text-red-400 transition-all hover:bg-red-500/20"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {vista === "kanban" && (
            <VistaKanban
              clientes={clientes}
              estados={ESTADOS}
              onEdicion={abrirEdicion}
              onEliminar={eliminarCliente}
              onAlternarFavorito={alternarFavorito}
            />
          )}

          {vista === "tabla" && (
            <VistaTabla
              clientes={clientes}
              seleccionados={seleccionados}
              onToggleSeleccion={toggleSeleccion}
              onToggleTodos={toggleTodos}
              onEdicion={abrirEdicion}
              onEliminar={eliminarCliente}
            />
          )}

          {vista === "tarjetas" && (
            <VistaTarjetas
              clientes={clientes}
              onEdicion={abrirEdicion}
              onEliminar={eliminarCliente}
            />
          )}

          {vista === "calendario" && (
            <VistaCalendario clientes={clientes} onEdicion={abrirEdicion} />
          )}

          {vista === "mapa" && <VistaMapa clientes={clientes} />}
        </div>

        <ModalCliente
          abierto={modalAbierto}
          clienteEdicion={clienteEdicion}
          onCerrar={() => setModalAbierto(false)}
          onConfirmar={guardarCliente}
          estados={ESTADOS}
          origenes={ORIGENES}
          responsables={RESPONSABLES}
        />
      </div>
    </MainLayout>
  );
}
