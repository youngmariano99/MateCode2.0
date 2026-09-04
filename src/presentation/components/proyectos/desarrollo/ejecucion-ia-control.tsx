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
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

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
      // actualizadoEn se pisa acá A PROPÓSITO: el pull automático (cada 10s)
      // compara esta fecha contra la del servidor para no sobreescribir una
      // acción local recién hecha con un estado remoto todavía viejo — sin
      // esto, el cambio podía "volver atrás" solo un instante después.
      const actualizadoEn = Date.now();
      await db.task_execution_checkpoints.update(checkpointId, {
        estadoCheckpoint: "IDLE",
        reintentosFallidos: 0,
        actualizadoEn,
      } as any);
      await QueueService.encolar(
        "task_execution_checkpoints",
        "editar",
        checkpointId,
        {
          id: checkpointId,
          estadoCheckpoint: "IDLE",
          reintentosFallidos: 0,
          actualizadoEn,
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
      const actualizadoEn = Date.now();
      await db.task_execution_checkpoints.update(checkpointId, {
        estadoCheckpoint: "VERIFICADO_HUMANO",
        actualizadoEn,
      } as any);
      await db.tareas.update(actividad.id, {
        estado: "completado",
        actualizadoEn,
      });
      await QueueService.encolar(
        "task_execution_checkpoints",
        "editar",
        checkpointId,
        {
          id: checkpointId,
          estadoCheckpoint: "VERIFICADO_HUMANO",
          actualizadoEn,
        }
      );
      await QueueService.encolar("tareas", "editar", actividad.id, {
        id: actividad.id,
        estado: "completado",
        actualizadoEn,
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

      const actualizadoEn = Date.now();
      await db.task_execution_checkpoints.update(checkpointId, {
        estadoCheckpoint: "IDLE",
        reintentosFallidos: 0,
        actualizadoEn,
      } as any);
      await QueueService.encolar(
        "task_execution_checkpoints",
        "editar",
        checkpointId,
        {
          id: checkpointId,
          estadoCheckpoint: "IDLE",
          reintentosFallidos: 0,
          actualizadoEn,
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
          <div className="flex items-center gap-1.5">
            {checkpoint.prEstado === "creado" && checkpoint.prUrl && (
              <a
                href={checkpoint.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate rounded border border-emerald-500/25 bg-emerald-500/10 py-1 text-center font-mono text-[8px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
              >
                🔗 Ver PR
              </a>
            )}
            {checkpoint.ciEstado === "paso" && (
              <span className="rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-1 font-mono text-[7px] font-bold text-emerald-400 uppercase">
                CI ✓
              </span>
            )}
            {checkpoint.ciEstado === "fallo" && (
              <span className="rounded border border-red-500/25 bg-red-500/10 px-1.5 py-1 font-mono text-[7px] font-bold text-red-400 uppercase">
                CI ✗
              </span>
            )}
          </div>

          {checkpoint.prEstado === "fallido" && (
            <div className="rounded bg-amber-500/5 p-1.5">
              <span className="block font-mono text-[7px] font-bold text-amber-400 uppercase">
                No se pudo crear el PR automáticamente
              </span>
              <p className="font-mono text-[7px] text-amber-300">
                {checkpoint.prError || "Error desconocido."} El diff sigue en el
                repo local para commitear/pushear a mano.
              </p>
            </div>
          )}

          {/* Vista compacta: 1 línea truncada + botón para el detalle completo,
              para que un resumen largo no empuje la tarjeta del Kanban hacia abajo. */}
          {resumenTecnico && (
            <p className="line-clamp-2 font-mono text-[8px] leading-snug text-zinc-400">
              {resumenTecnico}
            </p>
          )}

          <button
            type="button"
            onClick={() => setMostrarDetalle(true)}
            className="rounded border border-zinc-700 bg-zinc-900 py-1 font-mono text-[8px] font-bold text-zinc-300 uppercase hover:bg-zinc-800"
          >
            🔎 Ver detalle completo
          </button>

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

      {mostrarDetalle && (
        <div
          className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm duration-200"
          onClick={() => setMostrarDetalle(false)}
        >
          <div
            className="max-h-[85vh] w-[560px] max-w-full overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-5 font-mono shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="text-[10px] font-bold text-zinc-200 uppercase">
                {actividad.titulo}
              </span>
              <button
                onClick={() => setMostrarDetalle(false)}
                className="text-[9px] text-zinc-500 uppercase hover:text-zinc-300"
              >
                Cerrar
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {checkpoint.prUrl && (
                <a
                  href={checkpoint.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-emerald-500/25 bg-emerald-500/10 py-1.5 text-center text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
                >
                  🔗 Ver Pull Request
                </a>
              )}

              {(checkpoint.desviosDelPlan || []).length > 0 && (
                <div className="rounded border border-amber-500/20 bg-amber-500/5 p-2">
                  <span className="mb-1 block text-[8px] font-bold text-amber-400 uppercase">
                    ⚠️ Decisiones que difieren del ticket
                  </span>
                  {checkpoint.desviosDelPlan.map((d: any, idx: number) => (
                    <div
                      key={idx}
                      className="mb-1.5 border-b border-amber-500/10 pb-1.5 text-[9px] leading-relaxed text-amber-200 last:mb-0 last:border-none last:pb-0"
                    >
                      <p>
                        <span className="text-amber-400">Pedía:</span>{" "}
                        {d.loQuePediaElTicket}
                      </p>
                      <p>
                        <span className="text-amber-400">Se hizo:</span>{" "}
                        {d.loQueSeHizo}
                      </p>
                      <p>
                        <span className="text-amber-400">Motivo:</span>{" "}
                        {d.motivo}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {resumenTecnico && (
                <div>
                  <span className="mb-1 block text-[8px] font-bold text-zinc-500 uppercase">
                    Resumen técnico
                  </span>
                  <p className="text-[9px] leading-relaxed text-zinc-300">
                    {resumenTecnico}
                  </p>
                </div>
              )}

              {checkpoint.resumenNegocio && (
                <div>
                  <span className="mb-1 block text-[8px] font-bold text-zinc-500 uppercase">
                    Qué se resolvió (en simple)
                  </span>
                  <p className="text-[9px] leading-relaxed text-zinc-300">
                    {checkpoint.resumenNegocio}
                  </p>
                </div>
              )}

              {checkpoint.guiaPruebasManual && (
                <div className="rounded border border-zinc-900 bg-black/30 p-2">
                  <span className="mb-1 block text-[8px] font-bold text-zinc-500 uppercase">
                    Cómo probarlo
                  </span>
                  {(checkpoint.guiaPruebasManual.prerequisitos || []).length >
                    0 && (
                    <div className="mb-1.5">
                      <span className="text-[8px] font-bold text-zinc-400 uppercase">
                        Prerequisitos
                      </span>
                      <ul className="ml-3 list-disc text-[9px] text-zinc-300">
                        {checkpoint.guiaPruebasManual.prerequisitos.map(
                          (p: string, i: number) => (
                            <li key={i}>{p}</li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                  <span className="text-[8px] font-bold text-zinc-400 uppercase">
                    Pasos
                  </span>
                  <ol className="ml-3 list-decimal text-[9px] text-zinc-300">
                    {checkpoint.guiaPruebasManual.pasos?.map(
                      (p: string, i: number) => (
                        <li key={i}>{p}</li>
                      )
                    )}
                  </ol>
                  {checkpoint.guiaPruebasManual.datosPrueba && (
                    <p className="mt-1.5 text-[8px] text-zinc-400">
                      <span className="font-bold uppercase">
                        Datos de prueba:
                      </span>{" "}
                      {checkpoint.guiaPruebasManual.datosPrueba}
                    </p>
                  )}
                  {checkpoint.guiaPruebasManual.resultadoEsperado && (
                    <div className="mt-1.5 rounded bg-emerald-500/5 p-1.5">
                      <span className="block text-[8px] font-bold text-emerald-400 uppercase">
                        Resultado esperado
                      </span>
                      <p className="text-[9px] text-zinc-300">
                        {
                          checkpoint.guiaPruebasManual.resultadoEsperado
                            .descripcion
                        }
                      </p>
                      {checkpoint.guiaPruebasManual.resultadoEsperado
                        .mensajeVisible && (
                        <p className="text-[8px] text-zinc-400">
                          Mensaje visible: &quot;
                          {
                            checkpoint.guiaPruebasManual.resultadoEsperado
                              .mensajeVisible
                          }
                          &quot;
                        </p>
                      )}
                      {checkpoint.guiaPruebasManual.resultadoEsperado
                        .dondeVerificar && (
                        <p className="text-[8px] text-zinc-400">
                          Dónde verificar:{" "}
                          {
                            checkpoint.guiaPruebasManual.resultadoEsperado
                              .dondeVerificar
                          }
                        </p>
                      )}
                      {checkpoint.guiaPruebasManual.resultadoEsperado
                        .codigoHttpEsperado && (
                        <p className="text-[8px] text-zinc-400">
                          Código HTTP esperado:{" "}
                          {
                            checkpoint.guiaPruebasManual.resultadoEsperado
                              .codigoHttpEsperado
                          }
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {checkpoint.archivoPruebaPath && (
                <p className="text-[8px] text-zinc-400">
                  📄 Guía de pruebas detallada en el repo:{" "}
                  <code className="text-zinc-300">
                    {checkpoint.archivoPruebaPath}
                  </code>
                </p>
              )}

              {(checkpoint.accionesManualesModeradas || []).length > 0 && (
                <div className="rounded border border-amber-500/20 bg-amber-500/5 p-2">
                  <span className="mb-1 block text-[8px] font-bold text-amber-400 uppercase">
                    Pendiente (no bloquea)
                  </span>
                  {checkpoint.accionesManualesModeradas.map(
                    (a: AccionManualRequerida, idx: number) => (
                      <span
                        key={idx}
                        className="block text-[9px] text-amber-300"
                      >
                        • {a.descripcion}
                      </span>
                    )
                  )}
                </div>
              )}

              {checkpoint.ciEstado && checkpoint.ciEstado !== "sin_ci" && (
                <div>
                  <span className="mb-1 block text-[8px] font-bold text-zinc-500 uppercase">
                    Estado de CI
                  </span>
                  <p
                    className={`text-[9px] ${checkpoint.ciEstado === "paso" ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {checkpoint.ciEstado === "paso"
                      ? "✓ Los checks del PR pasaron."
                      : `✗ Los checks del PR no pasaron. ${checkpoint.ciDetalle || ""}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
