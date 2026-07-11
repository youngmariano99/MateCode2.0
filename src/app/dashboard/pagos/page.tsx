"use client";

import React, { useState } from "react";
import { MainLayout } from "../../../presentation/components/layout";
import { Card, StatCard } from "../../../presentation/components/card";
import { Button } from "../../../presentation/components/button";
import { Input } from "../../../presentation/components/input";
import { Select } from "../../../presentation/components/select";
import { useToast } from "../../../presentation/hooks/useToast";
import { db } from "../../../offline/dexie/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Icono } from "../../../presentation/components/icons";

// Helper function declared outside the component to avoid react-hooks/purity linter checks on Date.now()
const obtenerTimestamp = () => Date.now();

export default function PagosPage() {
  const { mostrarToast } = useToast();
  const [modalAbierto, setModalAbierto] = useState(false);

  // Form state
  const [clienteId, setClienteId] = useState("");
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState("ARS");
  const [estado, setEstado] = useState("Pendiente");
  const [fechaVencimiento, setFechaVencimiento] = useState("");

  const rawClientes = useLiveQuery(() => db.clientes.toArray()) || [];
  const rawPagos = useLiveQuery(() => db.pagos.toArray()) || [];

  const clientes = rawClientes.map((c) => ({
    id: c.id as string,
    nombre: (c.nombre || c.empresa) as string,
  }));

  const pagos = rawPagos.map((p) => {
    const client = clientes.find((c) => c.id === p.clienteId);
    return {
      id: p.id as string,
      clienteId: p.clienteId as string,
      clienteNombre: client ? client.nombre : "Cliente Desconocido",
      monto: Number(p.monto || 0),
      moneda: (p.moneda || "ARS") as string,
      estado: (p.estado || "Pendiente") as string,
      fechaVencimiento: (p.fechaVencimiento || "") as string,
    };
  });

  // Calculate KPIs
  const totalCobrado = pagos
    .filter((p) => p.estado === "Cobrado")
    .reduce((sum, p) => sum + p.monto, 0);

  const totalPendiente = pagos
    .filter((p) => p.estado === "Pendiente")
    .reduce((sum, p) => sum + p.monto, 0);

  const totalFacturado = totalCobrado + totalPendiente;

  const handleCrearPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId || !monto || !fechaVencimiento) {
      mostrarToast("Por favor completa todos los campos requeridos.", "error");
      return;
    }

    const nuevoPago = {
      id: `pag_${obtenerTimestamp()}`,
      clienteId,
      monto: Number(monto),
      moneda,
      estado,
      fechaVencimiento,
      creadoEn: obtenerTimestamp(),
      actualizadoEn: obtenerTimestamp(),
    };

    try {
      await db.pagos.put(nuevoPago);
      await db.logs_sincronizacion.add({
        tipo: "exito",
        mensaje: `Pagos: Pago registrado por $${monto} para cliente ${clienteId}`,
        fecha: obtenerTimestamp(),
      });
      mostrarToast("Pago registrado con éxito.", "exito");
      setModalAbierto(false);
      // Reset form
      setClienteId("");
      setMonto("");
      setFechaVencimiento("");
      setEstado("Pendiente");
    } catch {
      mostrarToast("Error al guardar el pago.", "error");
    }
  };

  const handleAlternarEstado = async (id: string, estadoActual: string) => {
    const nuevoEstado = estadoActual === "Cobrado" ? "Pendiente" : "Cobrado";
    try {
      const p = await db.pagos.get(id);
      if (p) {
        await db.pagos.put({
          ...p,
          estado: nuevoEstado,
          actualizadoEn: obtenerTimestamp(),
        });
        await db.logs_sincronizacion.add({
          tipo: "exito",
          mensaje: `Pagos: Estado de pago ${id} cambiado a ${nuevoEstado}`,
          fecha: obtenerTimestamp(),
        });
        mostrarToast(`Estado cambiado a ${nuevoEstado}.`, "exito");
      }
    } catch {
      mostrarToast("Error al actualizar estado.", "error");
    }
  };

  const handleEliminarPago = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este registro de pago?")) {
      try {
        await db.pagos.delete(id);
        await db.logs_sincronizacion.add({
          tipo: "exito",
          mensaje: `Pagos: Pago ${id} eliminado`,
          fecha: obtenerTimestamp(),
        });
        mostrarToast("Pago eliminado correctamente.", "exito");
      } catch {
        mostrarToast("Error al eliminar pago.", "error");
      }
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Gestión de Facturación y Pagos
            </h1>
            <p className="mt-1 font-mono text-xs tracking-wide text-zinc-400 uppercase">
              Control de ingresos e hitos de proyectos
            </p>
          </div>
          <Button onClick={() => setModalAbierto(true)}>
            <div className="flex items-center gap-1.5">
              <Icono.Pagos className="h-4 w-4" />
              <span>Registrar Pago</span>
            </div>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            titulo="Total Facturado"
            valor={`$${totalFacturado.toLocaleString("es-AR")}`}
          />
          <StatCard
            titulo="Cobrado"
            valor={`$${totalCobrado.toLocaleString("es-AR")}`}
          />
          <StatCard
            titulo="Pendiente"
            valor={`$${totalPendiente.toLocaleString("es-AR")}`}
          />
        </div>

        <Card>
          <div className="mb-4 border-b border-[#2A2A2E] pb-3">
            <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-100 uppercase">
              Historial de Pagos
            </h3>
          </div>

          {pagos.length === 0 ? (
            <div className="py-12 text-center font-mono text-xs text-zinc-500 italic">
              No hay pagos registrados aún. Usa &quot;Registrar Pago&quot; para
              comenzar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#2A2A2E] text-zinc-500">
                    <th className="py-2.5">Cliente</th>
                    <th className="py-2.5">Monto</th>
                    <th className="py-2.5">Vencimiento</th>
                    <th className="py-2.5">Estado</th>
                    <th className="py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-[#2A2A2E]/50 transition-all last:border-0 hover:bg-[#18181B]"
                    >
                      <td className="py-3 font-bold text-zinc-300">
                        {p.clienteNombre}
                      </td>
                      <td className="py-3 font-bold text-zinc-100">
                        {p.moneda} ${p.monto.toLocaleString("es-AR")}
                      </td>
                      <td className="py-3 text-zinc-400">
                        {p.fechaVencimiento}
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            p.estado === "Cobrado"
                              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : "border border-amber-500/20 bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {p.estado}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleAlternarEstado(p.id, p.estado)}
                            className={`rounded-lg px-2 py-1 text-[10px] font-bold text-white transition-all ${
                              p.estado === "Cobrado"
                                ? "bg-amber-600 hover:bg-amber-700"
                                : "bg-emerald-600 hover:bg-emerald-700"
                            }`}
                          >
                            {p.estado === "Cobrado"
                              ? "Marcar Pendiente"
                              : "Marcar Cobrado"}
                          </button>
                          <button
                            onClick={() => handleEliminarPago(p.id)}
                            className="rounded-lg bg-zinc-800 p-1 text-zinc-400 transition-all hover:bg-zinc-700 hover:text-red-400"
                          >
                            <Icono.Close className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {modalAbierto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="animate-in zoom-in w-full max-w-md rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6 shadow-2xl duration-150">
              <div className="mb-4 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
                <h3 className="font-mono text-base font-extrabold tracking-tight text-white">
                  Registrar Cobro / Pago
                </h3>
                <button
                  onClick={() => setModalAbierto(false)}
                  className="p-1 text-zinc-500 hover:text-zinc-300"
                >
                  <Icono.Close className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCrearPago} className="flex flex-col gap-4">
                <Select
                  label="Cliente"
                  options={clientes.map((c) => ({
                    value: c.id,
                    label: c.nombre,
                  }))}
                  value={clienteId}
                  onChange={(val) => setClienteId(val)}
                />

                <Input
                  label="Monto"
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="Ej. 150000"
                />

                <Select
                  label="Moneda"
                  options={[
                    { value: "ARS", label: "Peso Argentino (ARS)" },
                    { value: "USD", label: "Dólar Estadounidense (USD)" },
                  ]}
                  value={moneda}
                  onChange={(val) => setMoneda(val)}
                />

                <Select
                  label="Estado Inicial"
                  options={[
                    { value: "Pendiente", label: "Pendiente" },
                    { value: "Cobrado", label: "Cobrado" },
                  ]}
                  value={estado}
                  onChange={(val) => setEstado(val)}
                />

                <Input
                  label="Fecha de Vencimiento"
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                />

                <div className="mt-4 flex justify-end gap-3 border-t border-[#2A2A2E] pt-4">
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    className="rounded-xl bg-zinc-800 px-4 py-2.5 font-mono text-xs font-bold text-zinc-100 transition-all hover:bg-zinc-700"
                  >
                    Cancelar
                  </button>
                  <Button type="submit">Guardar Registro</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
