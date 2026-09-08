import React from "react";
import type { PotencialCliente } from "./ModalPotencialCliente";

/** Links directos para abrir el perfil/chat del prospecto con un click. */
function enlacesRedes(p: PotencialCliente): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = [];
  if (p.instagram) {
    const usuario = p.instagram.replace(/^@/, "");
    links.push({
      label: "IG",
      href: usuario.startsWith("http")
        ? usuario
        : `https://instagram.com/${usuario}`,
    });
  }
  if (p.whatsapp) {
    links.push({
      label: "WA",
      href: `https://wa.me/${p.whatsapp.replace(/[^0-9]/g, "")}`,
    });
  }
  if (p.facebook) {
    links.push({
      label: "FB",
      href: p.facebook.startsWith("http")
        ? p.facebook
        : `https://facebook.com/${p.facebook}`,
    });
  }
  if (p.email) {
    links.push({ label: "Mail", href: `mailto:${p.email}` });
  }
  return links;
}

interface TerritorioTablaProps {
  prospectos: PotencialCliente[];
  totalFiltrados: number;
  currentPage: number;
  totalPaginas: number;
  onPaginaAnterior: () => void;
  onPaginaSiguiente: () => void;
  onVisitaCampo: (p: PotencialCliente) => void;
  onPasarACrm: (p: PotencialCliente) => void;
  onEditar: (p: PotencialCliente) => void;
  onEliminar: (id: string) => void;
}

/** Tabla de prospectos físicos paginada, con las acciones de campo. */
export const TerritorioTabla: React.FC<TerritorioTablaProps> = ({
  prospectos,
  totalFiltrados,
  currentPage,
  totalPaginas,
  onPaginaAnterior,
  onPaginaSiguiente,
  onVisitaCampo,
  onPasarACrm,
  onEditar,
  onEliminar,
}) => (
  <div className="flex flex-col gap-3">
    {totalPaginas > 1 && (
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onPaginaAnterior}
          disabled={currentPage === 1}
          className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-[9px] font-bold text-zinc-300 uppercase disabled:opacity-40"
        >
          Anterior
        </button>
        <span className="font-mono text-[10px] text-zinc-400">
          Página <b>{currentPage}</b> de <b>{totalPaginas}</b>
        </span>
        <button
          onClick={onPaginaSiguiente}
          disabled={currentPage === totalPaginas}
          className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-[9px] font-bold text-zinc-300 uppercase disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    )}

    <div className="w-full overflow-x-auto rounded-xl border border-[#2A2A2E] bg-zinc-950">
      <table className="w-full border-collapse text-left font-sans text-xs">
        <thead>
          <tr className="border-b border-[#2A2A2E] bg-zinc-900/50 font-mono text-[9px] font-bold text-zinc-400 uppercase">
            <th className="p-3 pl-4">Prospecto</th>
            <th className="p-3">Dirección</th>
            <th className="p-3">Historial / Visitas</th>
            <th className="p-3 pr-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2A2A2E]/50">
          {prospectos.map((p) => (
            <tr
              key={p.id}
              className={`group hover:bg-zinc-900/20 ${p.convertido ? "opacity-60" : ""}`}
            >
              <td className="p-3 pl-4 align-top">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-zinc-100 group-hover:text-emerald-400">
                      {p.nombre}
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                        p.prioridad === "Alta"
                          ? "border border-red-500/20 bg-red-500/10 text-red-400"
                          : p.prioridad === "Baja"
                            ? "border border-zinc-800 bg-zinc-900 text-zinc-500"
                            : "border border-amber-500/20 bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {p.prioridad || "Media"}
                    </span>
                    <span className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[8px] font-bold text-zinc-400 uppercase">
                      {p.rubro || "General"}
                    </span>
                  </div>
                  {p.convertido ? (
                    <span className="w-fit rounded border border-zinc-800 bg-gray-500/10 px-1.5 py-0.5 font-mono text-[8px] font-bold text-zinc-400 uppercase">
                      CRM
                    </span>
                  ) : p.visitado ? (
                    <span className="w-fit rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[8px] font-bold text-amber-400 uppercase">
                      Visitado
                    </span>
                  ) : (
                    <span className="w-fit rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[8px] font-bold text-emerald-400 uppercase">
                      Activo
                    </span>
                  )}
                  {enlacesRedes(p).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {enlacesRedes(p).map((link) => (
                        <a
                          key={link.label}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[8px] font-bold text-sky-400 hover:bg-sky-500 hover:text-black"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </td>
              <td className="max-w-[220px] p-3 align-top">
                <div className="line-clamp-2 font-mono text-[11px] text-zinc-400">
                  {p.direccion || "Sin dirección — agregala si vas a visitarlo"}
                </div>
              </td>
              <td className="p-3 align-top">
                <div className="flex flex-col gap-1 font-mono text-[10px] text-zinc-400">
                  {p.motivoNoVisita && (
                    <span className="text-[9px] text-red-400">
                      Salteado: {p.motivoNoVisita}
                    </span>
                  )}
                  {p.volverFecha && (
                    <span className="text-[9px] font-bold text-blue-400">
                      Volver: {p.volverFecha}
                    </span>
                  )}
                </div>
              </td>
              <td className="p-3 pr-4 text-right align-top">
                <div className="flex items-center justify-end gap-1.5">
                  {!p.convertido && (
                    <>
                      {p.direccionCalle && (
                        <button
                          onClick={() => onVisitaCampo(p)}
                          className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 font-mono text-[9px] font-bold text-amber-400 hover:bg-amber-500 hover:text-black"
                        >
                          Visita Campo
                        </button>
                      )}
                      <button
                        onClick={() => onPasarACrm(p)}
                        className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-1 font-mono text-[9px] font-bold text-blue-400 hover:bg-blue-500 hover:text-black"
                      >
                        Pasar a CRM
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onEditar(p)}
                    className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[9px] text-zinc-300 hover:border-zinc-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onEliminar(p.id)}
                    className="rounded border border-red-900/30 bg-red-950/20 px-2 py-1 font-mono text-[9px] text-red-400 hover:bg-red-900 hover:text-white"
                  >
                    Borrar
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {totalFiltrados === 0 && (
            <tr>
              <td
                colSpan={4}
                className="p-12 text-center font-mono text-xs text-zinc-500 italic"
              >
                Ningún potencial cliente coincide con los filtros activos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);
