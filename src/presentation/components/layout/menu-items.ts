import { Icono, type IconType } from "../icons";

export type AreaMateCode = "profesional" | "personal";

export interface MenuItem {
  label: string;
  href: string;
  icono: IconType;
}

/**
 * Única fuente de verdad del menú — antes vivía duplicado (con un label
 * desalineado) entre el sidebar de escritorio y el drawer mobile en
 * MainLayout. Separado por área para el switcher Profesional/Personal.
 */
export const MENU_PROFESIONAL: MenuItem[] = [
  { label: "Inicio", href: "/dashboard", icono: Icono.Inicio },
  { label: "Clientes", href: "/dashboard/clientes", icono: Icono.Clientes },
  { label: "Proyectos", href: "/dashboard/proyectos", icono: Icono.Proyectos },
  { label: "Pagos", href: "/dashboard/pagos", icono: Icono.Pagos },
  { label: "Contratos", href: "/dashboard/contratos", icono: Icono.Contratos },
  {
    label: "Territorio",
    href: "/dashboard/territorio",
    icono: Icono.MapPin,
  },
  {
    label: "Planificador de Contenidos",
    href: "/dashboard/planificador-contenido",
    icono: Icono.Calendario,
  },
  {
    label: "Contacto en Frío",
    href: "/dashboard/contacto-frio",
    icono: Icono.Contactos,
  },
  { label: "IA", href: "/dashboard/ia", icono: Icono.IA },
  {
    label: "Configuración",
    href: "/dashboard/agencia",
    icono: Icono.Configuracion,
  },
];

export const MENU_PERSONAL: MenuItem[] = [
  { label: "Hoy", href: "/dashboard/personal/hoy", icono: Icono.Sunrise },
  {
    label: "Entrenamiento",
    href: "/dashboard/personal/entrenamiento",
    icono: Icono.Dumbbell,
  },
];

export const MENU_POR_AREA: Record<AreaMateCode, MenuItem[]> = {
  profesional: MENU_PROFESIONAL,
  personal: MENU_PERSONAL,
};
