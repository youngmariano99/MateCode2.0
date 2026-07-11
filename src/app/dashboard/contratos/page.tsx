"use client";

import React, { useState, useEffect } from "react";
import { MainLayout } from "../../../presentation/components/layout";
import { Card } from "../../../presentation/components/card";
import { Button } from "../../../presentation/components/button";
import { useToast } from "../../../presentation/hooks/useToast";
import { Icono } from "../../../presentation/components/icons";
import { db } from "../../../offline/dexie/db";
import { useLiveQuery } from "dexie-react-hooks";
import { CrearDocumentoUseCase } from "../../../application/use-cases/documento/crear-documento.use-case";

// Subcomponents
import { EditorDocumento } from "../../../presentation/components/documentos/editor-documento";
import { SelectorPlantilla } from "../../../presentation/components/documentos/selector-plantilla";
import { ModalDocumento } from "../../../presentation/components/documentos/modal-documento";

interface VersionDocumento {
  version: number;
  fecha: number;
  autor: string;
  contenido: string;
  comentario: string;
}

interface DocumentoCRM {
  id: string;
  titulo: string;
  tipo: string;
  clienteId: string;
  proyectoId?: string;
  monto?: string;
  formaPago?: string;
  contenido: string;
  versiones: VersionDocumento[];
}

const TIPOS_DOCS = [
  "Contrato",
  "Presupuesto",
  "Propuesta Comercial",
  "NDA",
  "Acta",
  "Factura",
  "Libre",
];

export default function ContratosPage() {
  const { mostrarToast } = useToast();
  const crearUC = new CrearDocumentoUseCase();

  const [documentoSeleccionado, setDocumentoSeleccionado] =
    useState<DocumentoCRM | null>(null);
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<{
    titulo: string;
    contenido: string;
  } | null>(null);

  const rawDocumentos = useLiveQuery(() => db.documentos.toArray()) || [];
  const documentos = rawDocumentos as unknown as DocumentoCRM[];

  const rawClientes = useLiveQuery(() => db.clientes.toArray()) || [];
  const clientes = rawClientes.map((c) => ({
    id: c.id as string,
    nombre: c.nombre as string,
    empresa: c.empresa as string,
    cuit: c.cuit as string,
  }));

  const rawProyectos = useLiveQuery(() => db.proyectos.toArray()) || [];
  const proyectos = rawProyectos.map((p) => ({
    id: p.id as string,
    nombre: p.nombre as string,
  }));

  useEffect(() => {
    if (documentoSeleccionado) {
      const refresh = async () => {
        const updated = await db.documentos.get(documentoSeleccionado.id);
        if (updated) {
          Promise.resolve().then(() =>
            setDocumentoSeleccionado(updated as unknown as DocumentoCRM)
          );
        }
      };
      void refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawDocumentos, documentoSeleccionado?.id]);

  const handleCrearDocumento = (payload: Partial<DocumentoCRM>) => {
    if (!payload.titulo?.trim()) {
      mostrarToast("El título del documento es obligatorio.", "error");
      return;
    }

    const defaultContenido = plantillaSeleccionada
      ? plantillaSeleccionada.contenido
      : `# ${payload.titulo}\n\nEscribe el contenido de tu documento libre aquí...`;

    const doc = {
      ...payload,
      contenido: defaultContenido,
    };

    void crearUC.ejecutar(doc as Record<string, unknown>).then((res) => {
      if (res.ok) {
        mostrarToast("Documento creado con éxito.", "exito");
        setModalCrearAbierto(false);
        setPlantillaSeleccionada(null);
      }
    });
  };

  const eliminarDocumento = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("¿Estás seguro de eliminar este documento inteligente?")) {
      await db.documentos.delete(id);
      mostrarToast("Documento eliminado correctamente.", "exito");
    }
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Contratos & Documentos" },
  ];

  if (documentoSeleccionado) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <EditorDocumento
          documento={documentoSeleccionado}
          onVolver={() => setDocumentoSeleccionado(null)}
          onGuardado={() => {}}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Contratos y Documentos Inteligentes
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Motor de plantillas, reemplazo de variables dinámicas y versionado
              offline.
            </p>
          </div>
          <Button
            onClick={() => {
              if (clientes.length === 0) {
                mostrarToast(
                  "Registra al menos un cliente en el CRM antes de generar documentos.",
                  "error"
                );
                return;
              }
              setPlantillaSeleccionada(null);
              setModalCrearAbierto(true);
            }}
            icono={<Icono.Plus className="h-4 w-4" />}
          >
            Nuevo Documento
          </Button>
        </div>

        <div>
          <h3 className="mb-3 font-mono text-xs font-bold tracking-wide text-zinc-400 uppercase">
            Crear rápidamente desde Plantilla
          </h3>
          <SelectorPlantilla
            onSeleccionar={(plantilla) => {
              if (clientes.length === 0) {
                mostrarToast(
                  "Registra al menos un cliente en el CRM antes de generar documentos.",
                  "error"
                );
                return;
              }
              setPlantillaSeleccionada(plantilla);
              setModalCrearAbierto(true);
            }}
          />
        </div>

        <div>
          <h3 className="mb-3 font-mono text-xs font-bold tracking-wide text-zinc-400 uppercase">
            Tus Documentos Guardados
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documentos.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-[#2A2A2E] bg-[#18181B] py-10 text-center font-mono text-xs text-zinc-500 italic">
                No tienes documentos registrados. Comienza seleccionando una
                plantilla.
              </div>
            ) : (
              documentos.map((d) => {
                const clientName =
                  clientes.find((c) => c.id === d.clienteId)?.nombre ||
                  "Sin cliente";
                return (
                  <Card key={d.id}>
                    <div className="flex items-start justify-between gap-3">
                      <h4
                        onClick={() => setDocumentoSeleccionado(d)}
                        className="block cursor-pointer text-xs font-bold text-zinc-200 transition-all hover:text-emerald-400"
                      >
                        {d.titulo}
                      </h4>
                      <button
                        onClick={(e) => eliminarDocumento(d.id, e)}
                        className="font-mono text-xs font-bold text-zinc-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-zinc-500">
                      Cliente: {clientName} • Tipo: {d.tipo}
                    </p>
                    <span className="mt-3 inline-block rounded border border-[#2A2A2E] bg-[#18181B] px-2 py-0.5 font-mono text-[9px] font-bold text-zinc-400">
                      v{d.versiones?.length || 1} Versión
                    </span>

                    <div className="mt-4 flex justify-end gap-3 border-t border-[#2A2A2E]/60 pt-3">
                      <Button onClick={() => setDocumentoSeleccionado(d)}>
                        Editar Documento
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        <ModalDocumento
          abierto={modalCrearAbierto}
          onCerrar={() => setModalCrearAbierto(false)}
          onConfirmar={handleCrearDocumento}
          clientes={clientes}
          proyectos={proyectos}
          tipos={TIPOS_DOCS}
        />
      </div>
    </MainLayout>
  );
}
