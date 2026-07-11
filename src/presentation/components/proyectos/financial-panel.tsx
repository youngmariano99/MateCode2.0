"use client";

import React, { useState, useEffect } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { Input } from "../input";
import { Select } from "../select";
import { db } from "../../../offline/dexie/db";

interface FinancialPanelProps {
  proyectoId: string;
  clienteId?: string;
  initialFinanciero?: {
    precioTotal?: number;
    moneda?: string;
    formaPago?: string;
    cantidadPagos?: number;
    estadoPago?: string;
  };
  onSave: (payload: Record<string, unknown>) => void;
}

interface EpicaItem {
  id: string;
  nombre: string;
  descripcion?: string;
}

export const FinancialPanel: React.FC<FinancialPanelProps> = ({
  proyectoId,
  clienteId,
  initialFinanciero = {},
  onSave,
}) => {
  const [precioTotal, setPrecioTotal] = useState(
    initialFinanciero.precioTotal || 0
  );
  const [moneda, setMoneda] = useState(initialFinanciero.moneda || "USD");
  const [formaPago, setFormaPago] = useState(
    initialFinanciero.formaPago || "Transferencia"
  );
  const [cantidadPagos, setCantidadPagos] = useState(
    initialFinanciero.cantidadPagos || 1
  );
  const [estadoPago, setEstadoPago] = useState(
    initialFinanciero.estadoPago || "Pendiente"
  );

  const [epicas, setEpicas] = useState<EpicaItem[]>([]);
  const [sugerenciaPlan, setSugerenciaPlan] = useState<string>("");

  useEffect(() => {
    const fetchEpicas = async () => {
      const list = await db.epicas
        .where("proyectoId")
        .equals(proyectoId)
        .toArray();
      setEpicas(list as unknown as EpicaItem[]);
    };
    void fetchEpicas();
  }, [proyectoId]);

  useEffect(() => {
    const checkClientPayments = async () => {
      if (!clienteId) return;
      const contratos = await db.contratos
        .where("clienteId")
        .equals(clienteId)
        .toArray();
      if (contratos.length > 0) {
        const c = contratos[0];
        const sugText = `Preferencia anterior encontrada: Moneda ${
          c.moneda || "USD"
        } vía ${c.formaPago || "Transferencia"}`;
        setSugerenciaPlan(sugText);
        if (!initialFinanciero.moneda) setMoneda((c.moneda as string) || "USD");
        if (!initialFinanciero.formaPago) {
          setFormaPago((c.formaPago as string) || "Transferencia");
        }
      }
    };
    void checkClientPayments();
  }, [clienteId, initialFinanciero]);

  const handleSave = () => {
    onSave({
      precioTotal,
      moneda,
      formaPago,
      cantidadPagos,
      estadoPago,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <div className="mb-4 border-b border-[#2A2A2E] pb-3">
          <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            Información Financiera
          </h3>
          <p className="font-mono text-[10px] text-zinc-500">
            Registra el presupuesto y condiciones comerciales
          </p>
        </div>

        {sugerenciaPlan && (
          <div className="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/10 p-2.5 font-mono text-[9px] text-blue-400">
            ℹ️ {sugerenciaPlan}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <Input
            label="Precio Total del Proyecto"
            type="number"
            value={precioTotal}
            onChange={(e) => setPrecioTotal(Number(e.target.value))}
          />

          <Select
            label="Moneda"
            options={[
              { value: "USD", label: "Dólares Americanos (USD)" },
              { value: "ARS", label: "Pesos Argentinos (ARS)" },
              { value: "EUR", label: "Euros (EUR)" },
            ]}
            value={moneda}
            onChange={(val) => setMoneda(val)}
          />

          <Select
            label="Forma de pago"
            options={[
              { value: "Transferencia", label: "Transferencia Bancaria" },
              { value: "MercadoPago", label: "Mercado Pago" },
              { value: "Stripe", label: "Stripe / Tarjeta" },
              { value: "Efectivo", label: "Efectivo" },
            ]}
            value={formaPago}
            onChange={(val) => setFormaPago(val)}
          />

          <Input
            label="Cantidad de Pagos (Hitos)"
            type="number"
            value={cantidadPagos}
            onChange={(e) => setCantidadPagos(Number(e.target.value))}
          />

          <Select
            label="Estado del Pago"
            options={[
              { value: "Pendiente", label: "Pendiente de Facturación" },
              { value: "Parcial", label: "Cobrado Parcial" },
              { value: "Cobrado", label: "Totalmente Cobrado" },
              { value: "Cancelado", label: "Cancelado" },
            ]}
            value={estadoPago}
            onChange={(val) => setEstadoPago(val)}
          />

          <div className="mt-2 flex justify-end border-t border-[#2A2A2E] pt-4">
            <Button onClick={handleSave}>
              Guardar Configuración Financiera
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 border-b border-[#2A2A2E] pb-3">
          <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            Presupuesto Comercial
          </h3>
          <p className="font-mono text-[10px] text-zinc-500">
            Resumen comercial simplificado para clientes
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="font-mono text-xs font-bold text-zinc-300 uppercase">
              CONCEPTO / ÉPICA
            </span>
            <span className="font-mono text-xs font-bold text-zinc-300 uppercase">
              DISTRIBUCIÓN
            </span>
          </div>

          <div className="flex max-h-[160px] flex-col gap-2 overflow-y-auto pr-1">
            {epicas.length === 0 ? (
              <span className="py-4 font-mono text-[10px] text-zinc-500 italic">
                No hay épicas cargadas en el backlog para armar cotización.
              </span>
            ) : (
              epicas.map((ep, idx) => {
                const epPrice = Math.round(precioTotal / epicas.length);
                return (
                  <div
                    key={ep.id}
                    className="flex items-center justify-between font-mono text-[10px] text-zinc-400"
                  >
                    <span>
                      {idx + 1}. {ep.nombre}
                    </span>
                    <span>
                      {moneda} {epPrice.toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-zinc-800 pt-3 font-mono text-xs font-bold text-white">
            <span>TOTAL ESTIMADO</span>
            <span className="text-emerald-400">
              {moneda} {precioTotal.toLocaleString()}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
