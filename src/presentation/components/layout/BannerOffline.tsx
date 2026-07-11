"use client";

import React from "react";
import { useOffline } from "../../../offline/hooks/useOffline";
import { Icono } from "../icons";

export const BannerOffline: React.FC = () => {
  const { offline } = useOffline();
  const AlertIcon = Icono.Alert;

  if (!offline) return null;

  return (
    <div className="animate-in slide-in-from-top flex w-full items-center justify-center gap-2.5 border-b border-amber-500/20 bg-amber-500/10 px-6 py-2.5 text-amber-400 duration-200">
      <AlertIcon className="h-4 w-4 flex-shrink-0" />
      <span className="font-mono text-xs font-bold tracking-wide">
        Trabajando sin conexión. Los cambios se guardarán localmente y se
        sincronizarán al recuperar Internet.
      </span>
    </div>
  );
};
