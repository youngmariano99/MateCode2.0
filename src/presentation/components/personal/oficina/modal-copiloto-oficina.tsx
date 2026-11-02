"use client";

import React, { useState } from "react";
import { Dialog } from "../../dialog";
import { Icono } from "../../icons";
import { Badge } from "../../badge";
import { Button } from "../../button";
import { AsistenteOficinaService } from "../../../../application/servicios/asistente-oficina.service";
import type {
  IntencionAsistente,
  RespuestaAsistenteOficina,
} from "../../../../domain/entidades/asistente-oficina.entity";

interface ModalCopilotoOficinaProps {
  abierto: boolean;
  onCerrar: () => void;
}

const asistenteService = new AsistenteOficinaService();

export const ModalCopilotoOficina: React.FC<ModalCopilotoOficinaProps> = ({
  abierto,
  onCerrar,
}) => {
  const [modoAhorro, setModoAhorro] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [consultaLibre, setConsultaLibre] = useState("");
  const [respuesta, setRespuesta] = useState<RespuestaAsistenteOficina | null>(
    null
  );

  const ejecutarConsulta = async (
    intencion: IntencionAsistente,
    consulta?: string
  ) => {
    setCargando(true);
    try {
      const res = await asistenteService.consultarCopiloto({
        intencion,
        consultaUsuario: consulta,
        modoAhorro,
      });
      setRespuesta(res);
    } finally {
      setCargando(false);
    }
  };

  if (!abierto) return null;

  return (
    <Dialog
      abierto={abierto}
      onClose={onCerrar}
      titulo="Copiloto Ejecutivo de Oficina"
      maxWidth="xl"
    >
      <div className="flex flex-col gap-4">
        {/* Cabecera con switch de Modo Ahorro */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2A2A2E] pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModoAhorro(!modoAhorro)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                modoAhorro
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-purple-500/30 bg-purple-500/10 text-purple-300"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  modoAhorro ? "bg-emerald-400" : "bg-purple-400"
                }`}
              />
              {modoAhorro ? "Modo Ahorro (0 Tokens)" : "Modo IA (Gemini 2.5)"}
            </button>
            <span className="text-[11px] text-zinc-500">
              {modoAhorro
                ? "Respuestas deterministas exactas de tu BD sin llamadas a IA"
                : "Análisis y recomendaciones tácticas redactadas por Gemini"}
            </span>
          </div>

          <Badge color={modoAhorro ? "emerald" : "sky"}>
            {modoAhorro ? "Local 0ms" : "Gemini API"}
          </Badge>
        </div>

        {/* Botones de Acción en 1 clic */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Consultas rápidas con tus datos reales:
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              onClick={() => void ejecutarConsulta("resumen_hoy")}
              disabled={cargando}
              className="flex items-center gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3 text-left transition-all hover:border-emerald-500/40 hover:bg-zinc-900"
            >
              <Icono.Check className="h-4 w-4 shrink-0 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-200">
                  ¿Qué hice hoy y qué falta?
                </span>
                <span className="text-[10px] text-zinc-500">
                  Progreso, pendientes y minutos
                </span>
              </div>
            </button>

            <button
              onClick={() => void ejecutarConsulta("resumen_semana")}
              disabled={cargando}
              className="flex items-center gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3 text-left transition-all hover:border-sky-500/40 hover:bg-zinc-900"
            >
              <Icono.Calendario className="h-4 w-4 shrink-0 text-sky-400" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-200">
                  Balance Semanal
                </span>
                <span className="text-[10px] text-zinc-500">
                  Ritmo y dedicación acumulada
                </span>
              </div>
            </button>

            <button
              onClick={() => void ejecutarConsulta("ajuste_planificacion")}
              disabled={cargando}
              className="flex items-center gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3 text-left transition-all hover:border-amber-500/40 hover:bg-zinc-900"
            >
              <Icono.Target className="h-4 w-4 shrink-0 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-200">
                  Pisos Mínimos
                </span>
                <span className="text-[10px] text-zinc-500">
                  Entregables en riesgo vs al día
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Input para consulta personalizada */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="O hacé una consulta libre sobre tu jornada o prioridades..."
            value={consultaLibre}
            onChange={(e) => setConsultaLibre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && consultaLibre.trim()) {
                void ejecutarConsulta("consulta_libre", consultaLibre.trim());
              }
            }}
            className="flex-1 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] px-3.5 py-2 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
          />
          <Button
            onClick={() =>
              void ejecutarConsulta("consulta_libre", consultaLibre.trim())
            }
            disabled={!consultaLibre.trim() || cargando}
            cargando={cargando}
            className="px-4 py-2 text-xs"
          >
            Consultar
          </Button>
        </div>

        {/* Alerta de fallback si la API falló */}
        {respuesta?.advertenciaFallback && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
            <Icono.Alert className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{respuesta.advertenciaFallback}</span>
          </div>
        )}

        {/* Visor de Respuesta del Copiloto */}
        <div className="flex max-h-96 min-h-[180px] flex-col gap-2 overflow-y-auto rounded-2xl border border-[#2A2A2E] bg-[#0D0D0F] p-4">
          {cargando ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-xs text-zinc-500">
              <span className="animate-spin text-lg">⚙️</span>
              <span>
                {modoAhorro
                  ? "Extrayendo métricas de la base de datos..."
                  : "Analizando datos con Gemini..."}
              </span>
            </div>
          ) : respuesta ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">
                  Respuesta del Copiloto (
                  {new Date(respuesta.timestamp).toLocaleTimeString()})
                </span>
                <Badge
                  color={respuesta.modoUsado === "ia" ? "violet" : "emerald"}
                >
                  {respuesta.modoUsado === "ia"
                    ? "IA Gemini 2.5"
                    : "Modo Ahorro (0 Tokens)"}
                </Badge>
              </div>
              <div className="prose prose-invert max-w-none text-xs leading-relaxed whitespace-pre-line text-zinc-300">
                {respuesta.contenido}
              </div>
            </div>
          ) : (
            <div className="flex h-40 flex-col items-center justify-center gap-1 text-center text-xs text-zinc-500">
              <Icono.Target className="mb-1 h-6 w-6 text-zinc-600" />
              <span>
                Seleccioná una de las consultas rápidas arriba para ver tu
                estado.
              </span>
              <span className="text-[10px] text-zinc-600">
                Podés alternar el Modo Ahorro en cualquier momento para cuidar
                tus tokens.
              </span>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};
