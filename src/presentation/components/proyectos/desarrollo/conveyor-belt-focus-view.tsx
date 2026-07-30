/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";

interface ConveyorBeltFocusViewProps {
  isOpen: boolean;
  onClose: () => void;
  selectedHistoriaCinta: any;
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
  promptMagro: string;
  mostrarToast: (msg: string, tipo: "exito" | "error" | "info") => void;
  isCicdModalOpen: boolean;
  setIsCicdModalOpen: (open: boolean) => void;
}

export const ConveyorBeltFocusView: React.FC<ConveyorBeltFocusViewProps> = ({
  isOpen,
  onClose,
  selectedHistoriaCinta,
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
  promptMagro,
  mostrarToast,
  isCicdModalOpen,
  setIsCicdModalOpen,
}) => {
  if (!isOpen || !selectedHistoriaCinta || !activeCintaExecution) return null;

  const meta = activeCintaExecution.metadata || {};
  const pipeline = meta.pipeline || [];
  const activeIdx = meta.activeStationIndex || 0;
  const activeStation = pipeline[activeIdx] || "QA";
  const shortId = `hu-${selectedHistoriaCinta.id.split("_").pop() || "hu"}`;
  const cleanTitle = selectedHistoriaCinta.titulo
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const branchName = `feature/mc-${shortId}-${cleanTitle}`;

  const allHandoffs = Object.entries(meta.handoffs || {}) as Array<
    [string, any]
  >;
  const stationIterations = meta.iterations?.[activeStation] || [];
  const stationBugs = meta.bugs?.[activeStation] || [];
  const activeBug = stationBugs.find((b: any) => !b.resuelto);

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[#0B0F19] p-6 font-mono text-zinc-100 duration-200">
      {/* Header Bar */}
      <div className="mb-5 flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <span className="animate-pulse rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 uppercase">
            CINTA ACTIVA
          </span>
          <div>
            <h2 className="text-sm font-bold text-zinc-200 uppercase">
              Cinta: mc-{shortId} — {selectedHistoriaCinta.titulo}
            </h2>
            <p className="mt-0.5 text-[9px] text-zinc-500">
              Rama: {branchName} | Sprint Asignado:{" "}
              {focusedSprint?.nombre || "General"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded border border-red-500/20 bg-red-500/10 px-3.5 py-1.5 text-[9px] font-bold text-red-400 uppercase transition-all hover:bg-red-500/20"
        >
          ❌ Salir del Modo Enfoque
        </button>
      </div>

      {/* Conveyor Belt Ribbon */}
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
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-[10px] font-bold uppercase transition-all ${stateClass}`}
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

      {/* Workstation Workspace split */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        {/* Left Column */}
        <div className="flex flex-col gap-4 xl:col-span-7">
          <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-4">
            <div className="mb-3 flex items-center justify-between border-b border-zinc-900 pb-2">
              <div>
                <span className="text-[10px] font-bold text-zinc-200 uppercase">
                  📋 Prompt de la Estación: {activeStation}
                </span>
                <p className="text-zinc-555 mt-0.5 text-[8px]">
                  XML limpio de handoffs anteriores para alimentar a la IA
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(promptMagro);
                  mostrarToast(
                    `Prompt de la estación ${activeStation} copiado.`,
                    "exito"
                  );
                }}
                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
              >
                📋 Copiar Prompt
              </button>
            </div>

            <textarea
              readOnly
              value={promptMagro}
              rows={12}
              className="w-full rounded border border-zinc-900 bg-zinc-900/30 p-3 font-mono text-[10px] text-zinc-400 outline-none"
            />
          </div>

          {/* Handoff Submission Box */}
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-900 bg-zinc-950/60 p-4">
            <div>
              <span className="text-[10px] font-bold text-zinc-200 uppercase">
                📥 Registrar Handoff & Avanzar
              </span>
              <p className="text-zinc-555 mt-0.5 text-[8px]">
                Pega la salida JSON entregada por la IA para pasar el contexto a
                la siguiente estación.
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
                  <span className="mt-1 block text-[8px] leading-normal text-zinc-400">
                    La IA sugiere cambios para:{" "}
                    {Object.keys(detectedDocUpdates)
                      .map((k) => `${k.toUpperCase()}.md`)
                      .join(", ")}
                    .
                  </span>
                </div>
                <button
                  onClick={handleAplicarActualizacionesDocs}
                  className="shrink-0 rounded bg-emerald-500 px-2.5 py-1.5 text-[8px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400"
                >
                  Aplicar y Sincronizar
                </button>
              </div>
            )}

            <div className="mt-1 flex items-center justify-between">
              <span className="text-zinc-550 text-[8px]">
                * El JSON guardado se usará para alimentar automáticamente el
                prompt de la próxima estación.
              </span>
              <button
                onClick={() => {
                  avanzarEstacionCinta(activeStation, cintaHandoffInput);
                  setCintaHandoffInput("");
                }}
                disabled={!cintaHandoffInput.trim()}
                className="rounded bg-emerald-500 px-4 py-2 text-[10px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400 disabled:opacity-40"
              >
                Sincronizar y Avanzar ➔
              </button>
            </div>
          </div>

          {activeStation === "QA" && (
            <div className="flex flex-col gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
              <div>
                <span className="text-[10px] font-bold text-sky-400 uppercase">
                  🚀 Git Flow de Cierre & CI/CD
                </span>
                <p className="text-zinc-555 mt-0.5 text-[8px]">
                  Comandos sugeridos para mezclar los cambios de feature/mc-
                  {shortId} en main
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded border border-zinc-900 bg-zinc-950 p-2.5">
                <code className="text-zinc-450 text-[9px] break-all select-all">
                  {`git add . && git commit -m "feat(mc-${shortId}): implementa ${selectedHistoriaCinta.titulo.toLowerCase().replace(/"/g, "")}" && git checkout main && git merge ${branchName} && git push origin main`}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `git add .\ngit commit -m "feat(mc-${shortId}): implementa ${selectedHistoriaCinta.titulo}"\ngit checkout main\ngit merge ${branchName}\ngit push origin main`
                    );
                    mostrarToast(
                      "Comandos Git copiados al portapapeles.",
                      "exito"
                    );
                  }}
                  className="shrink-0 rounded border border-sky-500/20 bg-sky-500/10 px-2.5 py-1.5 text-[8px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
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
          )}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4 xl:col-span-5">
          <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-4">
            <span className="text-[9px] font-bold text-zinc-400 uppercase">
              🎯 Criterios de Aceptación HU
            </span>
            <div className="mt-2 max-h-[80px] overflow-y-auto pr-1 text-[10px] leading-relaxed text-zinc-300">
              {selectedHistoriaCinta.descripcion ||
                "No hay criterios de aceptación detallados cargados."}
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
            <span className="text-[10px] font-bold text-sky-400 uppercase">
              🔄 Carril de Iteraciones ({stationIterations.length})
            </span>
            <p className="text-zinc-555 text-[8px]">
              Registra feedback para que la IA refine o ajuste la
              nomenclatura/diseño.
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
                  const p = `ROL: Desarrollador Senior\n\nTICKET: mc-${shortId} (${activeStation})\n\nAJUSTES:\n${cintaIterationFeedback.trim()}\n\nAplica los ajustes indicados manteniendo consistencia con el código actual.\nDevuelve el código completo y el bloque JSON de handoff.`;
                  navigator.clipboard.writeText(p);
                  mostrarToast("Prompt de refinamiento copiado.", "exito");
                }}
                className="animate-pulse rounded bg-sky-500 px-3 py-1.5 text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-sky-400"
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
                    <span className="font-mono font-bold text-sky-400">
                      [{it.fecha} - {it.version}]:
                    </span>{" "}
                    {it.feedback}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
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
                    <div className="mt-2 text-zinc-300">
                      <span className="text-zinc-550 font-bold">Esperado:</span>{" "}
                      {activeBug.comportamientoEsperado}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      const p = `ROL: Senior Debugger\n\nERROR EN ESTACIÓN: ${activeStation}\n\nLOGS:\n${activeBug.logs}\n\nAnaliza y soluciona el crash de arriba en feature/mc-${shortId}. Asegura no romper contratos previos.\nDevuelve el código completo y el bloque JSON de handoff.`;
                      navigator.clipboard.writeText(p);
                      mostrarToast(
                        "Prompt de depuración de bug copiado.",
                        "exito"
                      );
                    }}
                    className="hover:bg-red-450 animate-pulse rounded bg-red-500 px-3.5 py-1.5 text-[9px] font-bold text-zinc-950 uppercase transition-all"
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
                <p className="text-zinc-555 text-[8px]">
                  Si el código generado produce algún crash o error en terminal,
                  repórtalo aquí.
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
                    className="flex items-center justify-between rounded border border-zinc-900 bg-zinc-950 p-1.5 text-[8px] text-zinc-400"
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

          <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-4">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">
              📂 Historial de Handoffs ({allHandoffs.length})
            </span>

            {allHandoffs.length === 0 ? (
              <p className="text-zinc-555 mt-2 text-[8px]">
                Aún no se han completado estaciones en esta cinta.
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
                        Estación: {stationName}
                      </span>
                      <span className="text-zinc-550">
                        [{data.fecha || "Completada"}]
                      </span>
                    </div>
                    {data.archivos_creados_o_modificados && (
                      <div className="mt-1 text-[8px] text-zinc-500">
                        📁 <b>Archivos:</b>{" "}
                        {data.archivos_creados_o_modificados.join(", ")}
                      </div>
                    )}
                    {data.resumen_tecnico && (
                      <div className="mt-0.5 text-[8px] text-zinc-300 italic">
                        📝 <b>Notas:</b> {data.resumen_tecnico}
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
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[550px] rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-3">
              <span className="font-mono text-xs font-bold text-sky-400 uppercase">
                🛠️ Configurar GitHub Actions Workflow
              </span>
              <button
                onClick={() => setIsCicdModalOpen(false)}
                className="hover:text-zinc-350 font-mono text-[9px] text-zinc-500 uppercase"
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
                className="w-full rounded border border-zinc-900 bg-zinc-900/50 p-2.5 font-mono text-[9px] text-zinc-400 outline-none"
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
