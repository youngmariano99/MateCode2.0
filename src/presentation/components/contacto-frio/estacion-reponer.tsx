"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Textarea } from "../input";
import { Badge } from "../badge";
import { BotonPrompt } from "./piezas-cinta";
import { RegistroProspecto } from "./registro-prospecto";
import { GestionarContactoFrioUseCase } from "../../../application/use-cases/crm/gestionar-contacto-frio.use-case";
import {
  parsearCalificacionIA,
  PRESETS_FILTRO_DINAMICO,
  DETALLE_FILTROS_UNIVERSALES,
  type ProspectoIA,
  type FiltroDinamicoRubro,
} from "../../../domain/entidades/contacto-frio-ia.entity";
import { generarPromptCalificar } from "../../../domain/prompts/generar-prompt-contacto-frio";
import { Input } from "../input";

const useCase = new GestionarContactoFrioUseCase();

/**
 * ④ REPONER — mantener el stock de prospectos nuevos. Se copia lo que se ve
 * de uno o varios perfiles (bio, posteos, notas), el prompt lo califica y
 * devuelve la ficha lista; acá se pega y se cargan todos juntos. También se
 * puede cargar a mano.
 */
export const EstacionReponer: React.FC<{ stock: number }> = ({ stock }) => {
  const [info, setInfo] = useState("");
  const [json, setJson] = useState("");
  const [leidos, setLeidos] = useState<ProspectoIA[] | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  // Filtro dinámico por rubro (Capa 2)
  const [presetIndex, setPresetIndex] = useState<number>(0);
  const [esCustom, setEsCustom] = useState<boolean>(false);
  const [customClave, setCustomClave] = useState<string>("");
  const [customNombre, setCustomNombre] = useState<string>("");
  const [customDesc, setCustomDesc] = useState<string>("");

  const filtroDinamicoActivo: FiltroDinamicoRubro | undefined =
    React.useMemo(() => {
      if (esCustom) {
        if (!customClave.trim()) return undefined;
        return {
          clave: customClave.trim().toLowerCase().replace(/\s+/g, "_"),
          nombreRubro: customNombre.trim() || "Rubro Personalizado",
          descripcion:
            customDesc.trim() ||
            "Criterio específico de validación para este rubro.",
        };
      }
      return PRESETS_FILTRO_DINAMICO[presetIndex];
    }, [esCustom, presetIndex, customClave, customNombre, customDesc]);

  const etiquetas =
    useLiveQuery(
      () => db.catalogo_etiquetas.where("categoria").equals("dolor").toArray(),
      []
    ) ?? [];

  const leer = () => {
    setError("");
    setMensaje("");
    const res = parsearCalificacionIA(json);
    if (!res.ok) {
      setLeidos(null);
      return setError(res.error);
    }
    setLeidos(res.data.prospectos);
  };

  const cargar = async () => {
    if (!leidos) return;
    setTrabajando(true);
    const res = await useCase.importarProspectos(leidos);
    setTrabajando(false);
    if (!res.ok) return setError(res.error!.mensaje);
    const r = res.valor!;
    setMensaje(
      `Se cargaron ${r.creados}` +
        (r.duplicados ? ` · ${r.duplicados} ya existían` : "") +
        (r.noCalifican ? ` · ${r.noCalifican} no calificaban` : "") +
        "."
    );
    setLeidos(null);
    setJson("");
    setInfo("");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-[#2A2A2E] bg-[#18181B] px-4 py-3 text-sm text-zinc-300">
        Stock de prospectos nuevos:{" "}
        <span className="font-bold text-zinc-100">{stock}</span>
        <span className="ml-2 text-xs text-zinc-500">
          Reponé cuando queden menos que tu objetivo diario.
        </span>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-wider text-zinc-400 uppercase">
            Con ayuda de tu IA (Calificación por Capas)
          </h3>
          <Badge color="emerald">Mom Test</Badge>
        </div>

        {/* Configuración de Filtros: Capa 1 Universales + Capa 2 Dinámico */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#2A2A2E] bg-[#121214] p-4 text-xs">
          <div className="flex flex-col gap-1">
            <span className="font-bold text-zinc-200">
              Capa 1: Los 4 Filtros Universales (Fijos en todos tus ciclos)
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Object.values(DETALLE_FILTROS_UNIVERSALES).map((f) => (
                <span
                  key={f.clave}
                  className="rounded-lg border border-zinc-800 bg-[#18181B] px-2.5 py-1 text-[11px] text-zinc-300"
                  title={f.descripcion}
                >
                  <strong className="text-emerald-400">{f.clave}</strong> (
                  {f.subtitulo})
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-zinc-800/80 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-zinc-200">
                Capa 2: El 5.° Filtro Dinámico de Rubro (Sprint actual)
              </span>
              <button
                type="button"
                onClick={() => setEsCustom(!esCustom)}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
              >
                {esCustom
                  ? "← Usar Presets por Rubro"
                  : "+ Filtro Personalizado"}
              </button>
            </div>

            {!esCustom ? (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {PRESETS_FILTRO_DINAMICO.map((preset, idx) => (
                    <button
                      key={preset.clave}
                      type="button"
                      onClick={() => setPresetIndex(idx)}
                      className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all ${
                        presetIndex === idx
                          ? "border-emerald-500/60 bg-emerald-500/10 text-white"
                          : "border-[#2A2A2E] bg-[#18181B] text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                      }`}
                    >
                      <span className="text-xs font-semibold text-zinc-200">
                        {preset.nombreRubro}
                      </span>
                      <span className="font-mono text-[10px] text-emerald-400">
                        {preset.clave}
                      </span>
                      <p className="line-clamp-2 text-[10px] text-zinc-400">
                        {preset.descripcion}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 rounded-xl border border-dashed border-[#2A2A2E] bg-[#18181B] p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    label="Nombre del Rubro"
                    placeholder="Ej. Distribuidoras Avícolas"
                    value={customNombre}
                    onChange={(e) => setCustomNombre(e.target.value)}
                  />
                  <Input
                    label="Clave del Filtro (snake_case)"
                    placeholder="Ej. logística_refrigerada"
                    value={customClave}
                    onChange={(e) => setCustomClave(e.target.value)}
                  />
                </div>
                <Input
                  label="Descripción de qué debe buscar la IA en el perfil"
                  placeholder="Ej. Posee furgones térmicos propios, lista semanal de pollos en Excel/WhatsApp..."
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                />
              </div>
            )}

            <div className="rounded-lg bg-emerald-500/5 px-2.5 py-1.5 text-[11px] text-emerald-300/90">
              💡 <strong>Regla de Calificación:</strong> Califica solo si cumple{" "}
              <code className="text-emerald-400">pulso_comercial_activo</code> +
              al menos 2 filtros más entre los universales y el dinámico.
            </div>
          </div>
        </div>

        <Textarea
          label="① Pegá lo que copiaste de los perfiles (bio, posteos, notas)"
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          rows={5}
          placeholder="Podés pegar varios comercios juntos, uno atrás del otro."
        />
        <BotonPrompt
          etiqueta="② Copiar prompt de calificación con filtros de rubro"
          deshabilitado={!info.trim()}
          generar={() =>
            generarPromptCalificar({
              etiquetasDolor: etiquetas.map((e) => e.etiqueta),
              infoPegada: info,
              filtroDinamico: filtroDinamicoActivo,
            })
          }
        />
        <Textarea
          label="③ Pegá lo que devolvió la IA (JSON)"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={4}
        />
        <Button
          variant="secondary"
          onClick={leer}
          disabled={!json.trim()}
          className="self-start"
        >
          Leer respuesta de la IA
        </Button>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {mensaje && <p className="text-xs text-emerald-400">{mensaje}</p>}

        {leidos && (
          <div className="flex flex-col gap-2">
            {leidos.map((p, i) => (
              <div
                key={`${p.nombre}-${i}`}
                className="flex items-center justify-between rounded-xl border border-[#2A2A2E] bg-[#111113] px-3 py-2 text-sm"
              >
                <span className="text-zinc-200">
                  {p.nombre}
                  {p.rubro ? ` · ${p.rubro}` : ""}
                </span>
                <Badge color={p.califica ? "emerald" : "zinc"}>
                  {p.califica ? "Califica" : "No califica"}
                </Badge>
              </div>
            ))}
            <Button
              onClick={cargar}
              cargando={trabajando}
              className="self-start"
            >
              Cargar {leidos.filter((p) => p.califica).length} prospecto(s)
            </Button>
          </div>
        )}
      </div>

      <details className="rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
        <summary className="cursor-pointer text-sm font-bold text-zinc-300">
          O cargar uno a mano
        </summary>
        <div className="mt-4">
          <RegistroProspecto />
        </div>
      </details>
    </div>
  );
};
