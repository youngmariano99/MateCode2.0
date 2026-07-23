"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../providers/AuthProvider";
import { Icono } from "../icons";
import { SyncIndicator } from "./SyncIndicator";
import { BannerOffline } from "./BannerOffline";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const Breadcrumb: React.FC<{ items: BreadcrumbItem[] }> = ({
  items,
}) => {
  const ChevronRight = Icono.ChevronRight;
  return (
    <nav className="flex items-center gap-1.5 font-mono text-xs text-zinc-500">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
            {isLast || !item.href ? (
              <span className={isLast ? "font-bold text-zinc-300" : ""}>
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="transition-all hover:text-zinc-300"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export const Sidebar: React.FC<{
  colapsado: boolean;
  setColapsado: (val: boolean) => void;
}> = ({ colapsado, setColapsado }) => {
  const pathname = usePathname();
  const { cerrarSesion } = useAuth();

  const menuItems = [
    { label: "Inicio", href: "/dashboard", icono: Icono.Inicio },
    { label: "Clientes", href: "/dashboard/clientes", icono: Icono.Clientes },
    {
      label: "Proyectos",
      href: "/dashboard/proyectos",
      icono: Icono.Proyectos,
    },
    { label: "Pagos", href: "/dashboard/pagos", icono: Icono.Pagos },
    {
      label: "Contratos",
      href: "/dashboard/contratos",
      icono: Icono.Contratos,
    },
    {
      label: "Potenciales Clientes",
      href: "/dashboard/territorio",
      icono: Icono.MapPin,
    },
    {
      label: "Taller de Contacto",
      href: "/dashboard/taller-contacto",
      icono: Icono.Contactos,
    },
    { label: "IA", href: "/dashboard/ia", icono: Icono.IA },
    {
      label: "Configuración",
      href: "/dashboard/agencia",
      icono: Icono.Configuracion,
    },
  ];

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col justify-between border-r border-[#2A2A2E] bg-[#111113] transition-all duration-300 ${
        colapsado ? "w-16" : "w-64"
      } hidden md:flex`}
    >
      <div className="flex flex-col">
        <div
          className={`flex h-[65px] items-center justify-between border-b border-[#2A2A2E] p-5`}
        >
          {!colapsado && (
            <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-lg font-extrabold tracking-wider text-transparent">
              MateCode
            </span>
          )}
          <button
            onClick={() => setColapsado(!colapsado)}
            className="rounded-lg p-1 text-zinc-500 transition-all hover:bg-zinc-800 hover:text-zinc-300 focus:outline-none"
          >
            <Icono.Menu className="h-4 w-4" />
          </button>
        </div>

        <nav className="space-y-1.5 p-3.5">
          {menuItems.map((item) => {
            const ItemIcon = item.icono;
            const activo = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all select-none ${
                  activo
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-zinc-400 hover:bg-[#18181B] hover:text-zinc-200"
                }`}
              >
                <ItemIcon className="h-4.5 w-4.5 flex-shrink-0" />
                {!colapsado && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-[#2A2A2E] p-3.5">
        <button
          onClick={() => void cerrarSesion()}
          className="flex w-full items-center gap-3.5 rounded-xl px-3 py-2 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/5 hover:text-red-300 focus:outline-none"
        >
          <Icono.Logout className="h-4.5 w-4.5 flex-shrink-0" />
          {!colapsado && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
};

export const Header: React.FC<{
  onOpenMobile: () => void;
  breadcrumbs: BreadcrumbItem[];
}> = ({ onOpenMobile, breadcrumbs }) => {
  const { usuario, agenciaActiva, cerrarSesion } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-[65px] w-full items-center justify-between border-b border-[#2A2A2E] bg-zinc-900/10 px-6 py-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="rounded-lg p-1.5 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-200 focus:outline-none md:hidden"
        >
          <Icono.Menu className="h-5 w-5" />
        </button>
        <Breadcrumb items={breadcrumbs} />
      </div>

      <div className="flex items-center gap-4">
        {agenciaActiva && (
          <span className="hidden rounded border border-[#2A2A2E] bg-[#18181B] px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-400 sm:inline-flex">
            {agenciaActiva.nombreComercial}
          </span>
        )}

        <SyncIndicator />

        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2A2A2E] bg-zinc-800 text-xs font-bold text-zinc-300 transition-all select-none hover:border-zinc-700 focus:outline-none"
          >
            {usuario?.nombre?.substring(0, 2).toUpperCase() || "MC"}
          </button>

          {profileOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileOpen(false)}
              />

              <div className="animate-in fade-in absolute right-0 z-50 mt-2 w-56 rounded-xl border border-[#2A2A2E] bg-[#18181B] p-2.5 shadow-2xl duration-200">
                <div className="mb-1.5 border-b border-[#2A2A2E] px-3.5 py-2">
                  <span className="block truncate text-sm font-bold text-zinc-200">
                    {usuario?.nombre}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-zinc-500">
                    {usuario?.correo}
                  </span>
                  <span className="mt-2 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    {usuario?.rol}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    void cerrarSesion();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-red-400 transition-all hover:bg-red-500/5 hover:text-red-300 focus:outline-none"
                >
                  <Icono.Logout className="h-3.5 w-3.5" />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

interface MainLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  breadcrumbs = [],
}) => {
  const [colapsado, setColapsado] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    Promise.resolve().then(() => {
      setMobileOpen(false);
    });
  }, [pathname]);

  const menuItems = [
    { label: "Inicio", href: "/dashboard", icono: Icono.Inicio },
    { label: "Clientes", href: "/dashboard/clientes", icono: Icono.Clientes },
    {
      label: "Proyectos",
      href: "/dashboard/proyectos",
      icono: Icono.Proyectos,
    },
    { label: "Pagos", href: "/dashboard/pagos", icono: Icono.Pagos },
    {
      label: "Contratos",
      href: "/dashboard/contratos",
      icono: Icono.Contratos,
    },
    { label: "Territorio", href: "/dashboard/territorio", icono: Icono.MapPin },
    {
      label: "Taller de Contacto",
      href: "/dashboard/taller-contacto",
      icono: Icono.Contactos,
    },
    { label: "IA", href: "/dashboard/ia", icono: Icono.IA },
    {
      label: "Configuración",
      href: "/dashboard/agencia",
      icono: Icono.Configuracion,
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#09090B] text-zinc-100">
      <Sidebar colapsado={colapsado} setColapsado={setColapsado} />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm md:hidden">
          <div
            className="absolute inset-0"
            onClick={() => setMobileOpen(false)}
          />
          <div className="animate-in slide-in-from-left absolute top-0 bottom-0 left-0 z-10 flex w-64 flex-col justify-between border-r border-[#2A2A2E] bg-[#111113] duration-250">
            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-[#2A2A2E] p-5">
                <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-lg font-extrabold tracking-wider text-transparent">
                  MateCode
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-1 text-zinc-500 transition-all hover:bg-zinc-800 hover:text-zinc-300 focus:outline-none"
                >
                  <Icono.Close className="h-5 w-5" />
                </button>
              </div>
              <nav className="space-y-1.5 p-3.5">
                {menuItems.map((item) => {
                  const ItemIcon = item.icono;
                  const activo = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all select-none ${
                        activo
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "text-zinc-400 hover:bg-[#18181B] hover:text-zinc-200"
                      }`}
                    >
                      <ItemIcon className="h-4.5 w-4.5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      <div
        className={`flex flex-1 flex-col transition-all duration-300 ${
          colapsado ? "md:pl-16" : "md:pl-64"
        }`}
      >
        <BannerOffline />
        <Header
          onOpenMobile={() => setMobileOpen(true)}
          breadcrumbs={breadcrumbs}
        />
        <main className="mx-auto w-full max-w-7xl flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
