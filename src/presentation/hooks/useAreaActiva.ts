"use client";

import { useState } from "react";
import type { AreaMateCode } from "../components/layout/menu-items";

const CLAVE_AREA_ACTIVA = "matecode:area-activa";

function leerAreaGuardada(): AreaMateCode {
  if (typeof window === "undefined") return "profesional";
  try {
    const guardada = window.localStorage.getItem(CLAVE_AREA_ACTIVA);
    return guardada === "personal" || guardada === "profesional"
      ? guardada
      : "profesional";
  } catch {
    return "profesional";
  }
}

/**
 * Preferencia del switcher Profesional/Personal — por dispositivo, no por
 * usuario (localStorage, no Dexie/sync): es una comodidad de navegación,
 * no un dato de negocio que tenga que viajar entre dispositivos. Se lee con
 * el inicializador perezoso de useState (no un efecto) para no pisar la
 * regla de "no setState sincrónico dentro de un efecto".
 */
export function useAreaActiva(): [AreaMateCode, (area: AreaMateCode) => void] {
  const [area, setAreaState] = useState<AreaMateCode>(leerAreaGuardada);

  const setArea = (nueva: AreaMateCode) => {
    setAreaState(nueva);
    try {
      window.localStorage.setItem(CLAVE_AREA_ACTIVA, nueva);
    } catch {
      // No crítico si no persiste — el switcher simplemente vuelve al
      // default la próxima vez.
    }
  };

  return [area, setArea];
}
