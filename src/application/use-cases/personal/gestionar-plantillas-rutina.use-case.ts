import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  crearPlantillaRutinaSchema,
  type CrearPlantillaRutinaInput,
  type PlantillaRutina,
} from "../../../domain/entidades/rutina.entity";

function idPlantilla(): string {
  return `rut_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Plantillas de rutina: 2 formas estructurales (series/tiempo) cubren los
 * formatos de entrenamiento sin necesitar un formulario por cada uno — ver
 * rutina.entity.ts.
 */
export class GestionarPlantillasRutinaUseCase {
  public async crearPlantilla(
    input: CrearPlantillaRutinaInput
  ): Promise<Resultado<string>> {
    const parsed = crearPlantillaRutinaSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const ahora = Date.now();
    const id = idPlantilla();
    const registro: PlantillaRutina = {
      id,
      nombre: parsed.data.nombre.trim(),
      formato: parsed.data.formato,
      tipoEstructura: parsed.data.tipoEstructura,
      // La forma exacta depende de tipoEstructura (series vs tiempo); el
      // schema valida "es un objeto" y no fuerza la unión discriminada acá.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      estructura: parsed.data.estructura as any,
      eliminado: false,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    try {
      await db.plantilla_rutina.add(registro);
      await QueueService.encolar("plantilla_rutina", "crear", id, {
        ...registro,
      });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear la rutina."
        )
      );
    }
  }

  public async eliminarPlantilla(id: string): Promise<Resultado<void>> {
    const plantilla = await db.plantilla_rutina.get(id);
    if (!plantilla) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la rutina.")
      );
    }
    const actualizadoEn = Date.now();
    try {
      await db.plantilla_rutina.update(id, { eliminado: true, actualizadoEn });
      await QueueService.encolar("plantilla_rutina", "editar", id, {
        id,
        eliminado: true,
        actualizadoEn,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al eliminar la rutina."
        )
      );
    }
  }
}
