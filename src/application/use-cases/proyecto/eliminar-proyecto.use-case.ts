import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { ErrorInfraestructura } from "../../../domain/errores/error-base";

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
      // 1. Delete main entity and settings
      await db.proyectos.delete(proyectoId);
      await db.proyecto_contexto.delete(proyectoId);
      await db.proyecto_design_system.delete(proyectoId);
      await db.proyecto_estado_tecnico.delete(proyectoId);

      // 2. Cascade delete all indexed sub-entities
      await db.epicas.where("proyectoId").equals(proyectoId).delete();
      await db.historias.where("proyectoId").equals(proyectoId).delete();
      await db.sprints.where("proyectoId").equals(proyectoId).delete();
      await db.tareas.where("proyectoId").equals(proyectoId).delete();
      await db.comentarios_proyecto
        .where("proyectoId")
        .equals(proyectoId)
        .delete();
      await db.archivos_proyecto
        .where("proyectoId")
        .equals(proyectoId)
        .delete();

      // 3. Log synchronization entry locally
      await db.logs_sincronizacion.add({
        tipo: "exito",
        mensaje: `Proyecto ID: ${proyectoId} y sus dependencias fueron eliminados por completo de IndexedDB.`,
        fecha: Date.now(),
      });

      return Resultado.exito(undefined);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return Resultado.falla(
        new ErrorInfraestructura(`Error eliminando el proyecto: ${errorMsg}`)
      );
    }
  }
}
