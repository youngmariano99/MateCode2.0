"use client";

import React, { useState, useEffect } from "react";
import { MainLayout } from "../../presentation/components/layout";
import { StatCard, Card } from "../../presentation/components/card";
import { Button } from "../../presentation/components/button";
import { useAuth } from "../../presentation/providers/AuthProvider";
import { BuscadorGlobal } from "../../presentation/components/dashboard/BuscadorGlobal";
import { WidgetAgenda } from "../../presentation/components/dashboard/WidgetAgenda";
import { WidgetAcciones } from "../../presentation/components/dashboard/WidgetAcciones";
import { WidgetMonitoreo } from "../../presentation/components/dashboard/WidgetMonitoreo";
import {
  ObtenerDashboardUseCase,
  DashboardData,
} from "../../application/use-cases/dashboard/ObtenerDashboardUseCase";
import { db } from "../../offline/dexie/db";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function DashboardPage() {
  const { usuario, agenciaActiva } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [cargando, setCargando] = useState(true);

  const logs =
    useLiveQuery(() =>
      db.logs_sincronizacion.orderBy("id").reverse().limit(5).toArray()
    ) || [];

  useEffect(() => {
    const fetchDashboard = async () => {
      const useCase = new ObtenerDashboardUseCase();
      const res = await useCase.ejecutar();
      if (res.ok) {
        setData(res.valor);
      }
      setCargando(false);
    };
    void fetchDashboard();
  }, []);

  if (cargando || !data) {
    return (
      <MainLayout>
        <div className="flex animate-pulse flex-col gap-6">
          <div className="h-10 w-1/3 rounded-xl bg-zinc-900" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="h-28 rounded-2xl bg-zinc-900" />
            <div className="h-28 rounded-2xl bg-zinc-900" />
            <div className="h-28 rounded-2xl bg-zinc-900" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              ¡Buen día, {usuario?.nombre || "Mariano"}!
            </h1>
            <p className="mt-1 font-mono text-xs tracking-wide text-zinc-400 uppercase">
              Workspace activo:{" "}
              {agenciaActiva?.nombreComercial || "MateCode HQ"}
            </p>
          </div>
          <BuscadorGlobal />
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                titulo="Clientes Activos"
                valor={data.kpis.clientesActivos}
              />
              <StatCard titulo="Proyectos" valor={data.kpis.proyectos} />
              <StatCard
                titulo="Pagos Pendientes"
                valor={data.kpis.pagosPendientes}
              />
            </div>

            <WidgetAgenda items={data.agenda} />

            <Card>
              <div className="mb-4 border-b border-[#2A2A2E] pb-4">
                <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-100 uppercase">
                  Próximos Cobros y Vencimientos
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-[#2A2A2E] text-zinc-500">
                      <th className="px-3 py-2.5 whitespace-nowrap">Cliente</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">Monto</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">
                        Vencimiento
                      </th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.proximosPagos.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-[#2A2A2E]/50 transition-all last:border-0 hover:bg-[#18181B]"
                      >
                        <td className="px-3 py-3 font-bold whitespace-nowrap text-zinc-300">
                          {p.cliente}
                        </td>
                        <td className="px-3 py-3 font-bold whitespace-nowrap text-emerald-400">
                          ${p.monto.toLocaleString("es-AR")}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-zinc-400">
                          {p.fecha}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <Button
                            className="shrink-0 whitespace-nowrap"
                            onClick={() =>
                              alert(`Cobro registrado para ${p.cliente}`)
                            }
                          >
                            Registrar cobro
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <WidgetAcciones />

            <WidgetMonitoreo />

            <Card>
              <div className="mb-4 border-b border-[#2A2A2E] pb-4">
                <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-100 uppercase">
                  Auditoría Reciente
                </h3>
              </div>
              <div className="flex max-h-60 flex-col gap-3 overflow-y-auto pr-2">
                {logs.length === 0 ? (
                  <span className="py-4 text-center font-mono text-xs text-zinc-500 italic">
                    Sin eventos auditados
                  </span>
                ) : (
                  logs.map((l) => (
                    <div
                      key={l.id}
                      className="flex flex-col border-b border-[#2A2A2E]/40 pb-2 last:border-0"
                    >
                      <span className="min-w-0 text-xs font-bold break-words text-zinc-300">
                        {l.mensaje}
                      </span>
                      <span className="mt-0.5 font-mono text-[9px] text-zinc-500">
                        {format(l.fecha, "dd/MM HH:mm:ss", { locale: es })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
