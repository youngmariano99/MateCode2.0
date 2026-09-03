/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { QueueService } from "../../../../offline/services/queue.service";
import { SyncService } from "../../../../offline/services/sync.service";
import { useToast } from "../../../hooks/useToast";
import type {
  AccionManualRequerida,
  EstadoCheckpoint,
} from "../../../../domain/entidades/automatizacion-ia.entity";

interface EjecucionIAControlProps {
  proyectoId: string;
  actividad: { id: string; titulo: string };
}

const ETIQUETA_ESTADO: Record<EstadoCheckpoint, string> = {
  IDLE: "En cola para IA",
  IN_PROGRESS_AI: "🤖 Desarrollando...",
  QA_VALIDATING: "🔍 Verificando (build/lint/test)...",
  QA_RETRYING: "🔁 Reintentando tras error...",
  BLOQUEADO_ACCION_CRITICA: "⛔ Bloqueado: requiere acción manual",
  PAUSED_CHECKPOINT: "⏸️ Pausado por error",
  COMPLETED_HANDOFF: "✅ Listo para revisar",
  VERIFICADO_HUMANO: "✔️ Verificado",
};

const ESTADOS_EN_CURSO: EstadoCheckpoint[] = [
  "IDLE",
  "IN_PROGRESS_AI",
  "QA_VALIDATING",
  "QA_RETRYING",
];

export const EjecucionIAControl: React.FC<EjecucionIAControlProps> = ({
  proyectoId,
  actividad,
}) => {
  const { mostrarToast } = useToast();
  const [iterarInput, setIterarInput] = useState("");
  const [mostrarIterar, setMostrarIterar] = useState(false);

  const checkpointId = `chk_${actividad.id}`;
  const taskExecutionId = `execution_act_${actividad.id}`;

  const checkpoint = useLiveQuery(
    () => db.task_execution_checkpoints.get(checkpointId),
    [checkpointId]
  ) as any;

  const taskExecution = useLiveQuery(
    () => db.task_executions.get(taskExecutionId),
    [taskExecutionId]
  ) as any;

  const forzarSyncSilencioso = async () => {
    try {
      await SyncService.sincronizar();
    } catch {
      // Si falla, el evento queda en cola y se reintenta solo; no bloqueamos al usuario.
    }
  };

  const comenzarConIA = async () => {
    try {
      const existingExec = await db.task_executions.get(taskExecutionId);
      if (!existingExec) {
        const nuevaExecucion = {
          id: taskExecutionId,
          proyectoId,
          actividadId: actividad.id,
          titulo: actividad.titulo,
          estado: "IN_PROGRESS",
          fechaInicio: Date.now(),
          metadata: { handoffs: {}, iterations: [], bugs: [] },
        };
        await db.task_executions.put(nuevaExecucion);
        await QueueService.encolar(
          "task_executions",
          "crear",
          taskExecutionId,
          nuevaExecucion
        );
      }
      await db.tareas.update(actividad.id, { estado: "in_progress" });
      await QueueService.encolar("tareas", "editar", actividad.id, {
        id: actividad.id,
        estado: "in_progress",
      });

      const nuevoCheckpoint = {
        id: checkpointId,
        taskExecutionId,
        actividadId: actividad.id,
        proyectoId,
        estadoCheckpoint: "IDLE" as EstadoCheckpoint,
        reintentosFallidos: 0,
        accionesManualesModeradas: [] as AccionManualRequerida[],
        accionesManualesCriticas: [] as AccionManualRequerida[],
        actualizadoEn: Date.now(),
      };
      await db.task_execution_checkpoints.put(nuevoCheckpoint as any);
      await QueueService.encolar(
        "task_execution_checkpoints",
        "crear",
        checkpointId,
        nuevoCheckpoint
      );

      await forzarSyncSilencioso();
      mostrarToast(
        `Ticket enviado a la IA. El runner local lo va a recoger en su próximo ciclo.`,
        "exito"
      );
    } catch (err: any) {
      mostrarToast(
        `Error al iniciar ejecución con IA: ${err.message}`,
        "error"
      );
    }
  };

  const reintentarConIA = async () => {
    try {
      await db.task_execution_checkpoints.update(checkpointId, {
        estadoCheckpoint: "IDLE",
        reintentosFallidos: 0,
      } as any);
      await QueueService.encolar(
        "task_execution_checkpoints",
        "editar",
        checkpointId,
        {
          id: checkpointId,
          estadoCheckpoint: "IDLE",
          reintentosFallidos: 0,
        }
      );
      await forzarSyncSilencioso();
      mostrarToast("Reintento enviado a la IA.", "exito");
    } catch (err: any) {
      mostrarToast(`Error al reintentar: ${err.message}`, "error");
    }
  };

  const marcarVerificado = async () => {
    try {
      await db.task_execution_checkpoints.update(checkpointId, {
        estadoCheckpoint: "VERIFICADO_HUMANO",
      } as any);
      await db.tareas.update(actividad.id, { estado: "completado" });
      await QueueService.encolar(
        "task_execution_checkpoints",
        "editar",
        checkpointId,
        {
          id: checkpointId,
          estadoCheckpoint: "VERIFICADO_HUMANO",
        }
      );
      await QueueService.encolar("tareas", "editar", actividad.id, {
        id: actividad.id,
        estado: "completado",
      });
      await forzarSyncSilencioso();
      mostrarToast(
        `Ticket "${actividad.titulo}" verificado y completado.`,
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al marcar verificado: ${err.message}`, "error");
    }
  };

  const enviarIteracion = async () => {
    if (!iterarInput.trim()) {
      mostrarToast("Escribí qué querés que cambie antes de reiterar.", "error");
      return;
    }
    try {
      const exec = await db.task_executions.get(taskExecutionId);
      const meta = (exec?.metadata as any) || {};
      const iteracionesPrevias = meta.iterations?.default || [];
      const metaActualizada = {
        ...meta,
        iterations: {
          ...(meta.iterations || {}),
          default: [
            ...iteracionesPrevias,
            {
              fecha: new Date().toLocaleTimeString(),
              feedback: iterarInput.trim(),
            },
          ],
        },
      };
      await db.task_executions.update(taskExecutionId, {
        metadata: metaActualizada,
      });
      await QueueService.encolar("task_executions", "editar", taskExecutionId, {
        id: taskExecutionId,
        metadata: metaActualizada,
      });

      await db.task_execution_checkpoints.update(checkpointId, {
        estadoCheckpoint: "IDLE",
        reintentosFallidos: 0,
      } as any);
      await QueueService.encolar(
        "task_execution_checkpoints",
        "editar",
        checkpointId,
        {
          id: checkpointId,
          estadoCheckpoint: "IDLE",
          reintentosFallidos: 0,
        }
      );

      await forzarSyncSilencioso();
      setIterarInput("");
      setMostrarIterar(false);
      mostrarToast("Pedido de iteración enviado a la IA.", "exito");
    } catch (err: any) {
      mostrarToast(`Error al enviar la iteración: ${err.message}`, "error");
    }
  };

  const resumenTecnico =
    taskExecution?.metadata?.handoffs?.default?.resumen_tecnico;
  const estado: EstadoCheckpoint | undefined = checkpoint?.estadoCheckpoint;

  if (!checkpoint) {
    return (
      <button
        type="button"
        onClick={comenzarConIA}
        className="mt-1 flex items-center justify-center gap-1 rounded border border-violet-500/25 bg-violet-500/10 py-1 font-mono text-[8px] font-bold text-violet-400 uppercase transition-all hover:bg-violet-500/20"
      >
        🚀 Comenzar ticket con IA
      </button>
    );
  }

  return (
    <div className="mt-1 flex flex-col gap-1.5 rounded border border-zinc-800 bg-zinc-950/60 p-2">
      <span
        className={`font-mono text-[8px] font-bold uppercase ${
          estado === "BLOQUEADO_ACCION_CRITICA" ||
          estado === "PAUSED_CHECKPOINT"
            ? "text-red-400"
            : estado === "COMPLETED_HANDOFF"
              ? "text-emerald-400"
              : estado === "VERIFICADO_HUMANO"
                ? "text-emerald-500"
                : "text-amber-400"
        }`}
      >
        {estado ? ETIQUETA_ESTADO[estado] : "Estado desconocido"}
      </span>

      {estado && ESTADOS_EN_CURSO.includes(estado) && (
        <span className="font-mono text-[7px] text-zinc-500">
          Reintentos: {checkpoint.reintentosFallidos ?? 0}
        </span>
      )}

      {(estado === "PAUSED_CHECKPOINT" ||
        estado === "BLOQUEADO_ACCION_CRITICA") && (
        <>
          {checkpoint.ultimoErrorLogs && (
            <pre className="max-h-24 overflow-y-auto rounded bg-black/40 p-1.5 font-mono text-[7px] whitespace-pre-wrap text-red-300">
              {checkpoint.ultimoErrorLogs}
            </pre>
          )}
          {(checkpoint.accionesManualesCriticas || []).map(
            (a: AccionManualRequerida, idx: number) => (
              <span key={idx} className="font-mono text-[7px] text-red-300">
                ⛔ {a.descripcion}
              </span>
            )
          )}
          <button
            type="button"
            onClick={reintentarConIA}
            className="rounded border border-amber-500/25 bg-amber-500/10 py-1 font-mono text-[8px] font-bold text-amber-400 uppercase hover:bg-amber-500/20"
          >
            ⚠️ Reintentar con IA
          </button>
        </>
      )}

      {estado === "COMPLETED_HANDOFF" && (
        <>
          {resumenTecnico && (
            <div className="rounded bg-black/30 p-1.5">
              <span className="block font-mono text-[7px] font-bold text-zinc-500 uppercase">
                Resumen técnico
              </span>
              <p className="font-mono text-[8px] text-zinc-300">
                {resumenTecnico}
              </p>
            </div>
          )}
          {checkpoint.resumenNegocio && (
            <div className="rounded bg-black/30 p-1.5">
              <span className="block font-mono text-[7px] font-bold text-zinc-500 uppercase">
                Qué se resolvió (en simple)
              </span>
              <p className="font-mono text-[8px] text-zinc-300">
                {checkpoint.resumenNegocio}
              </p>
            </div>
          )}
          {checkpoint.guiaPruebasManual && (
            <div className="rounded bg-black/30 p-1.5">
              <span className="block font-mono text-[7px] font-bold text-zinc-500 uppercase">
                Cómo probarlo
              </span>
              <ol className="ml-3 list-decimal font-mono text-[8px] text-zinc-300">
                {checkpoint.guiaPruebasManual.pasos?.map(
                  (p: string, i: number) => (
                    <li key={i}>{p}</li>
                  )
                )}
              </ol>
              {checkpoint.guiaPruebasManual.datosPrueba && (
                <p className="mt-1 font-mono text-[7px] text-zinc-400">
                  Datos de prueba: {checkpoint.guiaPruebasManual.datosPrueba}
                </p>
              )}
            </div>
          )}
          {(checkpoint.accionesManualesModeradas || []).length > 0 && (
            <div className="rounded bg-amber-500/5 p-1.5">
              <span className="block font-mono text-[7px] font-bold text-amber-400 uppercase">
                Pendiente (no bloquea)
              </span>
              {checkpoint.accionesManualesModeradas.map(
                (a: AccionManualRequerida, idx: number) => (
                  <span
                    key={idx}
                    className="block font-mono text-[7px] text-amber-300"
                  >
                    • {a.descripcion}
                  </span>
                )
              )}
            </div>
          )}

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={marcarVerificado}
              className="flex-1 rounded border border-emerald-500/25 bg-emerald-500/10 py-1 font-mono text-[8px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
            >
              ✅ Verificado
            </button>
            <button
              type="button"
              onClick={() => setMostrarIterar((v) => !v)}
              className="flex-1 rounded border border-sky-500/25 bg-sky-500/10 py-1 font-mono text-[8px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
            >
              🔁 Iterar con IA
            </button>
          </div>

          {mostrarIterar && (
            <div className="flex flex-col gap-1">
              <textarea
                value={iterarInput}
                onChange={(e) => setIterarInput(e.target.value)}
                placeholder="Qué querés que cambie..."
                rows={2}
                className="w-full rounded border border-zinc-800 bg-zinc-950 p-1.5 font-mono text-[8px] text-zinc-200 outline-none"
              />
              <button
                type="button"
                onClick={enviarIteracion}
                className="self-end rounded bg-sky-500 px-2 py-1 font-mono text-[8px] font-bold text-zinc-950 uppercase hover:bg-sky-400"
              >
                REITERAR con IA
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
