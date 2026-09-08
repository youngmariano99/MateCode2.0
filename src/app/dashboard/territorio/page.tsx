"use client";

import React, { useMemo, useState } from "react";
import { MainLayout } from "../../../presentation/components/layout";
import { Button } from "../../../presentation/components/button";
import { useToast } from "../../../presentation/hooks/useToast";
import { db } from "../../../offline/dexie/db";
import { useLiveQuery } from "dexie-react-hooks";
import { VisorMapa } from "../../../presentation/components/territorio/visor-mapa";
import { PlanificadorDiario } from "../../../presentation/components/territorio/planificador-diario";
import {
  ModalPotencialCliente,
  PotencialCliente,
} from "../../../presentation/components/territorio/ModalPotencialCliente";
import {
  ModalImportarPotenciales,
  ItemImportadoPotencial,
} from "../../../presentation/components/territorio/ModalImportarPotenciales";
import { ModalRegistrarVisitaProspecto } from "../../../presentation/components/territorio/ModalRegistrarVisitaProspecto";
import { ModalCliente } from "../../../presentation/components/crm/ModalCliente";
import { TerritorioKpis } from "../../../presentation/components/territorio/territorio-kpis";
import { TerritorioFiltros } from "../../../presentation/components/territorio/territorio-filtros";
import { TerritorioTabla } from "../../../presentation/components/territorio/territorio-tabla";
import { GestionarContactoFrioUseCase } from "../../../application/use-cases/crm/gestionar-contacto-frio.use-case";

const useCase = new GestionarContactoFrioUseCase();
const SIN_POTENCIALES: never[] = [];
const SIN_FICHAS_FISICAS: never[] = [];

/**
 * Prospección física (mapa/ruteo). La prospección digital vive aparte, en
 * Contacto en Frío — acá solo se agrega la dirección de un prospecto cuando
 * corresponde visitarlo en persona, sin duplicar el resto de sus datos.
 */
export default function TerritorioPage() {
  const { mostrarToast } = useToast();

  const [modalManualAbierto, setModalManualAbierto] = useState(false);
  const [modalImportarAbierto, setModalImportarAbierto] = useState(false);
  const [modalVisitaAbierto, setModalVisitaAbierto] = useState(false);
  const [modalCrmAbierto, setModalCrmAbierto] = useState(false);

  const [prospectoEdicion, setProspectoEdicion] =
    useState<PotencialCliente | null>(null);
  const [prospectoVisita, setProspectoVisita] =
    useState<PotencialCliente | null>(null);
  const [prospectoAConvertir, setProspectoAConvertir] =
    useState<PotencialCliente | null>(null);

  const [rutaPuntos, setRutaPuntos] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [rutaGeometria, setRutaGeometria] = useState<
    [number, number][] | undefined
  >(undefined);

  const [ocultarCerrados, setOcultarCerrados] = useState(true);
  const [filtroVisita, setFiltroVisita] = useState<
    "todos" | "visitados" | "no_visitados"
  >("todos");
  const [filtroRubro, setFiltroRubro] = useState<string>("todos");
  const [filtroOrden, setFiltroOrden] = useState<
    "recientes" | "antiguos" | "prioridad"
  >("prioridad");
  const [paginaActual, setPaginaActual] = useState(1);

  const potenciales =
    useLiveQuery(() => db.potencial_cliente.toArray()) || SIN_POTENCIALES;
  const fichasFisicas =
    useLiveQuery(() => db.ficha_fisica.toArray()) || SIN_FICHAS_FISICAS;

  // Vista física: núcleo del prospecto + su ficha física, si la tiene.
  const prospectos: PotencialCliente[] = useMemo(
    () =>
      potenciales.map((p) => {
        const f = fichasFisicas.find((x) => x.potencialClienteId === p.id);
        return {
          id: p.id,
          nombre: p.nombre,
          rubro: p.rubro,
          prioridad: p.prioridad,
          direccion: [
            f?.direccionCalle,
            f?.direccionCiudad,
            f?.direccionProvincia,
          ]
            .filter(Boolean)
            .join(", "),
          direccionCalle: f?.direccionCalle,
          direccionCiudad: f?.direccionCiudad,
          direccionProvincia: f?.direccionProvincia,
          visitado: f?.visitado || false,
          visitasCount: f?.visitado ? 1 : 0,
          motivoNoVisita: f?.motivoNoVisita,
          volverFecha: f?.volverFecha
            ? new Date(f.volverFecha).toISOString().slice(0, 10)
            : undefined,
          convertido: p.estado === "Cliente Cerrado",
          latitud: f?.latitud,
          longitud: f?.longitud,
          creadoEn: p.creadoEn,
          actualizadoEn: p.actualizadoEn,
        };
      }),
    [potenciales, fichasFisicas]
  );

  const rubrosDisponibles = Array.from(
    new Set(prospectos.map((p) => p.rubro || "General").filter(Boolean))
  );

  const prospectosFiltrados = prospectos
    .filter((p) => {
      if (ocultarCerrados && p.convertido) return false;
      if (filtroVisita === "visitados" && !p.visitado) return false;
      if (filtroVisita === "no_visitados" && p.visitado) return false;
      if (filtroRubro !== "todos" && (p.rubro || "General") !== filtroRubro)
        return false;
      return true;
    })
    .sort((a, b) => {
      if (filtroOrden === "prioridad") {
        const rank = (p: PotencialCliente) =>
          p.prioridad === "Alta" ? 3 : p.prioridad === "Baja" ? 1 : 2;
        return rank(b) - rank(a);
      }
      if (filtroOrden === "recientes")
        return (b.creadoEn || 0) - (a.creadoEn || 0);
      return (a.creadoEn || 0) - (b.creadoEn || 0);
    });

  const elementosPorPagina = 10;
  const totalPaginas =
    Math.ceil(prospectosFiltrados.length / elementosPorPagina) || 1;
  const currentPage = Math.min(paginaActual, totalPaginas);
  const prospectosPaginados = prospectosFiltrados.slice(
    (currentPage - 1) * elementosPorPagina,
    currentPage * elementosPorPagina
  );

  const totalProspectos = prospectos.length;
  const prospectosActivos = prospectos.filter((p) => !p.convertido).length;
  const visitadosProspectos = prospectos.filter((p) => p.visitado).length;

  const handleCrearOEditarProspecto = async (
    payload: Partial<PotencialCliente>
  ) => {
    try {
      const direccionCalle = payload.direccionCalle?.trim();
      if (prospectoEdicion) {
        await useCase.actualizarDatosBasicos(prospectoEdicion.id, {
          nombre: payload.nombre,
          rubro: payload.rubro,
          prioridad: payload.prioridad,
        });
        if (direccionCalle) {
          await useCase.agregarFichaFisica(prospectoEdicion.id, {
            direccionCalle,
            direccionCiudad: payload.direccionCiudad,
            direccionProvincia: payload.direccionProvincia,
            latitud: payload.latitud,
            longitud: payload.longitud,
          });
        }
        mostrarToast("Prospecto actualizado con éxito.", "exito");
      } else {
        const res = await useCase.crearProspecto({
          nombre: payload.nombre || "Prospecto Sin Nombre",
          rubro: payload.rubro,
          prioridad: payload.prioridad || "Media",
        });
        if (res.ok && direccionCalle) {
          await useCase.agregarFichaFisica(res.valor, {
            direccionCalle,
            direccionCiudad: payload.direccionCiudad,
            direccionProvincia: payload.direccionProvincia,
            latitud: payload.latitud,
            longitud: payload.longitud,
          });
        }
        mostrarToast("Prospecto registrado con éxito.", "exito");
      }
      setModalManualAbierto(false);
      setProspectoEdicion(null);
    } catch {
      mostrarToast("Ocurrió un error al guardar el prospecto.", "error");
    }
  };

  const handleImportarLote = async (lote: ItemImportadoPotencial[]) => {
    try {
      for (const p of lote) {
        const res = await useCase.crearProspecto({
          nombre: p.nombre || "Prospecto Sin Nombre",
          rubro: p.rubro,
          prioridad: p.prioridad || "Media",
        });
        if (!res.ok) continue;
        if (p.direccionCalle?.trim()) {
          await useCase.agregarFichaFisica(res.valor, {
            direccionCalle: p.direccionCalle,
            direccionCiudad: p.direccionCiudad,
            direccionProvincia: p.direccionProvincia,
            latitud: p.latitud,
            longitud: p.longitud,
          });
        }
        if (p.whatsapp || p.email || p.instagram || p.facebook) {
          await useCase.calificarFichaDigital(res.valor, {
            instagram: p.instagram,
            whatsapp: p.whatsapp,
            email: p.email,
            facebook: p.facebook,
            dolorTags: [],
            tieneWeb: "no",
            usaCatalogoNativoWhatsapp: false,
          });
        }
      }
      mostrarToast(
        `Se importaron ${lote.length} prospectos correctamente.`,
        "exito"
      );
      setModalImportarAbierto(false);
    } catch {
      mostrarToast("Error al importar prospectos en lote.", "error");
    }
  };

  const handleRegistrarVisita = async (resultado: {
    visitado: boolean;
    motivoNoVisita?: string;
    volverFecha?: string;
  }) => {
    if (!prospectoVisita) return;
    const res = await useCase.registrarVisitaFisica(prospectoVisita.id, {
      visitado: resultado.visitado,
      motivoNoVisita: resultado.motivoNoVisita,
      volverFecha: resultado.volverFecha
        ? new Date(resultado.volverFecha).getTime()
        : undefined,
    });
    if (res.ok) {
      mostrarToast("Visita registrada con éxito.", "exito");
      setModalVisitaAbierto(false);
      setProspectoVisita(null);
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  const handleConfirmarConversionCrm = async (
    crmPayload: Record<string, unknown>
  ) => {
    if (!prospectoAConvertir) return;
    try {
      const clienteId = `cli_${Date.now()}`;
      await db.clientes.add({
        id: clienteId,
        ...crmPayload,
        latitud: prospectoAConvertir.latitud,
        longitud: prospectoAConvertir.longitud,
        creadoEn: Date.now(),
      });
      await useCase.marcarClienteCerrado(prospectoAConvertir.id);
      mostrarToast(
        "¡Felicidades! Prospecto convertido con éxito a Cliente CRM.",
        "exito"
      );
      setModalCrmAbierto(false);
      setProspectoAConvertir(null);
    } catch {
      mostrarToast("Error al convertir el prospecto.", "error");
    }
  };

  const eliminarProspecto = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este prospecto?"))
      return;
    const res = await useCase.eliminarProspecto(id);
    if (res.ok) {
      mostrarToast("Prospecto eliminado.", "info");
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Potenciales Clientes" },
  ];

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#2A2A2E] pb-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Prospección Física (Mapa y Ruteo)
            </h1>
            <p className="mt-1 font-mono text-sm text-zinc-400">
              Para cuando la visita es en persona. La prospección digital vive
              en Contacto en Frío.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setProspectoEdicion(null);
                setModalManualAbierto(true);
              }}
              className="animate-in fade-in rounded-xl bg-emerald-500 px-4 py-2.5 font-mono text-xs font-bold text-zinc-950 transition-all select-none hover:bg-emerald-600 active:scale-95"
            >
              Nuevo Prospecto
            </button>
            <Button onClick={() => setModalImportarAbierto(true)}>
              Importar JSON
            </Button>
          </div>
        </div>

        <TerritorioKpis
          totalProspectos={totalProspectos}
          prospectosActivos={prospectosActivos}
          visitadosProspectos={visitadosProspectos}
        />

        <div className="animate-in fade-in flex flex-col gap-6 duration-200">
          <VisorMapa
            clientes={prospectosFiltrados}
            rutaPuntos={rutaPuntos}
            rutaGeometria={rutaGeometria}
          />
          <PlanificadorDiario
            clientes={prospectosFiltrados.filter(
              (p) => p.latitud && p.longitud
            )}
            onRutaCalculada={(puntos, geometria) => {
              setRutaPuntos(puntos);
              setRutaGeometria(geometria);
            }}
            onRegistrarVisitaClick={(c) => {
              const matched = prospectos.find((p) => p.id === c.id);
              if (matched) {
                setProspectoVisita(matched);
                setModalVisitaAbierto(true);
              }
            }}
          />
        </div>

        <TerritorioFiltros
          ocultarCerrados={ocultarCerrados}
          onOcultarCerradosChange={setOcultarCerrados}
          filtroVisita={filtroVisita}
          onFiltroVisitaChange={(v) => {
            setFiltroVisita(v);
            setPaginaActual(1);
          }}
          filtroRubro={filtroRubro}
          onFiltroRubroChange={(v) => {
            setFiltroRubro(v);
            setPaginaActual(1);
          }}
          rubrosDisponibles={rubrosDisponibles}
          filtroOrden={filtroOrden}
          onFiltroOrdenChange={(v) => {
            setFiltroOrden(v);
            setPaginaActual(1);
          }}
          totalFiltrados={prospectosFiltrados.length}
          totalGeneral={prospectos.length}
        />

        <TerritorioTabla
          prospectos={prospectosPaginados}
          totalFiltrados={prospectosFiltrados.length}
          currentPage={currentPage}
          totalPaginas={totalPaginas}
          onPaginaAnterior={() => setPaginaActual((p) => Math.max(p - 1, 1))}
          onPaginaSiguiente={() =>
            setPaginaActual((p) => Math.min(p + 1, totalPaginas))
          }
          onVisitaCampo={(p) => {
            setProspectoVisita(p);
            setModalVisitaAbierto(true);
          }}
          onPasarACrm={(p) => {
            setProspectoAConvertir(p);
            setModalCrmAbierto(true);
          }}
          onEditar={(p) => {
            setProspectoEdicion(p);
            setModalManualAbierto(true);
          }}
          onEliminar={eliminarProspecto}
        />

        <ModalPotencialCliente
          abierto={modalManualAbierto}
          prospectoEdicion={prospectoEdicion}
          onCerrar={() => {
            setModalManualAbierto(false);
            setProspectoEdicion(null);
          }}
          onConfirmar={handleCrearOEditarProspecto}
        />

        <ModalImportarPotenciales
          abierto={modalImportarAbierto}
          onCerrar={() => setModalImportarAbierto(false)}
          onConfirmarImportacion={handleImportarLote}
        />

        {prospectoVisita && (
          <ModalRegistrarVisitaProspecto
            key={prospectoVisita.id}
            abierto={modalVisitaAbierto}
            onCerrar={() => {
              setModalVisitaAbierto(false);
              setProspectoVisita(null);
            }}
            nombreProspecto={prospectoVisita.nombre}
            onConfirmar={handleRegistrarVisita}
          />
        )}

        {prospectoAConvertir && (
          <ModalCliente
            abierto={modalCrmAbierto}
            clienteEdicion={{
              id: "",
              nombre: prospectoAConvertir.nombre,
              correo: "",
              direccion: prospectoAConvertir.direccion || "",
              direccionCalle: prospectoAConvertir.direccionCalle || "",
              direccionCiudad: prospectoAConvertir.direccionCiudad || "",
              direccionProvincia: prospectoAConvertir.direccionProvincia || "",
              estado: "Lead",
              observaciones: `Convertido de Prospección Física. Rubro: ${prospectoAConvertir.rubro || "General"}.`,
            }}
            onCerrar={() => {
              setModalCrmAbierto(false);
              setProspectoAConvertir(null);
            }}
            onConfirmar={handleConfirmarConversionCrm}
            estados={["Lead", "Negociación", "Cliente Activo", "Archivado"]}
            origenes={["Prospección Campo", "Recomendado", "Búsqueda Web"]}
            responsables={[
              "Sin Asignar",
              "Ejecutivo de Cuentas",
              "Agencia General",
            ]}
          />
        )}
      </div>
    </MainLayout>
  );
}
