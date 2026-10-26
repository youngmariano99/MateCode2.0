import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  crearProcedimientoSchema,
  editarProcedimientoSchema,
  type CrearProcedimientoInput,
  type EditarProcedimientoInput,
  type Procedimiento,
  type PasoProcedimientoDefinicion,
  type CategoriaProcedimiento,
} from "../../../domain/entidades/procedimiento.entity";
import {
  importarProcedimientosSchema,
  type ImportarProcedimientosInput,
} from "../../../domain/entidades/planificacion-jerarquica.entity";
import { registrarHistorialPersonal } from "../../servicios/registrar-historial-personal.service";

function idProcedimiento(): string {
  return `proc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

export interface FiltroProcedimientos {
  categoria?: CategoriaProcedimiento;
  clienteId?: string;
  areaId?: string;
  proyectoPersonalId?: string;
  entregableId?: string;
  soloActivos?: boolean;
  busqueda?: string;
}

/**
 * Procedimiento (SOP) — plantillas de pasos estandarizados que se repiten en
 * procesos personales, de estudio, contacto en frío o desarrollo para clientes.
 * Son plantillas reutilizables que generan instancias de EjecucionProcedimiento
 * cuando se activan en el día a día.
 */
export class GestionarProcedimientosUseCase {
  public async crearProcedimiento(
    input: CrearProcedimientoInput
  ): Promise<Resultado<string>> {
    const parsed = crearProcedimientoSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }

    const ahora = Date.now();
    const id = idProcedimiento();
    const pasosConId: PasoProcedimientoDefinicion[] = parsed.data.pasos.map(
      (p, idx) => ({
        id:
          p.id ||
          `paso_${idx + 1}_${Math.random().toString(36).substring(2, 6)}`,
        orden: p.orden ?? idx + 1,
        titulo: p.titulo.trim(),
        descripcion: p.descripcion?.trim(),
        duracionEstimadaMin: p.duracionEstimadaMin,
        tipoSugerido: p.tipoSugerido,
        esObligatorio: p.esObligatorio ?? true,
      })
    );

    const registro: Procedimiento = {
      id,
      titulo: parsed.data.titulo.trim(),
      descripcion: parsed.data.descripcion?.trim(),
      categoria: parsed.data.categoria,
      color: parsed.data.color,
      icono: parsed.data.icono,
      tags: parsed.data.tags ?? [],
      activo: true,
      clienteId: parsed.data.clienteId,
      proyectoTrabajoId: parsed.data.proyectoTrabajoId,
      servicioId: parsed.data.servicioId,
      areaId: parsed.data.areaId,
      objetivoId: parsed.data.objetivoId,
      proyectoPersonalId: parsed.data.proyectoPersonalId,
      entregableId: parsed.data.entregableId,
      pasos: pasosConId,
      tiempoEstimadoTotalMin: parsed.data.tiempoEstimadoTotalMin,
      documentacionUrl: parsed.data.documentacionUrl,
      vecesEjecutado: 0,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };

    try {
      await db.procedimiento.add(registro);
      await QueueService.encolar("procedimiento", "crear", id, { ...registro });
      await registrarHistorialPersonal({
        entidadTipo: "procedimiento",
        entidadId: id,
        accion: "crear",
        descripcion: `Procedimiento "${registro.titulo}" creado (${pasosConId.length} pasos).`,
      });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error
            ? err.message
            : "Error al crear el procedimiento."
        )
      );
    }
  }

  public async editarProcedimiento(
    input: EditarProcedimientoInput
  ): Promise<Resultado<void>> {
    const parsed = editarProcedimientoSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }

    const existente = await db.procedimiento.get(parsed.data.id);
    if (!existente || existente.eliminadoEn) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el procedimiento.")
      );
    }

    const ahora = Date.now();
    const cambios: Partial<Procedimiento> = { actualizadoEn: ahora };

    if (parsed.data.titulo !== undefined)
      cambios.titulo = parsed.data.titulo.trim();
    if (parsed.data.descripcion !== undefined) {
      cambios.descripcion = parsed.data.descripcion?.trim();
    }
    if (parsed.data.categoria !== undefined)
      cambios.categoria = parsed.data.categoria;
    if (parsed.data.color !== undefined) cambios.color = parsed.data.color;
    if (parsed.data.icono !== undefined) cambios.icono = parsed.data.icono;
    if (parsed.data.tags !== undefined) cambios.tags = parsed.data.tags;
    if (parsed.data.activo !== undefined) cambios.activo = parsed.data.activo;
    if (parsed.data.clienteId !== undefined)
      cambios.clienteId = parsed.data.clienteId ?? undefined;
    if (parsed.data.proyectoTrabajoId !== undefined)
      cambios.proyectoTrabajoId = parsed.data.proyectoTrabajoId ?? undefined;
    if (parsed.data.servicioId !== undefined)
      cambios.servicioId = parsed.data.servicioId ?? undefined;
    if (parsed.data.areaId !== undefined)
      cambios.areaId = parsed.data.areaId ?? undefined;
    if (parsed.data.objetivoId !== undefined)
      cambios.objetivoId = parsed.data.objetivoId ?? undefined;
    if (parsed.data.proyectoPersonalId !== undefined)
      cambios.proyectoPersonalId = parsed.data.proyectoPersonalId ?? undefined;
    if (parsed.data.entregableId !== undefined)
      cambios.entregableId = parsed.data.entregableId ?? undefined;
    if (parsed.data.tiempoEstimadoTotalMin !== undefined)
      cambios.tiempoEstimadoTotalMin =
        parsed.data.tiempoEstimadoTotalMin ?? undefined;
    if (parsed.data.documentacionUrl !== undefined)
      cambios.documentacionUrl = parsed.data.documentacionUrl ?? undefined;

    if (parsed.data.pasos !== undefined) {
      cambios.pasos = parsed.data.pasos.map((p, idx) => ({
        id:
          p.id ||
          `paso_${idx + 1}_${Math.random().toString(36).substring(2, 6)}`,
        orden: p.orden ?? idx + 1,
        titulo: p.titulo.trim(),
        descripcion: p.descripcion?.trim(),
        duracionEstimadaMin: p.duracionEstimadaMin,
        tipoSugerido: p.tipoSugerido,
        esObligatorio: p.esObligatorio ?? true,
      }));
    }

    try {
      await db.procedimiento.update(parsed.data.id, cambios);
      await QueueService.encolar("procedimiento", "editar", parsed.data.id, {
        id: parsed.data.id,
        ...cambios,
      });
      await registrarHistorialPersonal({
        entidadTipo: "procedimiento",
        entidadId: parsed.data.id,
        accion: "editar",
        descripcion: `Procedimiento "${existente.titulo}" actualizado.`,
        campoAnterior: { titulo: existente.titulo, activo: existente.activo },
        campoNuevo: cambios,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error
            ? err.message
            : "Error al editar el procedimiento."
        )
      );
    }
  }

  public async desactivarProcedimiento(id: string): Promise<Resultado<void>> {
    return this.editarProcedimiento({ id, activo: false });
  }

  public async activarProcedimiento(id: string): Promise<Resultado<void>> {
    return this.editarProcedimiento({ id, activo: true });
  }

  public async eliminarProcedimiento(id: string): Promise<Resultado<void>> {
    const item = await db.procedimiento.get(id);
    if (!item || item.eliminadoEn) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el procedimiento.")
      );
    }

    const ahora = Date.now();
    const cambios: Partial<Procedimiento> = {
      eliminadoEn: ahora,
      activo: false,
      actualizadoEn: ahora,
    };

    try {
      await db.procedimiento.update(id, cambios);
      await QueueService.encolar("procedimiento", "eliminar", id, {
        id,
        ...cambios,
      });
      await registrarHistorialPersonal({
        entidadTipo: "procedimiento",
        entidadId: id,
        accion: "eliminar",
        descripcion: `Procedimiento "${item.titulo}" eliminado (soft-delete).`,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error
            ? err.message
            : "Error al eliminar el procedimiento."
        )
      );
    }
  }

  public async obtenerPorId(id: string): Promise<Resultado<Procedimiento>> {
    const item = await db.procedimiento.get(id);
    if (!item || item.eliminadoEn) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el procedimiento.")
      );
    }
    return Resultado.exito(item);
  }

  public async listar(
    filtros?: FiltroProcedimientos
  ): Promise<Procedimiento[]> {
    let items = await db.procedimiento.toArray();
    items = items.filter((p) => !p.eliminadoEn);

    if (filtros?.soloActivos !== false) {
      items = items.filter((p) => p.activo);
    }
    if (filtros?.categoria) {
      items = items.filter((p) => p.categoria === filtros.categoria);
    }
    if (filtros?.clienteId) {
      items = items.filter((p) => p.clienteId === filtros.clienteId);
    }
    if (filtros?.areaId) {
      items = items.filter((p) => p.areaId === filtros.areaId);
    }
    if (filtros?.proyectoPersonalId) {
      items = items.filter(
        (p) => p.proyectoPersonalId === filtros.proyectoPersonalId
      );
    }
    if (filtros?.entregableId) {
      items = items.filter((p) => p.entregableId === filtros.entregableId);
    }
    if (filtros?.busqueda) {
      const q = filtros.busqueda.toLowerCase().trim();
      items = items.filter(
        (p) =>
          p.titulo.toLowerCase().includes(q) ||
          (p.descripcion && p.descripcion.toLowerCase().includes(q)) ||
          p.pasos.some((s) => s.titulo.toLowerCase().includes(q))
      );
    }

    return items.sort((a, b) => {
      const timeA = a.ultimoEjecutadoEn ?? a.creadoEn;
      const timeB = b.ultimoEjecutadoEn ?? b.creadoEn;
      return timeB - timeA;
    });
  }

  public async importarProcedimientos(
    input: ImportarProcedimientosInput
  ): Promise<
    Resultado<{
      creados: number;
      omitidos: number;
      errores: string[];
    }>
  > {
    const parsed = importarProcedimientosSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(
        new ErrorDominio(parsed.error.issues.map((i) => i.message).join(" — "))
      );
    }

    let creados = 0;
    let omitidos = 0;
    const errores: string[] = [];

    for (const item of parsed.data.procedimientosNuevos) {
      const existente = await db.procedimiento
        .filter(
          (p) =>
            !p.eliminadoEn &&
            p.titulo.trim().toLowerCase() === item.titulo.trim().toLowerCase()
        )
        .first();

      if (existente) {
        omitidos++;
        continue;
      }

      const res = await this.crearProcedimiento({
        titulo: item.titulo,
        descripcion: item.descripcion,
        categoria: item.categoria,
        clienteId: item.clienteId,
        areaId: item.areaId,
        proyectoPersonalId: item.proyectoPersonalId,
        entregableId: item.entregableId,
        pasos: item.pasos,
      });

      if (res.ok) {
        creados++;
      } else {
        errores.push(`Procedimiento "${item.titulo}": ${res.error!.mensaje}`);
      }
    }

    return Resultado.exito({ creados, omitidos, errores });
  }
}
