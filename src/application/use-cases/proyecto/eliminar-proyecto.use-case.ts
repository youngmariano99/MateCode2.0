import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { ErrorInfraestructura } from "../../../domain/errores/error-base";
import { QueueService } from "../../../offline/services/queue.service";

export class EliminarProyectoUseCase {
  public async ejecutar(proyectoId: string): Promise<Resultado<void>> {
    if (!proyectoId) {
      return Resultado.falla(
        new ErrorInfraestructura(
          "El identificador del proyecto es obligatorio."
        )
      );
    }

    try {
      await db.transaction(
        "rw",
        [
          db.proyectos,
          db.proyecto_contexto,
          db.proyecto_design_system,
          db.proyecto_estado_tecnico,
          db.epicas,
          db.historias,
          db.sprints,
          db.tareas,
          db.comentarios_proyecto,
          db.archivos_proyecto,
          db.cola_eventos,
          db.logs_sincronizacion,
        ],
        async () => {
          // Server-side, "eliminar" es borrado lógico para las tablas que
          // tienen eliminadoEn (proyectos/epicas/historias/sprints/tareas) y
          // borrado físico real para las de config 1:1 sin historial
          // (proyecto_contexto/design_system/estado_tecnico, que no tienen
          // esa columna). Antes esta baja nunca se encolaba: el proyecto
          // desaparecía del navegador pero seguía vivo para siempre en
          // Supabase — el bug real no era "debería ser lógico", era "nunca
          // llegaba al servidor".
          const epicas = await db.epicas
            .where("proyectoId")
            .equals(proyectoId)
            .toArray();
          const historias = await db.historias
            .where("proyectoId")
            .equals(proyectoId)
            .toArray();
          const sprints = await db.sprints
            .where("proyectoId")
            .equals(proyectoId)
            .toArray();
          const tareas = await db.tareas
            .where("proyectoId")
            .equals(proyectoId)
            .toArray();

          for (const e of epicas) {
            await QueueService.encolar(
              "epicas",
              "eliminar",
              e.id as string,
              {}
            );
          }
          for (const h of historias) {
            await QueueService.encolar(
              "historias",
              "eliminar",
              h.id as string,
              {}
            );
          }
          for (const s of sprints) {
            await QueueService.encolar(
              "sprints",
              "eliminar",
              s.id as string,
              {}
            );
          }
          for (const t of tareas) {
            await QueueService.encolar(
              "tareas",
              "eliminar",
              t.id as string,
              {}
            );
          }
          await QueueService.encolar(
            "proyecto_contexto",
            "eliminar",
            proyectoId,
            {}
          );
          await QueueService.encolar(
            "proyecto_design_system",
            "eliminar",
            proyectoId,
            {}
          );
          await QueueService.encolar(
            "proyecto_estado_tecnico",
            "eliminar",
            proyectoId,
            {}
          );
          await QueueService.encolar("proyectos", "eliminar", proyectoId, {});

          // Borrado local: IndexedDB es la caché de este navegador, no la
          // fuente de verdad — el registro sobrevive en Supabase marcado
          // eliminado (recuperable ahí), acá simplemente ya no hace falta.
          await db.proyectos.delete(proyectoId);
          await db.proyecto_contexto.delete(proyectoId);
          await db.proyecto_design_system.delete(proyectoId);
          await db.proyecto_estado_tecnico.delete(proyectoId);
          await db.epicas.where("proyectoId").equals(proyectoId).delete();
          await db.historias.where("proyectoId").equals(proyectoId).delete();
          await db.sprints.where("proyectoId").equals(proyectoId).delete();
          await db.tareas.where("proyectoId").equals(proyectoId).delete();
          // comentarios_proyecto/archivos_proyecto no tienen tabla espejo en
          // Supabase (no están en tableMapper de las rutas de sync) — son
          // solo locales, se borran físicamente sin encolar nada.
          await db.comentarios_proyecto
            .where("proyectoId")
            .equals(proyectoId)
            .delete();
          await db.archivos_proyecto
            .where("proyectoId")
            .equals(proyectoId)
            .delete();

          await db.logs_sincronizacion.add({
            tipo: "exito",
            mensaje: `Proyecto ID: ${proyectoId} y sus dependencias fueron eliminados de IndexedDB y encolados para borrado lógico en Supabase.`,
            fecha: Date.now(),
          });
        }
      );

      return Resultado.exito(undefined);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return Resultado.falla(
        new ErrorInfraestructura(`Error eliminando el proyecto: ${errorMsg}`)
      );
    }
  }
}
