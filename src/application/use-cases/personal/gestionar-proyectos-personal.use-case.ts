import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  crearProyectoPersonalSchema,
  ajustarProyectoPersonalSchema,
  type CrearProyectoPersonalInput,
  type AjustarProyectoPersonalInput,
  type ProyectoPersonal,
} from "../../../domain/entidades/proyecto-personal.entity";
import { registrarHistorialPersonal } from "../../servicios/registrar-historial-personal.service";
import { recomputarObjetivo } from "../../servicios/recomputar-progreso-personal.service";

function idProyecto(): string {
  return `proy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Proyecto (Personal) — mediano plazo, hijo de un Objetivo. Mientras tenga
 * Entregables, su progresoActual lo recalcula recomputarProyecto() (ver
 * recomputar-progreso-personal.service.ts), no se edita acá a mano.
 */
export class GestionarProyectosPersonalUseCase {
  public async crearProyecto(
    input: CrearProyectoPersonalInput
  ): Promise<Resultado<string>> {
    const parsed = crearProyectoPersonalSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const objetivo = await db.objetivo_cuantificable.get(
      parsed.data.objetivoId
    );
    if (!objetivo) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el objetivo padre.")
      );
    }
    const ahora = Date.now();
    const id = idProyecto();
    const registro: ProyectoPersonal = {
      id,
      objetivoId: parsed.data.objetivoId,
      titulo: parsed.data.titulo.trim(),
      descripcion: parsed.data.descripcion,
      diaInicio: parsed.data.diaInicio,
      diaLimite: parsed.data.diaLimite,
      cantidadObjetivo: parsed.data.cantidadObjetivo,
      unidad: parsed.data.unidad,
      progresoActual: 0,
      estado: "activo",
      tieneHijos: false,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    try {
      await db.transaction(
        "rw",
        [db.proyecto_personal, db.objetivo_cuantificable, db.cola_eventos],
        async () => {
          await db.proyecto_personal.add(registro);
          await QueueService.encolar("proyecto_personal", "crear", id, {
            ...registro,
          });
          if (!objetivo.tieneHijos) {
            await db.objetivo_cuantificable.update(objetivo.id, {
              tieneHijos: true,
              actualizadoEn: ahora,
            });
            await QueueService.encolar(
              "objetivo_cuantificable",
              "editar",
              objetivo.id,
              { id: objetivo.id, tieneHijos: true, actualizadoEn: ahora }
            );
          }
        }
      );
      await registrarHistorialPersonal({
        entidadTipo: "proyecto",
        entidadId: id,
        accion: "crear",
        descripcion: `Proyecto "${registro.titulo}" creado bajo el objetivo "${objetivo.titulo}".`,
      });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear el proyecto."
        )
      );
    }
  }

  public async ajustarProyecto(
    input: AjustarProyectoPersonalInput
  ): Promise<Resultado<void>> {
    const parsed = ajustarProyectoPersonalSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const proyecto = await db.proyecto_personal.get(parsed.data.id);
    if (!proyecto) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el proyecto.")
      );
    }
    if (
      parsed.data.diaLimite === undefined &&
      parsed.data.cantidadObjetivo === undefined &&
      parsed.data.bandaAceptable === undefined &&
      parsed.data.bandaMejorable === undefined
    ) {
      return Resultado.falla(
        new ErrorDominio(
          "Indicá una nueva fecha, una nueva cantidad, una banda, o alguna combinación."
        )
      );
    }
    const actualizadoEn = Date.now();
    const cambios: Partial<ProyectoPersonal> = { actualizadoEn };
    if (parsed.data.diaLimite !== undefined)
      cambios.diaLimite = parsed.data.diaLimite;
    if (parsed.data.cantidadObjetivo !== undefined) {
      cambios.cantidadObjetivo = parsed.data.cantidadObjetivo;
    }
    if (parsed.data.bandaAceptable !== undefined) {
      cambios.bandaAceptable = parsed.data.bandaAceptable;
    }
    if (parsed.data.bandaMejorable !== undefined) {
      cambios.bandaMejorable = parsed.data.bandaMejorable;
    }
    try {
      await db.proyecto_personal.update(parsed.data.id, cambios);
      await QueueService.encolar(
        "proyecto_personal",
        "editar",
        parsed.data.id,
        {
          id: parsed.data.id,
          ...cambios,
        }
      );
      await registrarHistorialPersonal({
        entidadTipo: "proyecto",
        entidadId: parsed.data.id,
        accion:
          parsed.data.diaLimite !== undefined
            ? "ajustar_fecha"
            : "ajustar_cantidad",
        campoAnterior: {
          diaLimite: proyecto.diaLimite,
          cantidadObjetivo: proyecto.cantidadObjetivo,
        },
        campoNuevo: cambios,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al ajustar el proyecto."
        )
      );
    }
  }

  public async archivarProyecto(id: string): Promise<Resultado<void>> {
    const proyecto = await db.proyecto_personal.get(id);
    if (!proyecto) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el proyecto.")
      );
    }
    const actualizadoEn = Date.now();
    try {
      await db.proyecto_personal.update(id, {
        estado: "archivado",
        actualizadoEn,
      });
      await QueueService.encolar("proyecto_personal", "editar", id, {
        id,
        estado: "archivado",
        actualizadoEn,
      });
      await registrarHistorialPersonal({
        entidadTipo: "proyecto",
        entidadId: id,
        accion: "editar",
        descripcion: `Proyecto "${proyecto.titulo}" archivado.`,
      });
      // Un proyecto archivado deja de contar en el progreso del objetivo.
      await recomputarObjetivo(proyecto.objetivoId);
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al archivar el proyecto."
        )
      );
    }
  }
}
