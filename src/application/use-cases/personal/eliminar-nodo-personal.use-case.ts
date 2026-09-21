import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import { registrarHistorialPersonal } from "../../servicios/registrar-historial-personal.service";
import {
  recomputarObjetivo,
  recomputarProyecto,
} from "../../servicios/recomputar-progreso-personal.service";

export type NivelJerarquiaPersonal =
  "area" | "objetivo" | "proyecto" | "entregable";

export interface ConteoDescendientesPersonal {
  areas?: number;
  objetivos?: number;
  proyectos?: number;
  entregables?: number;
  actividades?: number;
  /** No se eliminan — quedan sin vínculo (ver Decisión A: hábitos son independientes de la jerarquía). */
  habitosVinculados?: number;
}

async function porAnyOf<T>(
  ids: string[],
  buscar: (ids: string[]) => Promise<T[]>
): Promise<T[]> {
  if (ids.length === 0) return [];
  return buscar(ids);
}

/**
 * Borrado en cascada de un nodo no-hoja de la jerarquía, con conteo real
 * ANTES de tocar nada (contarDescendientes) — la pieza que hoy no existe en
 * ningún lado del código (todo borrado existente usa confirm() con texto
 * genérico fijo, sin contar nada). Actividad no tiene borrado en cascada acá
 * porque es la hoja: se elimina directo con GestionarActividadesUseCase.
 *
 * Los Hábitos vinculados (entregableId/proyectoId/objetivoId) NUNCA se
 * eliminan en cascada — tienen su propio ciclo de vida e historial
 * (HabitoRegistro) independiente (Decisión A). Al borrar su padre, solo se
 * les limpia el vínculo colgante, nunca se pierde el hábito en sí.
 */
export class EliminarNodoPersonalUseCase {
  public async contarDescendientes(
    nivel: NivelJerarquiaPersonal,
    id: string
  ): Promise<Resultado<ConteoDescendientesPersonal>> {
    try {
      if (nivel === "area") {
        const objetivoIds = (
          await db.objetivo_cuantificable.where("areaId").equals(id).toArray()
        ).map((o) => o.id);
        const [proyectos, entregables, actividades, habitos] =
          await Promise.all([
            porAnyOf(objetivoIds, (ids) =>
              db.proyecto_personal.where("objetivoId").anyOf(ids).toArray()
            ),
            porAnyOf(objetivoIds, (ids) =>
              db.entregable.where("objetivoId").anyOf(ids).toArray()
            ),
            porAnyOf(objetivoIds, (ids) =>
              db.actividad.where("objetivoId").anyOf(ids).toArray()
            ),
            porAnyOf(objetivoIds, (ids) =>
              db.habito_definicion.where("objetivoId").anyOf(ids).toArray()
            ),
          ]);
        return Resultado.exito({
          objetivos: objetivoIds.length,
          proyectos: proyectos.length,
          entregables: entregables.length,
          actividades: actividades.length,
          habitosVinculados: habitos.length,
        });
      }

      if (nivel === "objetivo") {
        const [proyectos, entregables, actividades, habitos] =
          await Promise.all([
            db.proyecto_personal.where("objetivoId").equals(id).toArray(),
            db.entregable.where("objetivoId").equals(id).toArray(),
            db.actividad.where("objetivoId").equals(id).toArray(),
            db.habito_definicion.where("objetivoId").equals(id).toArray(),
          ]);
        return Resultado.exito({
          proyectos: proyectos.length,
          entregables: entregables.length,
          actividades: actividades.length,
          habitosVinculados: habitos.length,
        });
      }

      if (nivel === "proyecto") {
        const [entregables, actividades, habitos] = await Promise.all([
          db.entregable.where("proyectoId").equals(id).toArray(),
          db.actividad.where("proyectoId").equals(id).toArray(),
          db.habito_definicion.where("proyectoId").equals(id).toArray(),
        ]);
        return Resultado.exito({
          entregables: entregables.length,
          actividades: actividades.length,
          habitosVinculados: habitos.length,
        });
      }

      // entregable
      const [actividades, habitos] = await Promise.all([
        db.actividad.where("entregableId").equals(id).toArray(),
        db.habito_definicion.where("entregableId").equals(id).toArray(),
      ]);
      return Resultado.exito({
        actividades: actividades.length,
        habitosVinculados: habitos.length,
      });
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error
            ? err.message
            : "Error al contar lo que depende de este elemento."
        )
      );
    }
  }

  /**
   * Limpia lo que quedó colgando de padres que ya no existen (borrados hechos
   * antes de que existiera el borrado en cascada, o interrumpidos): Objetivos
   * cuya Área no existe, Proyectos sin Objetivo, Entregables sin Proyecto. Cada
   * uno se borra con su cascada normal (actividades, fases, vínculos de
   * hábitos). Devuelve cuántos nodos se limpiaron por nivel.
   */
  public async limpiarHuerfanos(): Promise<{
    objetivos: number;
    proyectos: number;
    entregables: number;
  }> {
    const conteo = { objetivos: 0, proyectos: 0, entregables: 0 };

    const areas = new Set(
      (await db.area_personal.toCollection().primaryKeys()) as string[]
    );
    for (const o of await db.objetivo_cuantificable.toArray()) {
      if (o.areaId && !areas.has(o.areaId)) {
        if ((await this.ejecutar("objetivo", o.id)).ok) conteo.objetivos++;
      }
    }

    // Objetivos SIN área (datos viejos): el navegador solo baja Área →
    // Objetivo, así que los Proyectos que cuelgan de ellos no se ven en ningún
    // lado. Se limpian sus Proyectos (con su cascada); el Objetivo en sí se
    // conserva porque puede seguir usándose desde el widget de otro módulo.
    const sinArea = new Set(
      (await db.objetivo_cuantificable.toArray())
        .filter((o) => !o.areaId)
        .map((o) => o.id)
    );
    for (const p of await db.proyecto_personal.toArray()) {
      if (sinArea.has(p.objetivoId)) {
        if ((await this.ejecutar("proyecto", p.id)).ok) conteo.proyectos++;
      }
    }

    const objetivos = new Set(
      (await db.objetivo_cuantificable.toCollection().primaryKeys()) as string[]
    );
    for (const p of await db.proyecto_personal.toArray()) {
      if (!objetivos.has(p.objetivoId)) {
        if ((await this.ejecutar("proyecto", p.id)).ok) conteo.proyectos++;
      }
    }

    const proyectos = new Set(
      (await db.proyecto_personal.toCollection().primaryKeys()) as string[]
    );
    for (const e of await db.entregable.toArray()) {
      if (!proyectos.has(e.proyectoId)) {
        if ((await this.ejecutar("entregable", e.id)).ok) conteo.entregables++;
      }
    }
    return conteo;
  }

  public async ejecutar(
    nivel: NivelJerarquiaPersonal,
    id: string
  ): Promise<Resultado<void>> {
    try {
      switch (nivel) {
        case "area":
          return await this.eliminarArea(id);
        case "objetivo":
          return await this.eliminarObjetivo(id);
        case "proyecto":
          return await this.eliminarProyecto(id);
        case "entregable":
          return await this.eliminarEntregable(id);
      }
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al eliminar en cascada."
        )
      );
    }
  }

  private async eliminarEntregable(id: string): Promise<Resultado<void>> {
    const entregable = await db.entregable.get(id);
    if (!entregable) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el entregable.")
      );
    }
    const actualizadoEn = Date.now();
    await db.transaction(
      "rw",
      [
        db.entregable,
        db.actividad,
        db.habito_definicion,
        db.fase_personal,
        db.cola_eventos,
      ],
      async () => {
        const actividades = await db.actividad
          .where("entregableId")
          .equals(id)
          .toArray();
        for (const a of actividades) {
          await db.actividad.delete(a.id);
          await QueueService.encolar("actividad", "eliminar", a.id, {});
        }
        const fases = await db.fase_personal
          .where("entregableId")
          .equals(id)
          .toArray();
        for (const f of fases) {
          await db.fase_personal.delete(f.id);
          await QueueService.encolar("fase_personal", "eliminar", f.id, {});
        }
        const habitos = await db.habito_definicion
          .where("entregableId")
          .equals(id)
          .toArray();
        for (const h of habitos) {
          await db.habito_definicion.update(h.id, {
            entregableId: undefined,
            actualizadoEn,
          });
          await QueueService.encolar("habito_definicion", "editar", h.id, {
            id: h.id,
            entregableId: null,
            actualizadoEn,
          });
        }
        await db.entregable.delete(id);
        await QueueService.encolar("entregable", "eliminar", id, {});
      }
    );
    await registrarHistorialPersonal({
      entidadTipo: "entregable",
      entidadId: id,
      accion: "eliminar",
      descripcion: `Entregable "${entregable.titulo}" eliminado.`,
    });
    await recomputarProyecto(entregable.proyectoId);
    return Resultado.exito(undefined);
  }

  private async eliminarProyecto(id: string): Promise<Resultado<void>> {
    const proyecto = await db.proyecto_personal.get(id);
    if (!proyecto) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el proyecto.")
      );
    }
    const actualizadoEn = Date.now();
    await db.transaction(
      "rw",
      [
        db.proyecto_personal,
        db.entregable,
        db.actividad,
        db.habito_definicion,
        db.fase_personal,
        db.cola_eventos,
      ],
      async () => {
        const actividades = await db.actividad
          .where("proyectoId")
          .equals(id)
          .toArray();
        for (const a of actividades) {
          await db.actividad.delete(a.id);
          await QueueService.encolar("actividad", "eliminar", a.id, {});
        }
        const entregables = await db.entregable
          .where("proyectoId")
          .equals(id)
          .toArray();
        for (const e of entregables) {
          const fases = await db.fase_personal
            .where("entregableId")
            .equals(e.id)
            .toArray();
          for (const f of fases) {
            await db.fase_personal.delete(f.id);
            await QueueService.encolar("fase_personal", "eliminar", f.id, {});
          }
          await db.entregable.delete(e.id);
          await QueueService.encolar("entregable", "eliminar", e.id, {});
        }
        const habitos = await db.habito_definicion
          .where("proyectoId")
          .equals(id)
          .toArray();
        for (const h of habitos) {
          await db.habito_definicion.update(h.id, {
            proyectoId: undefined,
            entregableId: undefined,
            actualizadoEn,
          });
          await QueueService.encolar("habito_definicion", "editar", h.id, {
            id: h.id,
            proyectoId: null,
            entregableId: null,
            actualizadoEn,
          });
        }
        await db.proyecto_personal.delete(id);
        await QueueService.encolar("proyecto_personal", "eliminar", id, {});
      }
    );
    await registrarHistorialPersonal({
      entidadTipo: "proyecto",
      entidadId: id,
      accion: "eliminar",
      descripcion: `Proyecto "${proyecto.titulo}" eliminado.`,
    });
    await recomputarObjetivo(proyecto.objetivoId);
    return Resultado.exito(undefined);
  }

  private async eliminarObjetivo(id: string): Promise<Resultado<void>> {
    const objetivo = await db.objetivo_cuantificable.get(id);
    if (!objetivo) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el objetivo.")
      );
    }
    const actualizadoEn = Date.now();
    await db.transaction(
      "rw",
      [
        db.objetivo_cuantificable,
        db.proyecto_personal,
        db.entregable,
        db.actividad,
        db.habito_definicion,
        db.fase_personal,
        db.cola_eventos,
      ],
      async () => {
        const actividades = await db.actividad
          .where("objetivoId")
          .equals(id)
          .toArray();
        for (const a of actividades) {
          await db.actividad.delete(a.id);
          await QueueService.encolar("actividad", "eliminar", a.id, {});
        }
        const entregables = await db.entregable
          .where("objetivoId")
          .equals(id)
          .toArray();
        for (const e of entregables) {
          const fases = await db.fase_personal
            .where("entregableId")
            .equals(e.id)
            .toArray();
          for (const f of fases) {
            await db.fase_personal.delete(f.id);
            await QueueService.encolar("fase_personal", "eliminar", f.id, {});
          }
          await db.entregable.delete(e.id);
          await QueueService.encolar("entregable", "eliminar", e.id, {});
        }
        const proyectos = await db.proyecto_personal
          .where("objetivoId")
          .equals(id)
          .toArray();
        for (const p of proyectos) {
          await db.proyecto_personal.delete(p.id);
          await QueueService.encolar("proyecto_personal", "eliminar", p.id, {});
        }
        const habitos = await db.habito_definicion
          .where("objetivoId")
          .equals(id)
          .toArray();
        for (const h of habitos) {
          await db.habito_definicion.update(h.id, {
            objetivoId: undefined,
            proyectoId: undefined,
            entregableId: undefined,
            actualizadoEn,
          });
          await QueueService.encolar("habito_definicion", "editar", h.id, {
            id: h.id,
            objetivoId: null,
            proyectoId: null,
            entregableId: null,
            actualizadoEn,
          });
        }
        await db.objetivo_cuantificable.delete(id);
        await QueueService.encolar(
          "objetivo_cuantificable",
          "eliminar",
          id,
          {}
        );
      }
    );
    await registrarHistorialPersonal({
      entidadTipo: "objetivo",
      entidadId: id,
      accion: "eliminar",
      descripcion: `Objetivo "${objetivo.titulo}" eliminado.`,
    });
    return Resultado.exito(undefined);
  }

  private async eliminarArea(id: string): Promise<Resultado<void>> {
    const area = await db.area_personal.get(id);
    if (!area) {
      return Resultado.falla(new ErrorNoEncontrado("No se encontró el área."));
    }
    const objetivos = await db.objetivo_cuantificable
      .where("areaId")
      .equals(id)
      .toArray();
    // Reusa eliminarObjetivo (misma transacción por objetivo, secuencial) para
    // no duplicar la lógica de cascada — un área rara vez tiene tantos
    // objetivos como para que esto sea un problema de rendimiento.
    for (const o of objetivos) {
      const res = await this.eliminarObjetivo(o.id);
      if (!res.ok) return res;
    }
    await db.area_personal.delete(id);
    await QueueService.encolar("area_personal", "eliminar", id, {});
    await registrarHistorialPersonal({
      entidadTipo: "area",
      entidadId: id,
      accion: "eliminar",
      descripcion: `Área "${area.nombre}" eliminada (con ${objetivos.length} objetivo(s)).`,
    });
    return Resultado.exito(undefined);
  }
}
