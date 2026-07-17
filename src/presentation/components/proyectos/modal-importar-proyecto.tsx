"use client";

import React, { useState } from "react";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";

interface ModalImportarProyectoProps {
  abierto: boolean;
  onCerrar: () => void;
  onImportado: () => void;
}

export const ModalImportarProyecto: React.FC<ModalImportarProyectoProps> = ({
  abierto,
  onCerrar,
  onImportado,
}) => {
  const [jsonPasted, setJsonPasted] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiandoPrompt, setCopiandoPrompt] = useState(false);
  const [copiandoJson, setCopiandoJson] = useState(false);

  const promptAI = `Eres un Ingeniero de Software Principal y experto en ingeniería inversa de proyectos. 
Analiza el código fuente actual, el archivo package.json, README.md u otra información relevante de este proyecto y genera un JSON con la estructura exacta detallada en la plantilla de ejemplo.

Debes responder ÚNICAMENTE con el bloque de código JSON, sin explicaciones ni markdown que lo envuelva.

Estructura requerida:
{
  "nombre": "Nombre del Proyecto",
  "descripcion": "Descripción del Proyecto",
  "tipo": "Landing Page | Sitio Web | Sistema Web | Aplicación Móvil | E-commerce | Automatización | Diseño | Branding | Consultoría | Otro",
  "estado": "Pendiente | Análisis | Diseño | Desarrollo | Testing | Producción | Finalizado",
  "stack": {
    "frontend": ["Tecnología1", "Tecnología2"],
    "backend": ["Tecnología1"],
    "baseDatos": ["BaseDatos"],
    "infraestructura": [],
    "seguridad": [],
    "integraciones": []
  },
  "contexto": {
    "doloresCliente": "Descripción detallada del dolor del cliente",
    "reglasNegocio": "Reglas de negocio clave",
    "publicoObjetivo": "Público objetivo principal"
  },
  "designSystem": {
    "arquetipo": "Brutalismo | Diseño Suizo | Neumorfismo | Material Design 3 | Neo-Retro | Minimalismo Monocromático",
    "metafora": "Metáfora visual detallada",
    "radioBordes": "0px | 4px | Píldora",
    "sombras": "Prohibidas | Sombra Retro Sólida | Sombra Sutil Soft"
  },
  "epicas": [
    {
      "id": "ep_1",
      "nombre": "Nombre de la Épica",
      "descripcion": "Descripción corta"
    }
  ],
  "historias": [
    {
      "id": "us_1",
      "epicaId": "ep_1",
      "titulo": "Título de la Historia de Usuario",
      "descripcion": "Como [rol] quiero [accion] para [beneficio]",
      "prioridad": "Alta | Media | Baja",
      "estimacion": 3
    }
  ]
}`;

  const jsonEjemplo = `{
  "nombre": "E-commerce de Ropa Alpina",
  "descripcion": "Plataforma de ventas online para indumentaria de montaña con integración de stock.",
  "tipo": "E-commerce",
  "estado": "Desarrollo",
  "stack": {
    "frontend": ["Next.js", "React", "TypeScript", "TailwindCSS"],
    "backend": ["Node.js", "Express"],
    "baseDatos": ["PostgreSQL"],
    "infraestructura": ["Vercel", "AWS S3"],
    "seguridad": ["NextAuth.js", "JWT"],
    "integraciones": ["Stripe", "MercadoPago"]
  },
  "contexto": {
    "doloresCliente": "Los clientes abandonan el carrito porque el flujo de checkout es lento.",
    "reglasNegocio": "El stock debe actualizarse en tiempo real al finalizar un pago.",
    "publicoObjetivo": "Montañistas y deportistas de aventura de entre 20 y 50 años."
  },
  "designSystem": {
    "arquetipo": "Diseño Suizo",
    "metafora": "Un catálogo alpino minimalista e impecable",
    "radioBordes": "4px",
    "sombras": "Sombra Sutil Soft"
  },
  "epicas": [
    {
      "id": "ep_checkout",
      "nombre": "Flujo de Checkout",
      "descripcion": "Optimización del carrito de compras y pasarela de pago."
    }
  ],
  "historias": [
    {
      "id": "us_pago_stripe",
      "epicaId": "ep_checkout",
      "titulo": "Pasarela Stripe",
      "descripcion": "Como cliente quiero pagar con tarjeta de crédito vía Stripe para finalizar mi compra de forma segura.",
      "prioridad": "Alta",
      "estimacion": 5
    }
  ]
}`;

  const copiarAlPortapapeles = async (
    texto: string,
    setCopiando: (v: boolean) => void
  ) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiando(true);
      setTimeout(() => setCopiando(false), 2000);
    } catch {
      // Ignorar errores silenciosamente
    }
  };

  const handleImportar = async () => {
    setError(null);
    if (!jsonPasted.trim()) {
      setError("Por favor, pega el bloque JSON generado.");
      return;
    }

    try {
      // Clean up markdown block wraps if present
      let rawJson = jsonPasted.trim();
      if (rawJson.startsWith("```")) {
        rawJson = rawJson.replace(/^```[a-zA-Z0-9_-]*/, "").replace(/```$/, "");
      }
      rawJson = rawJson.trim();

      const parsed = JSON.parse(rawJson);

      if (!parsed.nombre) {
        setError("El JSON debe incluir un campo 'nombre' para el proyecto.");
        return;
      }

      // Generate atomic database entries
      const proyectoId = "pro_" + Math.random().toString(36).substring(2, 9);

      // 1. Create main project entity
      await db.proyectos.add({
        id: proyectoId,
        nombre: parsed.nombre,
        clienteId: "", // Sin Cliente / Idea Propia
        descripcion: parsed.descripcion || "",
        tipo: parsed.tipo || "Sistema Web",
        estado: parsed.estado || "Pendiente",
        stack: parsed.stack || {
          frontend: [],
          backend: [],
          baseDatos: [],
          infraestructura: [],
          seguridad: [],
          integraciones: [],
        },
        estandares: {
          arquitectura: [],
          patrones: [],
          buenasPracticas: [],
          principios: [],
          testing: [],
          devops: [],
          coberturaMinima: 80,
        },
        productOwner: {
          problema: parsed.contexto?.doloresCliente || "",
          dolor: parsed.contexto?.doloresCliente || "",
          objetivos: parsed.contexto?.reglasNegocio || "",
          usuarios: parsed.contexto?.publicoObjetivo || "",
          restricciones: "",
          definicionListo: "",
        },
        financiero: {
          precioTotal: 0,
          moneda: "USD",
          formaPago: "Único",
          cantidadPagos: 1,
          estadoPago: "Pendiente",
        },
      });

      // 2. Context metadata
      await db.proyecto_contexto.add({
        proyectoId,
        doloresCliente: parsed.contexto?.doloresCliente || "",
        reglasNegocio: parsed.contexto?.reglasNegocio || "",
        publicoObjetivo: parsed.contexto?.publicoObjetivo || "",
        casosUsoExcluidos: "",
        historiasCriticas: "",
      });

      // 3. Design System
      await db.proyecto_design_system.add({
        proyectoId,
        arquetipo: parsed.designSystem?.arquetipo || "Diseño Suizo",
        metafora:
          parsed.designSystem?.metafora || "Catálogo minimalista estructural",
        radioBordes: parsed.designSystem?.radioBordes || "4px",
        sombras: parsed.designSystem?.sombras || "Sombra Sutil Soft",
        fuentePrimaria: "Inter",
        fuenteSecundaria: "Inter",
        microinteracciones: "Hover escalado sutil",
      });

      // 4. Engineering State
      const allDeps = [
        ...(parsed.stack?.frontend || []),
        ...(parsed.stack?.backend || []),
        ...(parsed.stack?.baseDatos || []),
      ];
      await db.proyecto_estado_tecnico.add({
        proyectoId,
        dependencias: allDeps.map((d: string) => ({
          nombre: d,
          version: "latest",
        })),
        baseDatosEsquema: "",
      });

      // 5. Epics mapping
      const epicIdMap = new Map<string, string>();
      if (Array.isArray(parsed.epicas)) {
        for (const ep of parsed.epicas) {
          const newEpId = "ep_" + Math.random().toString(36).substring(2, 9);
          epicIdMap.set(ep.id, newEpId);
          await db.epicas.add({
            id: newEpId,
            proyectoId,
            nombre: ep.nombre,
            descripcion: ep.descripcion || "",
          });
        }
      }

      // 6. User Stories mapping
      if (Array.isArray(parsed.historias)) {
        for (const us of parsed.historias) {
          const newUsId = "us_" + Math.random().toString(36).substring(2, 9);
          const mappedEpicId = epicIdMap.get(us.epicaId) || "";
          await db.historias.add({
            id: newUsId,
            proyectoId,
            epicaId: mappedEpicId,
            sprintId: "",
            titulo: us.titulo,
            descripcion: us.descripcion || "",
            prioridad: us.prioridad || "Media",
            estimacion: Number(us.estimacion) || 0,
            estado: "Todo",
          });
        }
      }

      // 7. Add synchronization log
      await db.logs_sincronizacion.add({
        tipo: "exito",
        mensaje: `Ingesta: Proyecto "${parsed.nombre}" importado y mapeado exitosamente con ID ${proyectoId}.`,
        fecha: Date.now(),
      });

      setJsonPasted("");
      onImportado();
      onCerrar();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        `Error parseando el JSON: ${msg}. Por favor, verifica el formato.`
      );
    }
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onCerrar}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Panel */}
      <div className="relative z-10 flex h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-[#2A2A2E] bg-[#121214] p-6 shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-[#2A2A2E] pb-4">
          <div>
            <h3 className="font-mono text-sm font-extrabold tracking-tight text-white uppercase">
              🚀 Ingestar Proyecto Existente (IA)
            </h3>
            <p className="mt-1 font-mono text-[10px] text-zinc-400">
              Genera e importa el contexto completo de un proyecto en un solo
              clic.
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Icono.Close className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido dividido */}
        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto py-5 md:grid-cols-2">
          {/* Instrucciones & Prompt */}
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="font-mono text-xs font-bold text-zinc-300">
                Paso 1: Generar el JSON con tu IA
              </h4>
              <p className="mt-1 font-mono text-[10px] leading-relaxed text-zinc-500">
                Copia este prompt e introdúcelo en ChatGPT, Claude o tu IA
                preferida junto con el código de tu proyecto (package.json,
                README, etc.) para armar el JSON estructurado.
              </p>
            </div>

            <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="font-mono text-[9px] text-zinc-600 uppercase">
                  Prompt del Sistema
                </span>
                <button
                  onClick={() =>
                    copiarAlPortapapeles(promptAI, setCopiandoPrompt)
                  }
                  className="hover:bg-zinc-850 flex items-center gap-1 rounded bg-zinc-900 px-2 py-1 font-mono text-[9px] text-emerald-400"
                >
                  {copiandoPrompt ? "¡Copiado!" : "Copiar Prompt"}
                </button>
              </div>
              <pre className="mt-3 max-h-[180px] overflow-y-auto font-mono text-[9px] leading-relaxed whitespace-pre-wrap text-zinc-400 select-all">
                {promptAI}
              </pre>
            </div>

            <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="font-mono text-[9px] text-zinc-600 uppercase">
                  Esquema / Plantilla de Referencia
                </span>
                <button
                  onClick={() =>
                    copiarAlPortapapeles(jsonEjemplo, setCopiandoJson)
                  }
                  className="hover:bg-zinc-850 flex items-center gap-1 rounded bg-zinc-900 px-2 py-1 font-mono text-[9px] text-emerald-400"
                >
                  {copiandoJson ? "¡Copiado!" : "Copiar Plantilla"}
                </button>
              </div>
              <pre className="mt-3 max-h-[180px] overflow-y-auto font-mono text-[9px] leading-relaxed whitespace-pre-wrap text-zinc-400">
                {jsonEjemplo}
              </pre>
            </div>
          </div>

          {/* Importador */}
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="font-mono text-xs font-bold text-zinc-300">
                Paso 2: Pegar JSON e Importar
              </h4>
              <p className="mt-1 font-mono text-[10px] leading-relaxed text-zinc-500">
                Pega el bloque de respuesta JSON obtenido de la IA aquí abajo.
                Nos encargaremos de mapear la estructura de arquitectura,
                backlog de desarrollo y design system.
              </p>
            </div>

            <div className="flex flex-1 flex-col">
              <textarea
                value={jsonPasted}
                onChange={(e) => setJsonPasted(e.target.value)}
                placeholder="Pega tu JSON aquí..."
                className="min-h-[300px] w-full flex-1 resize-none rounded-2xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-[10px] text-zinc-300 placeholder-zinc-700 outline-none focus:border-zinc-700"
              />

              {error && (
                <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 font-mono text-[10px] text-rose-400">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[#2A2A2E] pt-4">
          <button
            onClick={onCerrar}
            className="rounded-xl border border-zinc-800 bg-transparent px-5 py-2 font-mono text-xs font-bold text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleImportar}
            className="flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2 font-mono text-xs font-bold text-black hover:bg-emerald-400"
          >
            Importar Proyecto
          </button>
        </div>
      </div>
    </div>
  );
};
