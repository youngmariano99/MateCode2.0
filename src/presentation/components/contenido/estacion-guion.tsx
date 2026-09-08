"use client";

import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Input, Textarea } from "../input";
import { Select, MultiSelect } from "../select";
import { Button } from "../button";
import { Icono } from "../icons";
import { ModalImportarJson } from "./modal-importar-json";
import { EditorPlantillaGuion } from "./editor-plantilla-guion";
import { GestionarContenidoUseCase } from "../../../application/use-cases/contenido/gestionar-contenido.use-case";
import { generarPromptTransformarContenido } from "../../../domain/prompts/generar-prompt-transformar-contenido";
import {
  TIPOS_CONTENIDO,
  type TipoContenido,
} from "../../../domain/entidades/contenido.entity";

const useCase = new GestionarContenidoUseCase();
const CANALES_OPCIONES = [
  { value: "Instagram", label: "Instagram" },
  { value: "TikTok", label: "TikTok" },
  { value: "Facebook", label: "Facebook" },
];
const SIN_CONTENIDOS: never[] = [];
const SIN_IDEAS: never[] = [];

interface EstacionGuionProps {
  cicloId: string;
}

export const EstacionGuion: React.FC<EstacionGuionProps> = ({ cicloId }) => {
  const plantilla = useLiveQuery(() =>
    db.plantilla_guion.get("plantilla_default")
  );
  const contenidos =
    useLiveQuery(
      () => db.contenido.where({ cicloId, estado: "Guion" }).toArray(),
      [cicloId]
    ) || SIN_CONTENIDOS;
  const ideasSeleccionadas =
    useLiveQuery(
      () =>
        db.idea_contenido.where({ cicloId, estado: "Seleccionada" }).toArray(),
      [cicloId]
    ) || SIN_IDEAS;

  const [contenidoActivoId, setContenidoActivoId] = useState<string | null>(
    null
  );
  const [ideaOrigenId, setIdeaOrigenId] = useState<string | undefined>(
    undefined
  );
  const [titulo, setTitulo] = useState("");
  const [tipoContenido, setTipoContenido] = useState<TipoContenido>("Video");
  const [canales, setCanales] = useState<string[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [modalJsonAbierto, setModalJsonAbierto] = useState(false);
  const [modalPlantillaAbierto, setModalPlantillaAbierto] = useState(false);
  const [promptTransformar, setPromptTransformar] = useState("");
  const [tipoDestino, setTipoDestino] = useState<TipoContenido>("Post");
  const [guardando, setGuardando] = useState(false);

  const secciones = useMemo(
    () =>
      (plantilla?.secciones || []).slice().sort((a, b) => a.orden - b.orden),
    [plantilla]
  );

  const abrirNuevo = (ideaId?: string, textoIdea?: string) => {
    setContenidoActivoId(null);
    setIdeaOrigenId(ideaId);
    setTitulo(textoIdea || "");
    setTipoContenido("Video");
    setCanales([]);
    setValores({});
    setPromptTransformar("");
  };

  const abrirExistente = async (contenidoId: string) => {
    const c = await db.contenido.get(contenidoId);
    if (!c) return;
    setContenidoActivoId(contenidoId);
    setIdeaOrigenId(c.ideaId);
    setTitulo(c.titulo);
    setTipoContenido(c.tipoContenido);
    setCanales(c.canales);
    setValores(c.guion);
    setPromptTransformar("");
  };

  const guardar = async () => {
    setGuardando(true);
    const input = { titulo, tipoContenido, canales, guion: valores };
    const res = contenidoActivoId
      ? await useCase.guardarGuion(contenidoActivoId, input)
      : await useCase.crearContenidoDesdeIdea(cicloId, input, ideaOrigenId);
    setGuardando(false);
    if (res.ok) {
      abrirNuevo();
    }
  };

  const generarTransformacion = () => {
    if (!contenidoActivoId) return;
    setPromptTransformar(
      generarPromptTransformarContenido(
        { titulo, tipoContenido, guion: valores },
        secciones,
        tipoDestino,
        canales
      )
    );
  };

  const copiarPrompt = async () => {
    await navigator.clipboard.writeText(promptTransformar);
  };

  const importarLote = async (items: unknown[]) => {
    for (const item of items) {
      const i = item as {
        titulo?: string;
        tipoContenido?: TipoContenido;
        canales?: string[];
        guion?: Record<string, string>;
      };
      if (i.titulo) {
        await useCase.crearContenidoDesdeIdea(cicloId, {
          titulo: i.titulo,
          tipoContenido: TIPOS_CONTENIDO.includes(
            i.tipoContenido as TipoContenido
          )
            ? (i.tipoContenido as TipoContenido)
            : "Video",
          canales: i.canales || [],
          guion: i.guion || {},
        });
      }
    }
  };

  const plantillaEjemplo = JSON.stringify(
    [
      {
        titulo: "Título del contenido",
        tipoContenido: "Video",
        canales: ["Instagram", "TikTok"],
        guion: Object.fromEntries(
          secciones.map((s) => [s.id, `(${s.etiqueta})`])
        ),
      },
    ],
    null,
    2
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <div className="flex flex-col gap-3">
        <Button
          onClick={() => abrirNuevo()}
          icono={<Icono.Plus className="h-4 w-4" />}
        >
          Nuevo contenido
        </Button>
        <div className="flex flex-col gap-1 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-2">
          <span className="px-1 text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Ideas de la semana
          </span>
          {ideasSeleccionadas.map((idea) => (
            <button
              key={idea.id}
              onClick={() => abrirNuevo(idea.id, idea.texto)}
              className="rounded-lg px-2 py-1.5 text-left text-sm text-zinc-300 hover:bg-[#232326]"
            >
              {idea.texto}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-2">
          <span className="px-1 text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Guiones en progreso
          </span>
          {contenidos.map((c) => (
            <button
              key={c.id}
              onClick={() => abrirExistente(c.id)}
              className={`rounded-lg px-2 py-1.5 text-left text-sm ${
                contenidoActivoId === c.id
                  ? "bg-emerald-500/10 font-bold text-emerald-400"
                  : "text-zinc-300 hover:bg-[#232326]"
              }`}
            >
              {c.titulo}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          onClick={() => setModalPlantillaAbierto(true)}
          className="text-xs"
        >
          Editar estructura del guion
        </Button>
        <Button
          variant="ghost"
          onClick={() => setModalJsonAbierto(true)}
          className="text-xs"
        >
          Importar por JSON
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6">
        <Input
          label="Título"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Tipo de contenido"
            value={tipoContenido}
            onChange={(v) => setTipoContenido(v as TipoContenido)}
            options={TIPOS_CONTENIDO.map((t) => ({ value: t, label: t }))}
          />
          <MultiSelect
            label="Canales"
            options={CANALES_OPCIONES}
            value={canales}
            onChange={setCanales}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-[#2A2A2E] pt-3">
          <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Principal
          </span>
          {secciones
            .filter((s) => s.grupo === "principal")
            .map((s) => (
              <Textarea
                key={s.id}
                label={s.etiqueta}
                value={valores[s.id] || ""}
                onChange={(e) =>
                  setValores({ ...valores, [s.id]: e.target.value })
                }
              />
            ))}
        </div>
        <div className="flex flex-col gap-3 border-t border-[#2A2A2E] pt-3">
          <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Extra
          </span>
          {secciones
            .filter((s) => s.grupo === "extra")
            .map((s) => (
              <Input
                key={s.id}
                label={s.etiqueta}
                value={valores[s.id] || ""}
                onChange={(e) =>
                  setValores({ ...valores, [s.id]: e.target.value })
                }
              />
            ))}
        </div>

        <div className="flex items-center justify-end gap-2">
          {contenidoActivoId && (
            <Button
              variant="outline"
              onClick={async () => {
                await useCase.avanzarAProduccion(contenidoActivoId);
                abrirNuevo();
              }}
            >
              Enviar a producción
            </Button>
          )}
          <Button
            onClick={guardar}
            cargando={guardando}
            disabled={!titulo.trim()}
          >
            Guardar guion
          </Button>
        </div>

        {contenidoActivoId && (
          <div className="flex flex-col gap-2 border-t border-[#2A2A2E] pt-3">
            <div className="flex items-center gap-2">
              <Select
                value={tipoDestino}
                onChange={(v) => setTipoDestino(v as TipoContenido)}
                options={TIPOS_CONTENIDO.map((t) => ({ value: t, label: t }))}
                className="w-40"
              />
              <Button
                variant="outline"
                onClick={generarTransformacion}
                icono={<Icono.Sparkles className="h-4 w-4" />}
              >
                Transformar a otro tipo
              </Button>
            </div>
            {promptTransformar && (
              <>
                <Textarea value={promptTransformar} readOnly rows={6} />
                <Button
                  variant="secondary"
                  onClick={copiarPrompt}
                  className="self-start"
                >
                  Copiar prompt
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <EditorPlantillaGuion
        abierto={modalPlantillaAbierto}
        onCerrar={() => setModalPlantillaAbierto(false)}
      />
      <ModalImportarJson
        abierto={modalJsonAbierto}
        onCerrar={() => setModalJsonAbierto(false)}
        titulo="Importar contenido por JSON"
        plantillaEjemplo={plantillaEjemplo}
        onImportar={importarLote}
      />
    </div>
  );
};
