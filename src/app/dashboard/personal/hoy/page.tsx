"use client";

import React, { useEffect } from "react";
import { MainLayout } from "../../../../presentation/components/layout";
import { CapturaInbox } from "../../../../presentation/components/personal/captura-inbox";
import { BunkerDelDia } from "../../../../presentation/components/personal/bunker-del-dia";
import { PanelPendientes } from "../../../../presentation/components/personal/panel-pendientes";
import { PanelRetorno } from "../../../../presentation/components/personal/panel-retorno";
import { TarjetaHabitos } from "../../../../presentation/components/personal/tarjeta-habitos";
import { GestionarObjetivosUseCase } from "../../../../application/use-cases/personal/gestionar-objetivos.use-case";
import { obtenerDiaTareaHoy } from "../../../../domain/entidades/personal.entity";

const objetivosUseCase = new GestionarObjetivosUseCase();

const breadcrumbs = [
  { label: "Personal", href: "/dashboard/personal/hoy" },
  { label: "Hoy" },
];

/**
 * "Hoy": la puerta de entrada del área Personal — bandeja de entrada arriba
 * (captura sin fricción), Búnker del Enfoque y Pendientes abajo, todo en una
 * sola pantalla para no tener que navegar entre secciones para saber en qué
 * estás parado.
 */
export default function PersonalHoyPage() {
  // Se corre una vez al entrar (no en segundo plano): marca vencidos los
  // objetivos que ya pasaron su fecha límite, para que el panel de retorno
  // los muestre de una sin que el usuario tenga que ir a buscarlos.
  useEffect(() => {
    void objetivosUseCase.marcarVencidosSiCorresponde(obtenerDiaTareaHoy());
  }, []);

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Hoy
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Anotá lo que se te ocurra, resolvé tu día con lo justo, y tené a
            mano lo que no entra hoy pero no podés perder de vista.
          </p>
        </div>

        <PanelRetorno />

        <TarjetaHabitos />

        <CapturaInbox />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BunkerDelDia />
          <PanelPendientes />
        </div>
      </div>
    </MainLayout>
  );
}
