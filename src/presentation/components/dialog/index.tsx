import React, { useEffect } from "react";
import { Icono } from "../icons";

interface DialogProps {
  abierto: boolean;
  onClose: () => void;
  titulo?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export const Dialog: React.FC<DialogProps> = ({
  abierto,
  onClose,
  titulo,
  children,
  footer,
  maxWidth = "md",
}) => {
  const Close = Icono.Close;

  useEffect(() => {
    if (abierto) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [abierto]);

  if (!abierto) return null;

  const maxWClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className={`relative w-full ${
          maxWClass[maxWidth]
        } animate-in fade-in zoom-in-95 z-10 overflow-hidden rounded-3xl border border-[#2A2A2E] bg-[#18181B] shadow-2xl duration-200`}
      >
        <div className="flex items-center justify-between border-b border-[#2A2A2E] bg-[#111113]/30 px-6 py-5">
          {titulo ? (
            <h3 className="text-lg font-bold text-zinc-100">{titulo}</h3>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 transition-all hover:text-zinc-300 focus:outline-none"
          >
            <Close className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-[#2A2A2E] bg-[#111113]/30 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

interface DrawerProps {
  abierto: boolean;
  onClose: () => void;
  titulo?: string;
  children: React.ReactNode;
  posicion?: "left" | "right";
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  abierto,
  onClose,
  titulo,
  children,
  posicion = "right",
  footer,
}) => {
  const Close = Icono.Close;

  useEffect(() => {
    if (abierto) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [abierto]);

  if (!abierto) return null;

  const posClass = posicion === "left" ? "left-0 border-r" : "right-0 border-l";

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className={`absolute top-0 bottom-0 z-10 flex w-full max-w-md flex-col justify-between border-[#2A2A2E] bg-[#18181B] shadow-2xl ${posClass}`}
      >
        <div className="flex items-center justify-between border-b border-[#2A2A2E] bg-[#111113]/30 px-6 py-5">
          {titulo ? (
            <h3 className="text-lg font-bold text-zinc-100">{titulo}</h3>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 transition-all hover:text-zinc-300 focus:outline-none"
          >
            <Close className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-[#2A2A2E] bg-[#111113]/30 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
