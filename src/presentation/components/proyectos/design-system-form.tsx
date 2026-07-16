/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { db } from "../../../offline/dexie/db";
import { useToast } from "../../hooks/useToast";
import { useLiveQuery } from "dexie-react-hooks";

interface DesignSystemFormProps {
  proyectoId: string;
}

const PRESETS = {
  suizo: {
    arquetipo: "Diseño Suizo",
    metafora:
      "Prioriza la jerarquía tipográfica y el espacio en blanco por encima de los elementos decorativos. Menos componentes, mejor alineación.",
    radioBordes: "0px",
    sombras: "Prohibidas",
    directrizNegacion:
      "Evitar elementos de adorno innecesarios, no usar esquinas redondeadas exageradas ni sombras difusas.",
    parejaTipografica: "Inter (con pesos extremos Thin 100 y Black 900)",
    escalaEspaciado: "Holgado",
    reglaColor:
      "Fondo oscuro/gris profundo, texto claro con alta legibilidad, un solo color de acento minimalista.",
    estiloAnimaciones: "Secas 0ms",
    estadoHover: "Invertir colores o agregar borde sutil",
  },
  cyberpunk: {
    arquetipo: "Cyberpunk Oscuro",
    metafora:
      "Un terminal de hackers con luces de neón en un callejón lluvioso de Neo-Tokio.",
    radioBordes: "0px",
    sombras: "Sombras Duras",
    directrizNegacion:
      "No usar esquinas redondeadas, prohibido usar colores pastel o suaves, evitar fondos claros.",
    parejaTipografica: "JetBrains Mono (Monospace técnico) + Outfit",
    escalaEspaciado: "Denso",
    reglaColor:
      "Fondo negro absoluto (#000000), texto verde terminal o cian, acentos en rosa neón brillante y amarillo advertencia.",
    estiloAnimaciones: "Elásticas Spring",
    estadoHover: "Invertir colores con parpadeo rápido y parpadeo de borde",
  },
  neumorfismo: {
    arquetipo: "Neumorfismo Suave",
    metafora:
      "El panel de control físico de un dispositivo médico de alta gama tallado en plástico mate suave.",
    radioBordes: "12px",
    sombras: "Sombras Difusas",
    directrizNegacion:
      "Prohibido usar bordes negros sólidos, evitar el diseño plano de alto contraste.",
    parejaTipografica: "Outfit + Inter",
    escalaEspaciado: "Holgado",
    reglaColor:
      "Fondo gris claro suave (#E0E0E0), textos grises intermedios de bajo contraste, acentos en azul cielo sutil.",
    estiloAnimaciones: "Suaves Ease-in-out",
    estadoHover: "Hundimiento del botón (sombra interna inset)",
  },
  brutalismo: {
    arquetipo: "Brutalismo Impactante",
    metafora: "Un póster impreso de una banda punk rock de garage de los 80.",
    radioBordes: "4px",
    sombras: "Sombras Duras",
    directrizNegacion:
      "Prohibido usar degradados suaves o sombras borrosas, evitar el minimalismo silencioso.",
    parejaTipografica: "Archivo Black + JetBrains Mono",
    escalaEspaciado: "Denso",
    reglaColor:
      "Fondo amarillo brillante o naranja, bordes negros gruesos de 2px, texto negro puro, sombras sólidas negras.",
    estiloAnimaciones: "Secas 0ms",
    estadoHover: "Desplazamiento físico de 4px con sombra reducida",
  },
};

export const DesignSystemForm: React.FC<DesignSystemFormProps> = ({
  proyectoId,
}) => {
  const { mostrarToast } = useToast();

  const dsData = useLiveQuery(
    () => db.proyecto_design_system.get(proyectoId),
    [proyectoId]
  ) as any;

  const [arquetipo, setArquetipo] = useState("");
  const [metafora, setMetafora] = useState("");
  const [radioBordes, setRadioBordes] = useState("");
  const [sombras, setSombras] = useState("");
  const [directrizNegacion, setDirectrizNegacion] = useState("");
  const [parejaTipografica, setParejaTipografica] = useState("");
  const [escalaEspaciado, setEscalaEspaciado] = useState("");
  const [reglaColor, setReglaColor] = useState("");
  const [estiloAnimaciones, setEstiloAnimaciones] = useState("");
  const [estadoHover, setEstadoHover] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    if (dsData) {
      setArquetipo(dsData.arquetipo || "");
      setMetafora(dsData.metafora || "");
      setRadioBordes(dsData.radioBordes || "");
      setSombras(dsData.sombras || "");
      setDirectrizNegacion(dsData.directrizNegacion || "");
      setParejaTipografica(dsData.parejaTipografica || "");
      setEscalaEspaciado(dsData.escalaEspaciado || "");
      setReglaColor(dsData.reglaColor || "");
      setEstiloAnimaciones(dsData.estiloAnimaciones || "");
      setEstadoHover(dsData.estadoHover || "");
      setLogoUrl(dsData.logoUrl || "");
    }
  }, [dsData]);

  const aplicarPreset = (key: keyof typeof PRESETS) => {
    const p = PRESETS[key];
    setArquetipo(p.arquetipo);
    setMetafora(p.metafora);
    setRadioBordes(p.radioBordes);
    setSombras(p.sombras);
    setDirectrizNegacion(p.directrizNegacion);
    setParejaTipografica(p.parejaTipografica);
    setEscalaEspaciado(p.escalaEspaciado);
    setReglaColor(p.reglaColor);
    setEstiloAnimaciones(p.estiloAnimaciones);
    setEstadoHover(p.estadoHover);
    mostrarToast(`Preset de ${p.arquetipo} cargado correctamente.`, "exito");
  };

  const handleSave = async () => {
    await db.proyecto_design_system.put({
      proyectoId,
      arquetipo,
      metafora,
      radioBordes,
      sombras,
      directrizNegacion,
      parejaTipografica,
      escalaEspaciado,
      reglaColor,
      estiloAnimaciones,
      estadoHover,
      logoUrl,
    });
    mostrarToast("Design System guardado correctamente.", "exito");
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="border-b border-[#2A2A2E] pb-3">
        <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
          🎨 Sistema de Diseño del Proyecto (IA Design System)
        </h3>
        <p className="font-mono text-[10px] text-zinc-500">
          Establece arquetipos, metáforas y directrices para que los prompts de
          UI no sean genéricos
        </p>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
          Cambiar Arquetipo Base (Presets):
        </span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => aplicarPreset("suizo")}
            className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 py-1.5 font-mono text-[10px] font-bold text-emerald-400 transition-all hover:bg-emerald-500 hover:text-black"
          >
            🇨🇭 Diseño Suizo
          </button>
          <button
            type="button"
            onClick={() => aplicarPreset("cyberpunk")}
            className="rounded-lg border border-pink-500/20 bg-pink-500/5 py-1.5 font-mono text-[10px] font-bold text-pink-400 transition-all hover:bg-pink-500 hover:text-black"
          >
            👾 Cyberpunk
          </button>
          <button
            type="button"
            onClick={() => aplicarPreset("neumorfismo")}
            className="rounded-lg border border-sky-500/20 bg-sky-500/5 py-1.5 font-mono text-[10px] font-bold text-sky-400 transition-all hover:bg-sky-500 hover:text-black"
          >
            ⚪ Neumorfismo
          </button>
          <button
            type="button"
            onClick={() => aplicarPreset("brutalismo")}
            className="rounded-lg border border-amber-500/20 bg-amber-500/5 py-1.5 font-mono text-[10px] font-bold text-amber-400 transition-all hover:bg-amber-500 hover:text-black"
          >
            ⚡ Brutalismo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Section 1: Identity & Metaphors */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#2A2A2E] bg-zinc-950/20 p-3.5">
          <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
            1. Identidad y &quot;Vibe&quot;
          </span>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              Arquetipo de Diseño
            </label>
            <select
              value={arquetipo}
              onChange={(e) => setArquetipo(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-[#18181B] p-2 font-mono text-xs text-zinc-200 focus:outline-none"
            >
              <option value="Diseño Suizo">
                Diseño Suizo (Minimalismo Estructural)
              </option>
              <option value="Brutalismo">
                Brutalismo (Diseño Crudo/Sólido)
              </option>
              <option value="Neumorfismo">Neumorfismo</option>
              <option value="Material Design 3">Material Design 3</option>
              <option value="Neo-Retro">Neo-Retro (Pixel Art/Vintage)</option>
              <option value="Minimalismo Monocromático">
                Minimalismo Monocromático
              </option>
              <option value="Cyberpunk Oscuro">Cyberpunk Oscuro</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              La Metáfora Visual
            </label>
            <textarea
              value={metafora}
              onChange={(e) => setMetafora(e.target.value)}
              placeholder="Ej: 'Diseña esta interfaz como si fuera el panel de control de un Porsche'"
              rows={2}
              className="rounded-lg border border-zinc-800 bg-[#18181B] p-2 font-mono text-xs text-zinc-200 focus:outline-none"
            />
          </div>
        </div>

        {/* Section 2: Anti-Generic Rules */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#2A2A2E] bg-zinc-950/20 p-3.5">
          <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
            2. Reglas Anti-Genéricas (Frenos de IA)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
                Radio de Bordes
              </label>
              <select
                value={radioBordes}
                onChange={(e) => setRadioBordes(e.target.value)}
                className="rounded-lg border border-zinc-800 bg-[#18181B] p-2 font-mono text-xs text-zinc-200 focus:outline-none"
              >
                <option value="0px">0px (Esquinas perfectas)</option>
                <option value="4px">4px (Sutil)</option>
                <option value="12px">12px (Redondeado estándar)</option>
                <option value="Píldora">Píldora (Totalmente redondeado)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
                Uso de Sombras
              </label>
              <select
                value={sombras}
                onChange={(e) => setSombras(e.target.value)}
                className="rounded-lg border border-zinc-800 bg-[#18181B] p-2 font-mono text-xs text-zinc-200 focus:outline-none"
              >
                <option value="Prohibidas">
                  Prohibidas (Diseño plano/Bordes sólidos)
                </option>
                <option value="Sombras Duras">
                  Sombras duras (Neo-Brutalismo)
                </option>
                <option value="Sombras Difusas">
                  Sombras difusas (Estándar/Suaves)
                </option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              Directriz de Negación (¿Qué evitar?)
            </label>
            <textarea
              value={directrizNegacion}
              onChange={(e) => setDirectrizNegacion(e.target.value)}
              placeholder="Ej: 'No uses degradados suaves, prohibido usar colores pastel'"
              rows={2}
              className="rounded-lg border border-zinc-800 bg-[#18181B] p-2 font-mono text-xs text-zinc-200 focus:outline-none"
            />
          </div>
        </div>

        {/* Section 3: Spacing & Typography */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#2A2A2E] bg-zinc-950/20 p-3.5">
          <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
            3. Sistema Espacial y Tipográfico
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
                Pareja Tipográfica
              </label>
              <select
                value={parejaTipografica}
                onChange={(e) => setParejaTipografica(e.target.value)}
                className="rounded-lg border border-zinc-800 bg-[#18181B] p-2 font-mono text-xs text-zinc-200 focus:outline-none"
              >
                <option value="Inter (con pesos extremos Thin 100 y Black 900)">
                  Inter (Pesos Extremos)
                </option>
                <option value="Playfair Display (Serif) + JetBrains Mono (Sans)">
                  Playfair Serif + Mono
                </option>
                <option value="Outfit (SaaS) + Inter">Outfit + Inter</option>
                <option value="Archivo Black + JetBrains Mono">
                  Archivo Black + Mono
                </option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
                Espaciado
              </label>
              <select
                value={escalaEspaciado}
                onChange={(e) => setEscalaEspaciado(e.target.value)}
                className="rounded-lg border border-zinc-800 bg-[#18181B] p-2 font-mono text-xs text-zinc-200 focus:outline-none"
              >
                <option value="Holgado">Holgado (Limpio/Estilo Apple)</option>
                <option value="Denso">
                  Denso (Compacto/Mucha información)
                </option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              Distribución de Colores
            </label>
            <textarea
              value={reglaColor}
              onChange={(e) => setReglaColor(e.target.value)}
              placeholder="Ej: 'Fondo oscuro/gris, un solo color de acento neón vibrante'"
              rows={2}
              className="rounded-lg border border-zinc-800 bg-[#18181B] p-2 font-mono text-xs text-zinc-200 focus:outline-none"
            />
          </div>
        </div>

        {/* Section 4: Micro-interactions */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#2A2A2E] bg-zinc-950/20 p-3.5">
          <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
            4. Micro-interacciones y Comportamiento
          </span>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              Estilo de Animaciones
            </label>
            <select
              value={estiloAnimaciones}
              onChange={(e) => setEstiloAnimaciones(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-[#18181B] p-2 font-mono text-xs text-zinc-200 focus:outline-none"
            >
              <option value="Secas 0ms">Secas e instantáneas (0ms)</option>
              <option value="Elásticas Spring">
                Elásticas (Spring/Físicas)
              </option>
              <option value="Suaves Ease-in-out">
                Suaves (Ease-in-out estándar)
              </option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              Estados Hover
            </label>
            <textarea
              value={estadoHover}
              onChange={(e) => setEstadoHover(e.target.value)}
              placeholder="Ej: 'Invertir colores, desplazamiento 2px arriba'"
              rows={2}
              className="rounded-lg border border-zinc-800 bg-[#18181B] p-2 font-mono text-xs text-zinc-200 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} className="flex-1">
          Guardar Configuración de Design System
        </Button>
      </div>
    </Card>
  );
};
