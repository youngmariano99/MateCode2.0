import React from "react";
import { Icono } from "../icons";
import { Button } from "../button";

interface EmptyStateProps {
  titulo: string;
  descripcion: string;
  icono?: React.ReactNode;
  accion?: {
    texto: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  titulo,
  descripcion,
  icono,
  accion,
}) => {
  const AlertIcon = Icono.Alert;

  return (
    <div className="mx-auto my-6 flex max-w-sm flex-col items-center justify-center rounded-2xl border border-zinc-800/80 bg-zinc-900/10 p-8 text-center backdrop-blur-md">
      <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-3.5 text-zinc-500">
        {icono || <AlertIcon className="h-6 w-6" />}
      </div>
      <h3 className="text-base font-bold text-zinc-200">{titulo}</h3>
      <p className="mt-1.5 mb-5 text-xs leading-relaxed text-zinc-500">
        {descripcion}
      </p>
      {accion && (
        <Button
          onClick={accion.onClick}
          variant="outline"
          className="py-1.5 text-xs"
        >
          {accion.texto}
        </Button>
      )}
    </div>
  );
};

export const Spinner: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  ...props
}) => (
  <div
    className={`h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent ${className}`}
    {...props}
  />
);

interface LoadingOverlayProps {
  cargando: boolean;
  children: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  cargando,
  children,
}) => (
  <div className="relative h-full w-full">
    {children}
    {cargando && (
      <div className="animate-in fade-in absolute inset-0 z-40 flex items-center justify-center bg-[#09090B]/60 backdrop-blur-xs duration-200">
        <Spinner />
      </div>
    )}
  </div>
);
