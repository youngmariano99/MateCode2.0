import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  crearEntregableSchema,
  ajustarEntregableSchema,
  type CrearEntregableInput,
  type AjustarEntregableInput,
  type Entregable,
} from "../../../domain/entidades/entregable.entity";
import { registrarHistorialPersonal } from "../../servicios/registrar-historial-personal.service";
import { recomputarProyecto } from "../../servicios/recomputar-progreso-personal.service";

function idEntregable(): string {
  return `entr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Entregable — corto plazo, hijo de un Proyecto. Puede ser puntual (sin
 * recurrencia) o recurrente hasta cumplir un objetivo acumulado (ver
 * entregable.entity.ts). Mientras tenga Actividades con métrica propia, su
 * progresoActual lo recalcula recomputarEntregable(), no se edita acá.
 */
export class GestionarEntregablesUseCase {
  public async crearEntregable(
    input: CrearEntregableInput
  ): Promise<Resultado<string>> {
    const parsed = crearEntregableSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const proyecto = await db.proyecto_personal.get(parsed.data.proyectoId);
    if (!proyecto) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el proyecto padre.")
      );
    }
    if (parsed.data.objetivoId !== proyecto.objetivoId) {
      return Resultado.falla(
        new ErrorDominio(
          "El objetivoId no corresponde al proyecto indicado — evita quedar huérfano de la cadena de ancestros."
        )
      );
    }
    const ahora = Date.now();
    const id = idEntregable();
    const registro: Entregable = {
      id,
      proyectoId: parsed.data.proyectoId,
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
      recurrencia: parsed.data.recurrencia,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    try {
      await db.transaction(
        "rw",
        [db.entregable, db.proyecto_personal, db.cola_eventos],
        async () => {
          await db.entregable.add(registro);
          await QueueService.encolar("entregable", "crear", id, {
            ...registro,
          });
          if (!proyecto.tieneHijos) {
            await db.proyecto_personal.update(proyecto.id, {
              tieneHijos: true,
              actualizadoEn: ahora,
            });
            await QueueService.encolar(
              "proyecto_personal",
              "editar",
              proyecto.id,
              { id: proyecto.id, tieneHijos: true, actualizadoEn: ahora }
            );
          }
        }
      );
      await registrarHistorialPersonal({
        entidadTipo: "entregable",
        entidadId: id,
        accion: "crear",
        descripcion: `Entregable "${registro.titulo}" creado bajo el proyecto "${proyecto.titulo}".`,
      });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear el entregable."
        )
      );
    }
  }

  public async ajustarEntregable(
    input: AjustarEntregableInput
  ): Promise<Resultado<void>> {
    const parsed = ajustarEntregableSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const entregable = await db.entregable.get(parsed.data.id);
    if (!entregable) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el entregable.")
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
    const cambios: Partial<Entregable> = { actualizadoEn };
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
      await db.entregable.update(parsed.data.id, cambios);
      await QueueService.encolar("entregable", "editar", parsed.data.id, {
        id: parsed.data.id,
        ...cambios,
      });
      await registrarHistorialPersonal({
        entidadTipo: "entregable",
        entidadId: parsed.data.id,
        accion:
          parsed.data.diaLimite !== undefined
            ? "ajustar_fecha"
            : "ajustar_cantidad",
        campoAnterior: {
          diaLimite: entregable.diaLimite,
          cantidadObjetivo: entregable.cantidadObjetivo,
        },
        campoNuevo: cambios,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al ajustar el entregable."
        )
      );
    }
  }

  /** Solo válido para un entregable sin Actividades con métrica — si las tiene, el progreso lo suma recomputarEntregable(). */
  public async registrarAvance(
    id: string,
    cantidad: number
  ): Promise<Resultado<void>> {
    if (!Number.isFinite(cantidad) || cantidad === 0) {
      return Resultado.falla(
        new ErrorDominio("Ingresá una cantidad distinta de cero.")
      );
    }
    const entregable = await db.entregable.get(id);
    if (!entregable) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el entregable.")
      );
    }
    if (entregable.tieneHijos) {
      return Resultado.falla(
        new ErrorDominio(
          "Este entregable tiene actividades debajo — registrá el avance en la actividad correspondiente, el total se suma solo."
        )
      );
    }
    if (entregable.cantidadObjetivo === undefined) {
      return Resultado.falla(
        new ErrorDominio(
          "Este entregable no tiene una cantidad objetivo definida."
        )
      );
    }
    const progresoActual = Math.max(0, entregable.progresoActual + cantidad);
    const estado =
      progresoActual >= entregable.cantidadObjetivo &&
      entregable.estado === "activo"
        ? ("cumplido" as const)
        : entregable.estado;
    const actualizadoEn = Date.now();
    try {
      await db.entregable.update(id, { progresoActual, estado, actualizadoEn });
      await QueueService.encolar("entregable", "editar", id, {
        id,
        progresoActual,
        estado,
        actualizadoEn,
      });
      await registrarHistorialPersonal({
        entidadTipo: "entregable",
        entidadId: id,
        accion: "registrar_avance",
        descripcion: `+${cantidad} ${entregable.unidad ?? ""}`.trim(),
      });
      await recomputarProyecto(entregable.proyectoId);
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al registrar el avance."
        )
      );
    }
  }

  public async archivarEntregable(id: string): Promise<Resultado<void>> {
    const entregable = await db.entregable.get(id);
    if (!entregable) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el entregable.")
      );
    }
    const actualizadoEn = Date.now();
    try {
      await db.entregable.update(id, { estado: "archivado", actualizadoEn });
      await QueueService.encolar("entregable", "editar", id, {
        id,
        estado: "archivado",
        actualizadoEn,
      });
      await registrarHistorialPersonal({
        entidadTipo: "entregable",
        entidadId: id,
        accion: "editar",
        descripcion: `Entregable "${entregable.titulo}" archivado.`,
      });
      await recomputarProyecto(entregable.proyectoId);
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error
            ? err.message
            : "Error al archivar el entregable."
        )
      );
    }
  }
}
