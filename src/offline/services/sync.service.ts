import { db } from "../dexie/db";
import { MAX_INTENTOS_SYNC, QueueService } from "./queue.service";
import { HttpClient } from "../../presentation/services/http-client";

export const SyncService = {
  /**
   * Procesa la cola de eventos pendientes. Un evento que falla NO corta el resto
   * de la cola: se registra el fallo (intentos/ultimoError) y se continúa con los
   * siguientes, para que la sincronización sea resiliente ante un evento puntual
   * roto (crítico una vez que el volumen de eventos aumente con la automatización IA).
   * Un evento que agota MAX_INTENTOS_SYNC queda en la cola marcado como "conflicto"
   * para revisión manual, en vez de reintentarse indefinidamente.
   */
  sincronizar: async (
    onProgress?: (msg: string) => void
  ): Promise<{ exitosos: number; fallidos: number }> => {
    const pendientes = await QueueService.obtenerPendientes();
    if (pendientes.length === 0) return { exitosos: 0, fallidos: 0 };

    if (onProgress) onProgress("Iniciando sincronización...");
    await db.logs_sincronizacion.add({
      tipo: "inicio",
      mensaje: `Sincronizando ${pendientes.length} eventos pendientes...`,
      fecha: Date.now(),
    });

    let exitosos = 0;
    let fallidos = 0;

    for (const evento of pendientes) {
      if (evento.id === undefined) continue;

      if ((evento.intentos ?? 0) >= MAX_INTENTOS_SYNC) {
        fallidos++;
        continue;
      }

      try {
        if (onProgress)
          onProgress(`Sincronizando ${evento.accion} en ${evento.tabla}...`);

        const url = `/sync/${evento.tabla}`;
        await HttpClient.post(url, {
          accion: evento.accion,
          registroId: evento.registroId,
          payload: evento.payload,
        });

        await QueueService.eliminar(evento.id);
        exitosos++;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const actualizado = await QueueService.registrarFallo(
          evento.id,
          errorMsg
        );
        fallidos++;

        const agotoIntentos = (actualizado?.intentos ?? 0) >= MAX_INTENTOS_SYNC;
        await db.logs_sincronizacion.add({
          tipo: agotoIntentos ? "conflicto" : "error",
          mensaje: agotoIntentos
            ? `Evento ${evento.id} (${evento.tabla}/${evento.accion}) agotó ${MAX_INTENTOS_SYNC} intentos: ${errorMsg}. Requiere revisión manual.`
            : `Error al sincronizar evento ${evento.id} (intento ${actualizado?.intentos ?? "?"}): ${errorMsg}`,
          fecha: Date.now(),
        });
        // No relanzamos: seguimos con el resto de la cola.
      }
    }

    await db.logs_sincronizacion.add({
      tipo: fallidos === 0 ? "exito" : "error",
      mensaje: `Sincronización finalizada: ${exitosos} ok, ${fallidos} con error.`,
      fecha: Date.now(),
    });
    if (onProgress) onProgress("Sincronización finalizada.");
    return { exitosos, fallidos };
  },

  respaldarTodoEnSupabase: async (
    onProgress?: (msg: string) => void
  ): Promise<void> => {
    if (onProgress) onProgress("Leyendo datos locales...");

    // Leer tablas principales deIndexedDB
    const proyectos = await db.proyectos.toArray();
    const epicas = await db.epicas.toArray();
    const sprints = await db.sprints.toArray();
    const historias = await db.historias.toArray();
    const tareas = await db.tareas.toArray();
    const taskExecutions = await db.task_executions.toArray();
    const proyectoContexto = await db.proyecto_contexto.toArray();
    const proyectoDesignSystem = await db.proyecto_design_system.toArray();
    const proyectoEstadoTecnico = await db.proyecto_estado_tecnico.toArray();
    const proyectoConfigAutomatizacion =
      await db.proyecto_config_automatizacion.toArray();
    const taskExecutionCheckpoints =
      await db.task_execution_checkpoints.toArray();

    // Tablas CRM
    const clientes = await db.clientes.toArray();
    const contactos = await db.contactos.toArray();
    const contratos = await db.contratos.toArray();
    const pagos = await db.pagos.toArray();

    if (onProgress) onProgress("Subiendo respaldo a la nube...");

    await HttpClient.post("/sync/bulk", {
      proyectos,
      epicas,
      sprints,
      historias,
      tareas,
      task_executions: taskExecutions,
      proyecto_contexto: proyectoContexto,
      proyecto_design_system: proyectoDesignSystem,
      proyecto_estado_tecnico: proyectoEstadoTecnico,
      proyecto_config_automatizacion: proyectoConfigAutomatizacion,
      task_execution_checkpoints: taskExecutionCheckpoints,
      clientes,
      contactos,
      contratos,
      pagos,
    });

    if (onProgress) onProgress("Respaldo completado.");
  },
};
