/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";

interface ConveyorBeltFocusViewProps {
  isOpen: boolean;
  onClose: () => void;
  selectedHistoriaCinta: any;
  selectedActividadCinta?: any;
  activeCintaExecution: any;
  focusedSprint: any;
  cintaHandoffInput: string;
  setCintaHandoffInput: (val: string) => void;
  detectedDocUpdates: any;
  handleAplicarActualizacionesDocs: () => void;
  cintaIterationFeedback: string;
  setCintaIterationFeedback: (val: string) => void;
  cintaBugLogs: string;
  setCintaBugLogs: (val: string) => void;
  cintaBugExpected: string;
  setCintaBugExpected: (val: string) => void;
  cintaBugReal: string;
  setCintaBugReal: (val: string) => void;
  avanzarEstacionCinta: (estacion: string, handoff: string) => void;
  registrarIteracionEstacion: (estacion: string, feedback: string) => void;
  registrarBugEstacion: (
    estacion: string,
    logs: string,
    expected: string,
    real: string
  ) => void;
  resolverBugEstacion: (estacion: string) => void;
  completarCerrarActividad?: (id: string) => void;
  promptMagro: string;
  mostrarToast: (msg: string, tipo: "exito" | "error" | "info") => void;
  isCicdModalOpen: boolean;
  setIsCicdModalOpen: (open: boolean) => void;
}

export const ConveyorBeltFocusView: React.FC<ConveyorBeltFocusViewProps> = ({
  isOpen,
  onClose,
  selectedHistoriaCinta,
  selectedActividadCinta,
  activeCintaExecution,
  focusedSprint,
  cintaHandoffInput,
  setCintaHandoffInput,
  detectedDocUpdates,
  handleAplicarActualizacionesDocs,
  cintaIterationFeedback,
  setCintaIterationFeedback,
  cintaBugLogs,
  setCintaBugLogs,
  cintaBugExpected,
  setCintaBugExpected,
  cintaBugReal,
  setCintaBugReal,
  avanzarEstacionCinta,
  registrarIteracionEstacion,
  registrarBugEstacion,
  resolverBugEstacion,
  completarCerrarActividad,
  promptMagro,
  mostrarToast,
  isCicdModalOpen,
  setIsCicdModalOpen,
}) => {
  if (!isOpen) return null;
  if (!selectedHistoriaCinta && !selectedActividadCinta) return null;
  if (!activeCintaExecution) return null;

  const isActividadMode = !!selectedActividadCinta;
  const currentItem = isActividadMode
    ? selectedActividadCinta
    : selectedHistoriaCinta;

  const meta = activeCintaExecution.metadata || {};
  const pipeline = meta.pipeline || [];
  const activeIdx = meta.activeStationIndex || 0;

  // Under activity focus mode, the "station" is represented by a default key
  const activeStation = isActividadMode
    ? "default"
    : pipeline[activeIdx] || "QA";

  const shortId = isActividadMode
    ? `act-${currentItem.id.split("_").pop() || "act"}`
    : `hu-${currentItem.id.split("_").pop() || "hu"}`;

  const cleanTitle = currentItem.titulo
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const branchName = `feature/mc-${shortId}-${cleanTitle}`;

  // Extract history
  const allHandoffs = Object.entries(meta.handoffs || {}) as Array<
    [string, any]
  >;
  const stationIterations = meta.iterations?.[activeStation] || [];
  const stationBugs = meta.bugs?.[activeStation] || [];
  const activeBug = stationBugs.find((b: any) => !b.resuelto);

  return (
    <div className="animate-in fade-in fixed inset-0 z-40 flex flex-col overflow-y-auto bg-zinc-950 p-6 duration-300">
      {/* Top Header Row */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-zinc-900 pb-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-mono text-[8px] font-bold text-emerald-400 uppercase">
              MODO ENFOQUE ACTIVO
            </span>
            {focusedSprint && (
              <span className="font-mono text-[9px] text-zinc-500">
                Sprint: {focusedSprint.nombre}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <h2 className="font-mono text-sm font-bold text-zinc-200 uppercase">
              {isActividadMode ? "Actividad" : "Cinta"}: mc-{shortId} —{" "}
              {currentItem.titulo}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-350 hover:bg-zinc-850 rounded border border-zinc-800 bg-zinc-900 px-3.5 py-1.5 font-mono text-[9px] font-bold uppercase transition-all hover:text-zinc-100"
        >
          ⬅ Volver al Tablero
        </button>
      </div>

      {/* Conveyor Belt Ribbon (Hide for Activity focus mode) */}
      {!isActividadMode && (
        <div className="mb-6 flex items-center justify-center gap-2 rounded-xl border border-zinc-900 bg-zinc-950/40 p-4">
          {pipeline.map((st: string, idx: number) => {
            const isCompleted = idx < activeIdx;
            const isActive = idx === activeIdx;

            let stateClass = "border-zinc-800 bg-zinc-900 text-zinc-500";
            if (isActive)
              stateClass =
                "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 ring-2 ring-emerald-500/10 animate-pulse";
            if (isCompleted)
              stateClass = "border-sky-500/30 bg-sky-500/10 text-sky-400";

            return (
              <React.Fragment key={st}>
                <div
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-[10px] font-bold uppercase transition-all ${stateClass}`}
                >
                  {isCompleted ? "✓ " : ""}
                  {st}
                </div>
                {idx < pipeline.length - 1 && (
                  <span className="text-xs text-zinc-700">➔</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Workstation Workspace split */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        {/* Left Column (Prompt & Code) */}
        <div className="flex flex-col gap-4 xl:col-span-7">
          <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-4">
            <div className="mb-3 flex items-center justify-between border-b border-zinc-900 pb-2">
              <div>
                <span className="font-mono text-[10px] font-bold text-zinc-200 uppercase">
                  📋 Prompt de la{" "}
                  {isActividadMode ? "Actividad" : `Estación: ${activeStation}`}
                </span>
                <p className="mt-0.5 font-mono text-[8px] text-zinc-500">
                  XML limpio con contexto local e instrucciones para alimentar a
                  la IA
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(promptMagro);
                  mostrarToast(
                    isActividadMode
                      ? "Prompt de actividad copiado."
                      : `Prompt de la estación ${activeStation} copiado.`,
                    "exito"
                  );
                }}
                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
              >
                📋 Copiar Prompt
              </button>
            </div>

            <textarea
              readOnly
              value={promptMagro}
              rows={12}
              className="w-full rounded border border-zinc-900 bg-zinc-900/30 p-3 font-mono text-[10px] text-zinc-400 outline-none select-all"
            />
          </div>

          {/* Handoff Submission Box */}
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-900 bg-zinc-950/60 p-4">
            <div>
              <span className="font-mono text-[10px] font-bold text-zinc-200 uppercase">
                📥 Registrar Handoff {isActividadMode ? "" : "& Avanzar"}
              </span>
              <p className="mt-0.5 font-mono text-[8px] text-zinc-500">
                {isActividadMode
                  ? "Pega la salida JSON entregada por la IA para poner la actividad en revisión."
                  : "Pega la salida JSON entregada por la IA para pasar el contexto a la siguiente estación."}
              </p>
            </div>

            <textarea
              value={cintaHandoffInput}
              onChange={(e) => setCintaHandoffInput(e.target.value)}
              placeholder='Ej: {"handoff": {"archivos_creados_o_modificados": [...], "firmas_o_contratos_exportados": [...], "resumen_tecnico": "..."}}'
              rows={4}
              className="w-full rounded border border-zinc-900 bg-zinc-900 p-2 font-mono text-[10px] text-zinc-300 outline-none focus:border-emerald-500/40"
            />

            {detectedDocUpdates && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 font-mono">
                <div className="min-w-0 flex-1">
                  <span className="block text-[9px] font-bold text-emerald-400 uppercase">
                    🔄 Actualizaciones de Documentación Detectadas
                  </span>
                  <span className="mt-1 block font-mono text-[8px] leading-normal text-zinc-400">
                    La IA sugiere cambios para:{" "}
                    {Object.keys(detectedDocUpdates)
                      .map((k) => `${k.toUpperCase()}.md`)
                      .join(", ")}
                    .
                  </span>
                </div>
                <button
                  onClick={handleAplicarActualizacionesDocs}
                  className="shrink-0 rounded bg-emerald-500 px-2.5 py-1.5 font-mono text-[8px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400"
                >
                  Aplicar y Sincronizar
                </button>
              </div>
            )}

            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-zinc-650 font-mono text-[8px]">
                * El JSON se usará para auditar la entrega y registrar los
                cambios técnicos de la actividad.
              </span>

              {isActividadMode ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      avanzarEstacionCinta("default", cintaHandoffInput);
                      setCintaHandoffInput("");
                    }}
                    disabled={!cintaHandoffInput.trim()}
                    className="rounded bg-emerald-500 px-4 py-2 font-mono text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400 disabled:opacity-40"
                  >
                    💾 Guardar Handoff
                  </button>
                  {completarCerrarActividad &&
                    (currentItem.estado === "in_revision" ||
                      currentItem.estado === "review") && (
                      <button
                        onClick={() => completarCerrarActividad(currentItem.id)}
                        className="rounded bg-sky-500 px-4 py-2 font-mono text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-sky-400"
                      >
                        🏁 Completar y Cerrar Ticket
                      </button>
                    )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    avanzarEstacionCinta(activeStation, cintaHandoffInput);
                    setCintaHandoffInput("");
                  }}
                  disabled={!cintaHandoffInput.trim()}
                  className="rounded bg-emerald-500 px-4 py-2 font-mono text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400 disabled:opacity-40"
                >
                  Sincronizar y Avanzar ➔
                </button>
              )}
            </div>
          </div>

          {/* Git Flow of closing (Only if QA or in activity in-revision/completado) */}
          {(!isActividadMode && activeStation === "QA") ||
          (isActividadMode &&
            (currentItem.estado === "in_revision" ||
              currentItem.estado === "completado")) ? (
            <div className="flex flex-col gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
              <div>
                <span className="font-mono text-[10px] font-bold text-sky-400 uppercase">
                  🚀 Git Flow de Cierre & CI/CD
                </span>
                <p className="mt-0.5 font-mono text-[8px] text-zinc-500">
                  Comandos sugeridos para integrar los cambios del ticket en la
                  rama principal.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded border border-zinc-900 bg-zinc-950 p-2.5">
                <code className="text-zinc-450 font-mono text-[9px] break-all select-all">
                  {`git add . && git commit -m "feat(mc-${shortId}): implementa ${currentItem.titulo.toLowerCase().replace(/"/g, "")}" && git checkout main && git merge ${branchName} && git push origin main`}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `git add .\ngit commit -m "feat(mc-${shortId}): implementa ${currentItem.titulo}"\ngit checkout main\ngit merge ${branchName}\ngit push origin main`
                    );
                    mostrarToast(
                      "Comandos Git copiados al portapapeles.",
                      "exito"
                    );
                  }}
                  className="shrink-0 rounded border border-sky-500/20 bg-sky-500/10 px-2.5 py-1.5 font-mono text-[8px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
                >
                  📋 Copiar Git
                </button>
              </div>

              <button
                onClick={() => setIsCicdModalOpen(true)}
                className="w-full rounded border border-sky-500/20 bg-sky-500/10 py-1.5 text-center font-mono text-[9px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
              >
                🛠️ Configurar GitHub Actions Workflow (CI/CD)
              </button>
            </div>
          ) : null}
        </div>

        {/* Right Column (Instructions, Iterations, Bugs) */}
        <div className="flex flex-col gap-4 xl:col-span-5">
          {/* Acceptance criteria / Context */}
          <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-4">
            <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              🎯{" "}
              {isActividadMode
                ? "Detalle de Actividad"
                : "Criterios de Aceptación HU"}
            </span>
            <div className="mt-2 max-h-[80px] overflow-y-auto pr-1 font-mono text-[10px] leading-relaxed text-zinc-300">
              {isActividadMode ? (
                <div className="flex flex-col gap-2">
                  <span>{currentItem.titulo}</span>
                  {currentItem.pasos && currentItem.pasos.length > 0 && (
                    <div className="mt-1">
                      <span className="block text-[8px] font-bold text-zinc-500 uppercase">
                        Pasos:
                      </span>
                      {currentItem.pasos.map((p: string, idx: number) => (
                        <div key={idx} className="text-zinc-400">
                          • {p}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                currentItem.descripcion || "No hay descripción adicional."
              )}
            </div>
          </div>

          {/* Iterations channel */}
          <div className="flex flex-col gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 font-mono">
            <span className="text-[10px] font-bold text-sky-400 uppercase">
              🔄 Carril de Iteraciones ({stationIterations.length})
            </span>
            <p className="text-zinc-550 text-[8px]">
              Registra feedback para que la IA refine o ajuste detalles del
              código generado.
            </p>

            <textarea
              value={cintaIterationFeedback}
              onChange={(e) => setCintaIterationFeedback(e.target.value)}
              placeholder="Describe los ajustes requeridos sobre el código generado..."
              rows={2}
              className="w-full rounded border border-zinc-900 bg-zinc-950 p-2 text-[10px] text-zinc-200 outline-none focus:border-sky-500/40"
            />

            <div className="mt-1 flex justify-end gap-2">
              <button
                onClick={() => {
                  registrarIteracionEstacion(
                    activeStation,
                    cintaIterationFeedback
                  );
                  setCintaIterationFeedback("");
                }}
                disabled={!cintaIterationFeedback.trim()}
                className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[9px] font-bold text-zinc-300 uppercase transition-all hover:bg-zinc-800 disabled:opacity-40"
              >
                + Guardar Iteración
              </button>
              <button
                onClick={() => {
                  if (!cintaIterationFeedback.trim()) {
                    mostrarToast("Escribe tus ajustes primero.", "error");
                    return;
                  }
                  const p = `ROL: Desarrollador Senior\n\nTICKET: mc-${shortId} (${isActividadMode ? "Actividad" : activeStation})\n\nAJUSTES:\n${cintaIterationFeedback.trim()}\n\nAplica los ajustes indicados manteniendo consistencia con el código actual.\nDevuelve el código completo y el bloque JSON de handoff.`;
                  navigator.clipboard.writeText(p);
                  mostrarToast("Prompt de refinamiento copiado.", "exito");
                }}
                className="rounded bg-sky-500 px-3 py-1.5 text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-sky-400"
              >
                Copiar Prompt Refinamiento
              </button>
            </div>

            {stationIterations.length > 0 && (
              <div className="mt-2 flex max-h-[120px] flex-col gap-1.5 overflow-y-auto border-t border-sky-500/20 pt-2 pr-1">
                {stationIterations.map((it: any, idx: number) => (
                  <div
                    key={idx}
                    className="rounded border border-zinc-900 bg-zinc-950 p-2 text-[9px] text-zinc-300"
                  >
                    <span className="font-bold text-sky-400">
                      [{it.fecha} - {it.version || `v${idx + 1}`}]:
                    </span>{" "}
                    {it.feedback}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bugs logger channel */}
          <div className="flex flex-col gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4 font-mono">
            <span className="text-[10px] font-bold text-red-400 uppercase">
              🐛 Carril de Errores & Bugs ({stationBugs.length})
            </span>

            {activeBug ? (
              <div className="flex flex-col gap-2">
                <div className="rounded border border-red-500/10 bg-zinc-950 p-2.5 text-[9px]">
                  <span className="mb-1 block font-bold text-red-400">
                    LOGS DEL ERROR:
                  </span>
                  <pre className="max-h-[80px] overflow-y-auto font-mono break-all whitespace-pre-wrap text-zinc-400 select-text">
                    {activeBug.logs}
                  </pre>
                  {activeBug.comportamientoEsperado && (
                    <div className="text-zinc-350 mt-2">
                      <span className="text-zinc-550 font-bold">Esperado:</span>{" "}
                      {activeBug.comportamientoEsperado}
                    </div>
                  )}
                  {activeBug.comportamientoReal && (
                    <div className="text-zinc-350 mt-1">
                      <span className="text-zinc-550 font-bold">Obtenido:</span>{" "}
                      {activeBug.comportamientoReal}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      const p = `ROL: Senior Debugger\n\nERROR EN TICKET: mc-${shortId}\n\nLOGS:\n${activeBug.logs}\n\nAnaliza y soluciona el crash de arriba en feature/mc-${shortId}. Asegura no romper contratos previos.\nDevuelve el código completo y el bloque JSON de handoff.`;
                      navigator.clipboard.writeText(p);
                      mostrarToast(
                        "Prompt de depuración de bug copiado.",
                        "exito"
                      );
                    }}
                    className="rounded bg-red-500 px-3.5 py-1.5 text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-red-400"
                  >
                    Copiar Prompt Bug
                  </button>
                  <button
                    onClick={() => resolverBugEstacion(activeStation)}
                    className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[9px] font-bold text-zinc-300 uppercase transition-all hover:bg-zinc-800"
                  >
                    Resolver Bug
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-zinc-550 text-[8px]">
                  Si el código generado produce algún crash o error en
                  terminal/consola, repórtalo aquí.
                </p>
                <textarea
                  value={cintaBugLogs}
                  onChange={(e) => setCintaBugLogs(e.target.value)}
                  placeholder="Pega aquí el crash stacktrace o logs del error..."
                  rows={2}
                  className="w-full rounded border border-zinc-900 bg-zinc-950 p-2 font-mono text-[10px] text-zinc-200 outline-none focus:border-red-500/40"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={cintaBugExpected}
                    onChange={(e) => setCintaBugExpected(e.target.value)}
                    placeholder="Esperado..."
                    className="rounded border border-zinc-900 bg-zinc-950 p-1.5 text-[9px] text-zinc-200 outline-none"
                  />
                  <input
                    type="text"
                    value={cintaBugReal}
                    onChange={(e) => setCintaBugReal(e.target.value)}
                    placeholder="Obtenido..."
                    className="rounded border border-zinc-900 bg-zinc-950 p-1.5 text-[9px] text-zinc-200 outline-none"
                  />
                </div>
                <button
                  onClick={() => {
                    registrarBugEstacion(
                      activeStation,
                      cintaBugLogs,
                      cintaBugExpected,
                      cintaBugReal
                    );
                    setCintaBugLogs("");
                    setCintaBugExpected("");
                    setCintaBugReal("");
                  }}
                  disabled={!cintaBugLogs.trim()}
                  className="self-end rounded border border-red-500/20 bg-red-500/10 px-3.5 py-1.5 text-[9px] font-bold text-red-400 uppercase transition-all hover:bg-red-500/20 disabled:opacity-40"
                >
                  Reportar Bug
                </button>
              </div>
            )}

            {stationBugs.length > 0 && (
              <div className="mt-1.5 flex max-h-[100px] flex-col gap-1 overflow-y-auto border-t border-red-500/10 pt-2 pr-1">
                {stationBugs.map((b: any, idx: number) => (
                  <div
                    key={idx}
                    className="animate-in slide-in-from-top-1 flex items-center justify-between rounded border border-zinc-900 bg-zinc-950 p-1.5 text-[8px] text-zinc-400"
                  >
                    <span className="max-w-[280px] truncate">
                      [{b.fecha}] {b.logs}
                    </span>
                    <span
                      className={`rounded px-1 text-[7px] font-bold ${
                        b.resuelto
                          ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border border-red-500/20 bg-red-500/10 text-red-400"
                      }`}
                    >
                      {b.resuelto ? "Resuelto" : "Activo"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History of handoffs */}
          <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-4 font-mono">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">
              📂 Historial de Handoffs ({allHandoffs.length})
            </span>

            {allHandoffs.length === 0 ? (
              <p className="text-zinc-550 mt-2 text-[8px]">
                Aún no se han completado entregas de handoffs para este ticket.
              </p>
            ) : (
              <div className="mt-2.5 flex max-h-[180px] flex-col gap-2 overflow-y-auto pr-1">
                {allHandoffs.map(([stationName, data]: [string, any]) => (
                  <div
                    key={stationName}
                    className="flex flex-col gap-1 rounded border border-zinc-900 bg-zinc-900/40 p-2.5 text-[9px]"
                  >
                    <div className="flex items-center justify-between text-[8px]">
                      <span className="font-bold text-sky-400 uppercase">
                        {isActividadMode
                          ? "Handoff registrado"
                          : `Estación: ${stationName}`}
                      </span>
                      <span className="text-zinc-550">
                        [{data.fecha || "Completada"}]
                      </span>
                    </div>
                    {data.archivos_creados_o_modificados && (
                      <div className="text-zinc-550 mt-1 text-[8px]">
                        📁 <b>Archivos:</b>{" "}
                        {Array.isArray(data.archivos_creados_o_modificados)
                          ? data.archivos_creados_o_modificados.join(", ")
                          : String(data.archivos_creados_o_modificados)}
                      </div>
                    )}
                    {data.resumen_tecnico && (
                      <div className="text-zinc-350 mt-0.5 text-[8px] italic">
                        📝 <b>Resumen:</b> {data.resumen_tecnico}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isCicdModalOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm duration-200">
          <div className="w-[550px] rounded-xl border border-zinc-800 bg-zinc-950 p-5 font-mono shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-3">
              <span className="text-xs font-bold text-sky-400 uppercase">
                🛠️ Configurar GitHub Actions Workflow
              </span>
              <button
                onClick={() => setIsCicdModalOpen(false)}
                className="hover:text-zinc-350 text-[9px] text-zinc-500 uppercase"
              >
                Cerrar
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[9px] leading-relaxed text-zinc-400">
                Copia el prompt estructurado de abajo y pásaselo a Claude para
                generar el archivo de integración continua
                `.github/workflows/ci.yml`.
              </p>

              <textarea
                readOnly
                value={`Actúa como un DevOps Engineer Senior. Necesito configurar un workflow de GitHub Actions para el proyecto Next.js en la ruta de trabajo.
Crea el archivo \`.github/workflows/ci.yml\` con las siguientes especificaciones:
- Se debe disparar en cada push o pull_request hacia la rama 'main'.
- Debe instalar dependencias de forma eficiente usando caché.
- Debe ejecutar estrictamente las tareas de verificación:
  1. Linter (\`npm run lint\` o \`npx eslint .\`)
  2. Type checking (\`npx tsc --noEmit\`)
  3. Pruebas (\`npm run test\` si existen)

Devuelve el YAML completo optimizado y limpio sin explicaciones introductorias.`}
                rows={8}
                className="w-full rounded border border-zinc-900 bg-zinc-900/50 p-2.5 text-[9px] text-zinc-400 outline-none"
              />

              <button
                onClick={() => {
                  const p = `Actúa como un DevOps Engineer Senior. Necesito configurar un workflow de GitHub Actions para el proyecto Next.js en la ruta de trabajo.
Crea el archivo \`.github/workflows/ci.yml\` con las siguientes especificaciones:
- Se debe disparar en cada push o pull_request hacia la rama 'main'.
- Debe instalar dependencias de forma eficiente usando caché.
- Debe ejecutar estrictamente las tareas de verificación:
  1. Linter (\`npm run lint\` o \`npx eslint .\`)
  2. Type checking (\`npx tsc --noEmit\`)
  3. Pruebas (\`npm run test\` si existen)

Devuelve el YAML completo optimizado y limpio sin explicaciones introductorias.`;
                  navigator.clipboard.writeText(p);
                  mostrarToast(
                    "Prompt de CI/CD copiado al portapapeles.",
                    "exito"
                  );
                }}
                className="w-full rounded bg-sky-500 py-2 text-center text-[10px] font-bold text-zinc-950 uppercase hover:bg-sky-400"
              >
                📋 Copiar Prompt de CI/CD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
