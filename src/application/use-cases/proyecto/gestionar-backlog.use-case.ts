import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorValidacion,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";

export interface EpicaPayload {
  id?: string;
  nombre: string;
  descripcion?: string;
}

export interface HistoriaPayload {
  id?: string;
  epicaId?: string;
  sprintId?: string;
  titulo: string;
  descripcion?: string;
  prioridad: string;
  estimacion: number;
  dependencias?: string[];
  etiquetas?: string[];
  estado?: string;
}

export interface SprintPayload {
  id?: string;
  nombre: string;
  duracionSemanas: number;
  fechaInicio?: number;
  fechaFin?: number;
  objetivo: string;
  descripcion: string;
  capacidad: number;
  miembros: string[];
  historiasIds: string[];
}

export class GestionarBacklogUseCase {
  public async crearEpica(
    proyectoId: string,
    payload: EpicaPayload
  ): Promise<Resultado<string>> {
    if (!payload.nombre.trim()) {
      return Resultado.falla(
        new ErrorValidacion("El nombre de la épica es obligatorio.")
      );
    }

    const id = payload.id || `epi_${Date.now()}`;
    await db.epicas.put({
      id,
      proyectoId,
      nombre: payload.nombre,
      descripcion: payload.descripcion || "",
      creadoEn: Date.now(),
    });

    return Resultado.exito(id);
  }

  public async crearHistoriaUsuario(
    proyectoId: string,
    payload: HistoriaPayload
  ): Promise<Resultado<string>> {
    if (!payload.titulo.trim()) {
      return Resultado.falla(
        new ErrorValidacion("El título de la historia es obligatorio.")
      );
    }

    const id = payload.id || `his_${Date.now()}`;
    await db.historias.put({
      id,
      proyectoId,
      epicaId: payload.epicaId || "",
      sprintId: payload.sprintId || "",
      titulo: payload.titulo,
      descripcion: payload.descripcion || "",
      prioridad: payload.prioridad || "Media",
      estimacion:
        typeof payload.estimacion === "number" ? payload.estimacion : 1,
      estado: payload.estado || "backlog",
      dependencias: payload.dependencias || [],
      etiquetas: payload.etiquetas || [],
      creadoEn: Date.now(),
    });

    return Resultado.exito(id);
  }

  public async actualizarEstadoHistoria(
    historiaId: string,
    nuevoEstado: string
  ): Promise<Resultado<void>> {
    const us = await db.historias.get(historiaId);
    if (!us) {
      return Resultado.falla(new ErrorNoEncontrado("Historia no encontrada."));
    }

    await db.historias.put({
      ...us,
      estado: nuevoEstado,
    });

    return Resultado.exito(undefined);
  }

  public async planificarSprint(
    proyectoId: string,
    payload: SprintPayload
  ): Promise<Resultado<string>> {
    if (!payload.nombre.trim()) {
      return Resultado.falla(
        new ErrorValidacion("El nombre del sprint es obligatorio.")
      );
    }

    const id = payload.id || `spr_${Date.now()}`;
    const start = payload.fechaInicio || Date.now();
    const end =
      payload.fechaFin ||
      start + payload.duracionSemanas * 7 * 24 * 60 * 60 * 1000;

    await db.sprints.put({
      id,
      proyectoId,
      nombre: payload.nombre,
      duracionSemanas: payload.duracionSemanas,
      fechaInicio: start,
      fechaFin: end,
      objetivo: payload.objetivo || "",
      descripcion: payload.descripcion || "",
      capacidad: payload.capacidad || 10,
      miembros: payload.miembros || [],
      estado: "activo",
      creadoEn: Date.now(),
    });

    for (const hId of payload.historiasIds) {
      const us = await db.historias.get(hId);
      if (us) {
        await db.historias.put({
          ...us,
          sprintId: id,
          estado: "todo",
        });
      }
    }

    return Resultado.exito(id);
  }

  public async finalizarSprint(sprintId: string): Promise<Resultado<void>> {
    const spr = await db.sprints.get(sprintId);
    if (!spr) {
      return Resultado.falla(new ErrorNoEncontrado("Sprint no encontrado."));
    }

    await db.sprints.put({
      ...spr,
      estado: "finalizado",
      finalizadoEn: Date.now(),
    });

    const historias = await db.historias
      .where("sprintId")
      .equals(sprintId)
      .toArray();

    for (const us of historias) {
      if (us.estado === "done") {
        await db.historias.put({
          ...us,
          completada: true,
        });
      } else {
        await db.historias.put({
          ...us,
          sprintId: "",
          estado: "backlog",
        });
      }
    }

    return Resultado.exito(undefined);
  }
}
