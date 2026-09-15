import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  crearAreaSchema,
  editarAreaSchema,
  type CrearAreaInput,
  type EditarAreaInput,
  type AreaPersonal,
} from "../../../domain/entidades/area-personal.entity";
import { registrarHistorialPersonal } from "../../servicios/registrar-historial-personal.service";

function idArea(): string {
  return `area_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Área — la raíz de la jerarquía Área→Objetivo→Proyecto→Entregable→
 * Actividad. El borrado (con conteo real de todo lo que se lleva puesto)
 * vive en EliminarNodoPersonalUseCase, no acá — desactivar es lo único que
 * hace este use-case aparte de crear/editar (soft-hide, no borra nada de lo
 * que tiene debajo).
 */
export class GestionarAreasUseCase {
  public async crearArea(input: CrearAreaInput): Promise<Resultado<string>> {
    const parsed = crearAreaSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const ahora = Date.now();
    const id = idArea();
    const registro: AreaPersonal = {
      id,
      nombre: parsed.data.nombre.trim(),
      descripcion: parsed.data.descripcion,
      activa: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    try {
      await db.area_personal.add(registro);
      await QueueService.encolar("area_personal", "crear", id, { ...registro });
      await registrarHistorialPersonal({
        entidadTipo: "area",
        entidadId: id,
        accion: "crear",
        descripcion: `Área "${registro.nombre}" creada.`,
      });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear el área."
        )
      );
    }
  }

  public async editarArea(input: EditarAreaInput): Promise<Resultado<void>> {
    const parsed = editarAreaSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const area = await db.area_personal.get(parsed.data.id);
    if (!area) {
      return Resultado.falla(new ErrorNoEncontrado("No se encontró el área."));
    }
    const actualizadoEn = Date.now();
    const cambios: Partial<AreaPersonal> = { actualizadoEn };
    if (parsed.data.nombre !== undefined)
      cambios.nombre = parsed.data.nombre.trim();
    if (parsed.data.descripcion !== undefined) {
      cambios.descripcion = parsed.data.descripcion;
    }
    try {
      await db.area_personal.update(parsed.data.id, cambios);
      await QueueService.encolar("area_personal", "editar", parsed.data.id, {
        id: parsed.data.id,
        ...cambios,
      });
      await registrarHistorialPersonal({
        entidadTipo: "area",
        entidadId: parsed.data.id,
        accion: "editar",
        campoAnterior: { nombre: area.nombre, descripcion: area.descripcion },
        campoNuevo: cambios,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al editar el área."
        )
      );
    }
  }

  public async desactivarArea(id: string): Promise<Resultado<void>> {
    const area = await db.area_personal.get(id);
    if (!area) {
      return Resultado.falla(new ErrorNoEncontrado("No se encontró el área."));
    }
    const actualizadoEn = Date.now();
    try {
      await db.area_personal.update(id, { activa: false, actualizadoEn });
      await QueueService.encolar("area_personal", "editar", id, {
        id,
        activa: false,
        actualizadoEn,
      });
      await registrarHistorialPersonal({
        entidadTipo: "area",
        entidadId: id,
        accion: "editar",
        descripcion: `Área "${area.nombre}" desactivada.`,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al desactivar el área."
        )
      );
    }
  }
}
