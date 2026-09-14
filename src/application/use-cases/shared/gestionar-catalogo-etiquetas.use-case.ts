import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import { ErrorDominio } from "../../../domain/errores/error-base";
import type { CategoriaEtiqueta } from "../../../domain/entidades/contacto-frio.entity";

/**
 * `catalogo_etiquetas` es una tabla genérica (dolor/motivo_rechazo de
 * Contacto en Frío, area_personal/motivo_incumplimiento de Personal) — este
 * use-case aísla la única operación de escritura (crear etiqueta) para que
 * componentes compartidos como `SelectorEtiquetas` no dependan de un
 * use-case de un módulo en particular.
 */
export class GestionarCatalogoEtiquetasUseCase {
  public async crearEtiqueta(
    etiqueta: string,
    categoria: CategoriaEtiqueta
  ): Promise<Resultado<string>> {
    if (!etiqueta.trim()) {
      return Resultado.falla(
        new ErrorDominio("La etiqueta no puede estar vacía.")
      );
    }
    const ahora = Date.now();
    const id = `etq_${ahora}`;
    const registro = {
      id,
      etiqueta: etiqueta.trim(),
      categoria,
      esDelUsuario: true,
      creadoEn: ahora,
    };
    try {
      await db.catalogo_etiquetas.add(registro);
      await QueueService.encolar("catalogo_etiquetas", "crear", id, registro);
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear la etiqueta."
        )
      );
    }
  }

  public async eliminarEtiqueta(id: string): Promise<Resultado<void>> {
    try {
      await db.catalogo_etiquetas.delete(id);
      await QueueService.encolar("catalogo_etiquetas", "eliminar", id, {});
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al eliminar la etiqueta."
        )
      );
    }
  }
}
