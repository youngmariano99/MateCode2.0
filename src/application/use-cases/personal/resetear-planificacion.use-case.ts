import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import { ErrorDominio } from "../../../domain/errores/error-base";
import type { AreaPersonal } from "../../../domain/entidades/area-personal.entity";
import type { ObjetivoCuantificable } from "../../../domain/entidades/objetivo-cuantificable.entity";
import type { ProyectoPersonal } from "../../../domain/entidades/proyecto-personal.entity";
import type { Entregable } from "../../../domain/entidades/entregable.entity";
import type { FasePersonal } from "../../../domain/entidades/fase-personal.entity";
import type { Actividad } from "../../../domain/entidades/actividad.entity";

export type ModoResetPlanificacion =
  "todo" | "desde_objetivos" | "desde_proyectos" | "solo_actividades";

export interface OpcionesResetPlanificacion {
  modo: ModoResetPlanificacion;
  areaId?: string;
  preservarCompletadas?: boolean;
  eliminarProcedimientos?: boolean;
}

export interface ConteoResetPlanificacion {
  areas: number;
  objetivos: number;
  proyectos: number;
  entregables: number;
  fases: number;
  actividades: number;
  procedimientos: number;
}

interface ElementosAfectados {
  areas: AreaPersonal[];
  objetivos: ObjetivoCuantificable[];
  proyectos: ProyectoPersonal[];
  entregables: Entregable[];
  fases: FasePersonal[];
  actividades: Actividad[];
  procedimientoIds: string[];
}

export class ResetearPlanificacionUseCase {
  private async recolectarElementos(
    opciones: OpcionesResetPlanificacion
  ): Promise<ElementosAfectados> {
    const { modo, areaId, preservarCompletadas, eliminarProcedimientos } =
      opciones;

    // 1. Recolectar todas las entidades base
    const [
      todasAreas,
      todosObjetivos,
      todosProyectos,
      todosEntregables,
      todasFases,
      todasActividades,
    ] = await Promise.all([
      db.area_personal.toArray(),
      db.objetivo_cuantificable.toArray(),
      db.proyecto_personal.toArray(),
      db.entregable.toArray(),
      db.fase_personal.toArray(),
      db.actividad.toArray(),
    ]);

    // Filtrar por área si se seleccionó una
    let areasEnAlcance: AreaPersonal[] = [];
    if (areaId) {
      areasEnAlcance = todasAreas.filter((a) => a.id === areaId);
    } else {
      areasEnAlcance = todasAreas;
    }
    const areaIdsSet = new Set(areasEnAlcance.map((a) => a.id));

    // Objetivos en alcance
    const objetivosEnAlcance = areaId
      ? todosObjetivos.filter((o) => o.areaId && areaIdsSet.has(o.areaId))
      : todosObjetivos;
    const objetivoIdsSet = new Set(objetivosEnAlcance.map((o) => o.id));

    // Proyectos en alcance
    const proyectosEnAlcance = areaId
      ? todosProyectos.filter((p) => objetivoIdsSet.has(p.objetivoId))
      : todosProyectos;
    const proyectoIdsSet = new Set(proyectosEnAlcance.map((p) => p.id));

    // Entregables en alcance
    const entregablesEnAlcance = areaId
      ? todosEntregables.filter(
          (e) =>
            proyectoIdsSet.has(e.proyectoId) ||
            (e.objetivoId && objetivoIdsSet.has(e.objetivoId))
        )
      : todosEntregables;
    const entregableIdsSet = new Set(entregablesEnAlcance.map((e) => e.id));

    // Fases en alcance
    const fasesEnAlcance = todasFases.filter((f) =>
      entregableIdsSet.has(f.entregableId)
    );

    // Actividades en alcance
    let actividadesEnAlcance = areaId
      ? todasActividades.filter(
          (a) =>
            (a.entregableId && entregableIdsSet.has(a.entregableId)) ||
            (a.proyectoId && proyectoIdsSet.has(a.proyectoId)) ||
            (a.objetivoId && objetivoIdsSet.has(a.objetivoId))
        )
      : todasActividades;

    if (preservarCompletadas) {
      actividadesEnAlcance = actividadesEnAlcance.filter(
        (a) => a.estado !== "completada"
      );
    }

    // Procedimientos
    let procedimientoIds: string[] = [];
    if (eliminarProcedimientos) {
      if (!areaId) {
        procedimientoIds = (await db.procedimiento
          .toCollection()
          .primaryKeys()) as string[];
      } else {
        // Procedimientos vinculados a las actividades o entregables en alcance
        const sopsEnActs = new Set(
          actividadesEnAlcance
            .map((a) => a.procedimientoId)
            .filter((id): id is string => Boolean(id))
        );
        procedimientoIds = Array.from(sopsEnActs);
      }
    }

    // Determinar qué se elimina efectivamente según el `modo`
    const resultado: ElementosAfectados = {
      areas: [],
      objetivos: [],
      proyectos: [],
      entregables: [],
      fases: [],
      actividades: [],
      procedimientoIds,
    };

    switch (modo) {
      case "todo":
        resultado.areas = areasEnAlcance;
        resultado.objetivos = objetivosEnAlcance;
        resultado.proyectos = proyectosEnAlcance;
        resultado.entregables = entregablesEnAlcance;
        resultado.fases = fasesEnAlcance;
        resultado.actividades = actividadesEnAlcance;
        break;

      case "desde_objetivos":
        resultado.areas = []; // Conserva áreas
        resultado.objetivos = objetivosEnAlcance;
        resultado.proyectos = proyectosEnAlcance;
        resultado.entregables = entregablesEnAlcance;
        resultado.fases = fasesEnAlcance;
        resultado.actividades = actividadesEnAlcance;
        break;

      case "desde_proyectos":
        resultado.areas = []; // Conserva áreas
        resultado.objetivos = []; // Conserva objetivos
        resultado.proyectos = proyectosEnAlcance;
        resultado.entregables = entregablesEnAlcance;
        resultado.fases = fasesEnAlcance;
        resultado.actividades = actividadesEnAlcance;
        break;

      case "solo_actividades":
        resultado.areas = [];
        resultado.objetivos = [];
        resultado.proyectos = [];
        resultado.entregables = []; // Conserva entregables
        resultado.fases = fasesEnAlcance;
        resultado.actividades = actividadesEnAlcance;
        break;
    }

    return resultado;
  }

  public async contar(
    opciones: OpcionesResetPlanificacion
  ): Promise<ConteoResetPlanificacion> {
    const elementos = await this.recolectarElementos(opciones);
    return {
      areas: elementos.areas.length,
      objetivos: elementos.objetivos.length,
      proyectos: elementos.proyectos.length,
      entregables: elementos.entregables.length,
      fases: elementos.fases.length,
      actividades: elementos.actividades.length,
      procedimientos: elementos.procedimientoIds.length,
    };
  }

  public async ejecutar(
    opciones: OpcionesResetPlanificacion
  ): Promise<Resultado<ConteoResetPlanificacion>> {
    try {
      const elementos = await this.recolectarElementos(opciones);

      await db.transaction(
        "rw",
        [
          db.area_personal,
          db.objetivo_cuantificable,
          db.proyecto_personal,
          db.entregable,
          db.fase_personal,
          db.actividad,
          db.personal_historial,
          db.habito_definicion,
          db.procedimiento,
          db.ejecucion_procedimiento,
          db.cola_eventos,
        ],
        async () => {
          // 1. Eliminar actividades
          for (const a of elementos.actividades) {
            await db.actividad.delete(a.id);
            await QueueService.encolar("actividad", "eliminar", a.id, {});
          }

          // 2. Eliminar fases
          for (const f of elementos.fases) {
            await db.fase_personal.delete(f.id);
            await QueueService.encolar("fase_personal", "eliminar", f.id, {});
          }

          // 3. Eliminar entregables
          for (const e of elementos.entregables) {
            await db.entregable.delete(e.id);
            await QueueService.encolar("entregable", "eliminar", e.id, {});
          }

          // 4. Eliminar proyectos
          for (const p of elementos.proyectos) {
            await db.proyecto_personal.delete(p.id);
            await QueueService.encolar(
              "proyecto_personal",
              "eliminar",
              p.id,
              {}
            );
          }

          // 5. Eliminar objetivos
          for (const o of elementos.objetivos) {
            await db.objetivo_cuantificable.delete(o.id);
            await QueueService.encolar(
              "objetivo_cuantificable",
              "eliminar",
              o.id,
              {}
            );
          }

          // 6. Eliminar áreas
          for (const a of elementos.areas) {
            await db.area_personal.delete(a.id);
            await QueueService.encolar("area_personal", "eliminar", a.id, {});
          }

          // 7. Desvincular hábitos que apuntaban a objetivos/proyectos/entregables eliminados
          const objIds = new Set(elementos.objetivos.map((o) => o.id));
          const proyIds = new Set(elementos.proyectos.map((p) => p.id));
          const entIds = new Set(elementos.entregables.map((e) => e.id));

          if (objIds.size > 0 || proyIds.size > 0 || entIds.size > 0) {
            const habitos = await db.habito_definicion.toArray();
            for (const h of habitos) {
              const desvincularObj = h.objetivoId && objIds.has(h.objetivoId);
              const desvincularProy = h.proyectoId && proyIds.has(h.proyectoId);
              const desvincularEnt =
                h.entregableId && entIds.has(h.entregableId);

              if (desvincularObj || desvincularProy || desvincularEnt) {
                const patch = {
                  objetivoId: desvincularObj ? undefined : h.objetivoId,
                  proyectoId: desvincularProy ? undefined : h.proyectoId,
                  entregableId: desvincularEnt ? undefined : h.entregableId,
                  actualizadoEn: Date.now(),
                };
                await db.habito_definicion.update(h.id, patch);
                await QueueService.encolar(
                  "habito_definicion",
                  "editar",
                  h.id,
                  {
                    ...patch,
                  }
                );
              }
            }
          }

          // 8. Resetear progresos de entidades supervivientes si se limpiaron hijos
          if (opciones.modo === "solo_actividades") {
            const entregablesRestantes = await db.entregable.toArray();
            for (const e of entregablesRestantes) {
              if (e.progresoActual !== 0) {
                await db.entregable.update(e.id, {
                  progresoActual: 0,
                  actualizadoEn: Date.now(),
                });
                await QueueService.encolar("entregable", "editar", e.id, {
                  progresoActual: 0,
                });
              }
            }
          }

          if (
            opciones.modo === "desde_proyectos" ||
            opciones.modo === "solo_actividades"
          ) {
            const objetivosRestantes =
              await db.objetivo_cuantificable.toArray();
            for (const o of objetivosRestantes) {
              if (o.progresoActual !== 0) {
                await db.objetivo_cuantificable.update(o.id, {
                  progresoActual: 0,
                  actualizadoEn: Date.now(),
                });
                await QueueService.encolar(
                  "objetivo_cuantificable",
                  "editar",
                  o.id,
                  {
                    progresoActual: 0,
                  }
                );
              }
            }
          }

          // 9. Eliminar procedimientos si fue solicitado
          for (const procId of elementos.procedimientoIds) {
            await db.procedimiento.delete(procId);
            await QueueService.encolar("procedimiento", "eliminar", procId, {});
            const ejecuciones = await db.ejecucion_procedimiento
              .where("procedimientoId")
              .equals(procId)
              .toArray();
            for (const ej of ejecuciones) {
              await db.ejecucion_procedimiento.delete(ej.id);
              await QueueService.encolar(
                "ejecucion_procedimiento",
                "eliminar",
                ej.id,
                {}
              );
            }
          }

          // 10. Si fue borrado total del sistema, limpiar historial personal
          if (opciones.modo === "todo" && !opciones.areaId) {
            await db.personal_historial.clear();
          }
        }
      );

      return Resultado.exito({
        areas: elementos.areas.length,
        objetivos: elementos.objetivos.length,
        proyectos: elementos.proyectos.length,
        entregables: elementos.entregables.length,
        fases: elementos.fases.length,
        actividades: elementos.actividades.length,
        procedimientos: elementos.procedimientoIds.length,
      });
    } catch (err) {
      console.error("Error al resetear planificación:", err);
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error
            ? err.message
            : "Error al resetear la planificación."
        )
      );
    }
  }
}
