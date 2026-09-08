import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  crearIdeaSchema,
  guardarGuionSchema,
  TAREAS_PRODUCCION_DEFAULT,
  type CrearIdeaInput,
  type GuardarGuionInput,
  type TareaPendiente,
} from "../../../domain/entidades/contenido.entity";

const PLANTILLA_DEFAULT_ID = "plantilla_default";

/**
 * Reemplaza la lógica inline del planificador de contenido viejo: capa de
 * dominio tipada + persistencia consistente con el resto del sistema
 * (Resultado/ErrorDominio + cola de sync), mismo patrón que
 * gestionar-contacto-frio.use-case.ts.
 */
export class GestionarContenidoUseCase {
  public async crearIdea(input: CrearIdeaInput): Promise<Resultado<string>> {
    const parsed = crearIdeaSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const ahora = Date.now();
    const id = `idea_${ahora}`;
    const registro = {
      id,
      texto: parsed.data.texto.trim(),
      dolorSemana: parsed.data.dolorSemana?.trim() || undefined,
      estado: "Backlog" as const,
      creadoEn: ahora,
    };
    try {
      await db.idea_contenido.add(registro);
      await QueueService.encolar("idea_contenido", "crear", id, registro);
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear la idea."
        )
      );
    }
  }

  public async iniciarCiclo(
    objetivoVideos: number,
    ideaIds: string[]
  ): Promise<Resultado<string>> {
    const ahora = Date.now();
    const id = `ciclo_${ahora}`;
    const registro = {
      id,
      fechaInicio: ahora,
      objetivoVideos,
      estado: "activo" as const,
      creadoEn: ahora,
    };
    try {
      await db.ciclo_semanal.add(registro);
      await QueueService.encolar("ciclo_semanal", "crear", id, registro);

      for (const ideaId of ideaIds) {
        await db.idea_contenido.update(ideaId, {
          estado: "Seleccionada",
          cicloId: id,
        });
        await QueueService.encolar("idea_contenido", "editar", ideaId, {
          estado: "Seleccionada",
          cicloId: id,
        });
      }
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al iniciar el ciclo."
        )
      );
    }
  }

  public async crearContenidoDesdeIdea(
    cicloId: string,
    input: GuardarGuionInput,
    ideaId?: string
  ): Promise<Resultado<string>> {
    const parsed = guardarGuionSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const ahora = Date.now();
    const id = `cont_${ahora}`;
    const registro = {
      id,
      ideaId,
      cicloId,
      titulo: parsed.data.titulo.trim(),
      tipoContenido: parsed.data.tipoContenido,
      canales: parsed.data.canales,
      estado: "Guion" as const,
      guion: parsed.data.guion,
      plantillaGuionId: PLANTILLA_DEFAULT_ID,
      tareasPendientes: [] as TareaPendiente[],
      metricas: {},
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    try {
      await db.contenido.add(registro);
      await QueueService.encolar("contenido", "crear", id, registro);
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear el contenido."
        )
      );
    }
  }

  public async guardarGuion(
    contenidoId: string,
    input: GuardarGuionInput
  ): Promise<Resultado<void>> {
    const parsed = guardarGuionSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const existente = await db.contenido.get(contenidoId);
    if (!existente) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el contenido.")
      );
    }
    const ahora = Date.now();
    const cambios = {
      titulo: parsed.data.titulo.trim(),
      tipoContenido: parsed.data.tipoContenido,
      canales: parsed.data.canales,
      guion: parsed.data.guion,
      actualizadoEn: ahora,
    };
    try {
      await db.contenido.update(contenidoId, cambios);
      await QueueService.encolar("contenido", "editar", contenidoId, cambios);
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al guardar el guion."
        )
      );
    }
  }

  /** Al entrar a Producción, si no tiene tareas cargadas, arranca con el checklist por defecto. */
  public async avanzarAProduccion(
    contenidoId: string
  ): Promise<Resultado<void>> {
    const existente = await db.contenido.get(contenidoId);
    if (
      existente &&
      (!existente.tareasPendientes || existente.tareasPendientes.length === 0)
    ) {
      const ahora = Date.now();
      const tareas: TareaPendiente[] = TAREAS_PRODUCCION_DEFAULT.map(
        (texto, i) => ({
          id: `tarea_${ahora}_${i}`,
          texto,
          hecha: false,
        })
      );
      await db.contenido.update(contenidoId, { tareasPendientes: tareas });
      await QueueService.encolar("contenido", "editar", contenidoId, {
        tareasPendientes: tareas,
      });
    }
    return this.cambiarEstado(contenidoId, "Producción");
  }

  private async cambiarEstado(
    contenidoId: string,
    estado: "Guion" | "Producción" | "Publicado"
  ): Promise<Resultado<void>> {
    const existente = await db.contenido.get(contenidoId);
    if (!existente) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el contenido.")
      );
    }
    const ahora = Date.now();
    try {
      await db.contenido.update(contenidoId, { estado, actualizadoEn: ahora });
      await QueueService.encolar("contenido", "editar", contenidoId, {
        estado,
        actualizadoEn: ahora,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al cambiar el estado."
        )
      );
    }
  }

  public async agregarTareaPendiente(
    contenidoId: string,
    texto: string
  ): Promise<Resultado<void>> {
    if (!texto.trim()) {
      return Resultado.falla(
        new ErrorDominio("La tarea no puede estar vacía.")
      );
    }
    const existente = await db.contenido.get(contenidoId);
    if (!existente) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el contenido.")
      );
    }
    const tareas: TareaPendiente[] = [
      ...(existente.tareasPendientes || []),
      { id: `tarea_${Date.now()}`, texto: texto.trim(), hecha: false },
    ];
    return this.guardarTareas(contenidoId, tareas);
  }

  public async marcarTarea(
    contenidoId: string,
    tareaId: string,
    hecha: boolean
  ): Promise<Resultado<void>> {
    const existente = await db.contenido.get(contenidoId);
    if (!existente) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el contenido.")
      );
    }
    const tareas = (existente.tareasPendientes || []).map((t) =>
      t.id === tareaId ? { ...t, hecha } : t
    );
    return this.guardarTareas(contenidoId, tareas);
  }

  private async guardarTareas(
    contenidoId: string,
    tareas: TareaPendiente[]
  ): Promise<Resultado<void>> {
    const ahora = Date.now();
    try {
      await db.contenido.update(contenidoId, {
        tareasPendientes: tareas,
        actualizadoEn: ahora,
      });
      await QueueService.encolar("contenido", "editar", contenidoId, {
        tareasPendientes: tareas,
        actualizadoEn: ahora,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al guardar las tareas."
        )
      );
    }
  }

  public async publicar(
    contenidoId: string,
    fechaPublicacion: number
  ): Promise<Resultado<void>> {
    const existente = await db.contenido.get(contenidoId);
    if (!existente) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el contenido.")
      );
    }
    const ahora = Date.now();
    const cambios = {
      estado: "Publicado" as const,
      fechaPublicacion,
      actualizadoEn: ahora,
    };
    try {
      await db.contenido.update(contenidoId, cambios);
      await QueueService.encolar("contenido", "editar", contenidoId, cambios);
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al publicar."
        )
      );
    }
  }

  /** Se puede llamar en cualquier momento después de publicado — las métricas se cargan unos días después. */
  public async actualizarMetricas(
    contenidoId: string,
    metricas: Record<string, number>
  ): Promise<Resultado<void>> {
    const existente = await db.contenido.get(contenidoId);
    if (!existente) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el contenido.")
      );
    }
    const ahora = Date.now();
    const nuevasMetricas = { ...existente.metricas, ...metricas };
    try {
      await db.contenido.update(contenidoId, {
        metricas: nuevasMetricas,
        actualizadoEn: ahora,
      });
      await QueueService.encolar("contenido", "editar", contenidoId, {
        metricas: nuevasMetricas,
        actualizadoEn: ahora,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al cargar las métricas."
        )
      );
    }
  }

  /** Un solo guardado, sin versionado — cada contenido conserva sus propios valores aunque la plantilla cambie después. */
  public async editarPlantillaGuion(
    secciones: {
      id: string;
      etiqueta: string;
      grupo: "principal" | "extra";
      orden: number;
    }[]
  ): Promise<Resultado<void>> {
    try {
      await db.plantilla_guion.update(PLANTILLA_DEFAULT_ID, { secciones });
      await QueueService.encolar(
        "plantilla_guion",
        "editar",
        PLANTILLA_DEFAULT_ID,
        {
          secciones,
        }
      );
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al editar la plantilla."
        )
      );
    }
  }

  public async crearKpi(
    nombre: string,
    meta?: number,
    unidad?: string
  ): Promise<Resultado<string>> {
    if (!nombre.trim()) {
      return Resultado.falla(
        new ErrorDominio("El nombre del KPI no puede estar vacío.")
      );
    }
    const ahora = Date.now();
    const id = `kpi_${ahora}`;
    const registro = {
      id,
      nombre: nombre.trim(),
      meta,
      unidad,
      esDelUsuario: true,
      creadoEn: ahora,
    };
    try {
      await db.catalogo_kpi_contenido.add(registro);
      await QueueService.encolar(
        "catalogo_kpi_contenido",
        "crear",
        id,
        registro
      );
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear el KPI."
        )
      );
    }
  }

  /**
   * Cierre de semana: aplica en lote lo que se decidió para cada pendiente
   * (idea o contenido) que no llegó a "Publicado", y arranca el ciclo nuevo.
   */
  public async cerrarSemanaYcrearNueva(
    cicloViejoId: string,
    objetivoVideos: number,
    decisiones: {
      tipo: "idea" | "contenido";
      id: string;
      accion: "completar" | "siguiente" | "eliminar";
    }[]
  ): Promise<Resultado<string>> {
    try {
      await db.ciclo_semanal.update(cicloViejoId, { estado: "cerrado" });
      await QueueService.encolar("ciclo_semanal", "editar", cicloViejoId, {
        estado: "cerrado",
      });

      const nuevoCiclo = await this.iniciarCiclo(objetivoVideos, []);
      if (!nuevoCiclo.ok) return nuevoCiclo;
      const nuevoCicloId = nuevoCiclo.valor;

      for (const d of decisiones) {
        if (d.tipo === "idea") {
          if (d.accion === "eliminar") {
            await db.idea_contenido.delete(d.id);
            await QueueService.encolar("idea_contenido", "eliminar", d.id, {});
          } else if (d.accion === "siguiente") {
            await db.idea_contenido.update(d.id, { cicloId: nuevoCicloId });
            await QueueService.encolar("idea_contenido", "editar", d.id, {
              cicloId: nuevoCicloId,
            });
          } else {
            await db.idea_contenido.update(d.id, { estado: "Descartada" });
            await QueueService.encolar("idea_contenido", "editar", d.id, {
              estado: "Descartada",
            });
          }
        } else {
          if (d.accion === "eliminar") {
            await db.contenido.delete(d.id);
            await QueueService.encolar("contenido", "eliminar", d.id, {});
          } else if (d.accion === "siguiente") {
            await db.contenido.update(d.id, { cicloId: nuevoCicloId });
            await QueueService.encolar("contenido", "editar", d.id, {
              cicloId: nuevoCicloId,
            });
          } else {
            const ahora = Date.now();
            await db.contenido.update(d.id, {
              estado: "Publicado",
              fechaPublicacion: ahora,
              actualizadoEn: ahora,
            });
            await QueueService.encolar("contenido", "editar", d.id, {
              estado: "Publicado",
              fechaPublicacion: ahora,
              actualizadoEn: ahora,
            });
          }
        }
      }
      return Resultado.exito(nuevoCicloId);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al cerrar la semana."
        )
      );
    }
  }
}
