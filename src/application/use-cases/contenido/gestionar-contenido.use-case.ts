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
  IDS_PLANTILLA_VIEJA,
  SECCIONES_GUION_DEFAULT,
  TAREAS_PRODUCCION_DEFAULT,
  type CicloSemanal,
  type CrearIdeaInput,
  type DiasCinta,
  type FichaContenido,
  type GuardarGuionInput,
  type MezclaSemanal,
  type PlanPieza,
  type TareaPendiente,
  type TipoContenido,
} from "../../../domain/entidades/contenido.entity";
import {
  distribuirPublicaciones,
  diaISODeMs,
  planInicial,
  semanaDeCiclo,
  TAREA_GRABAR,
  tipoDeUnidad,
  totalMezcla,
} from "../../../domain/entidades/contenido-semana.entity";
import type {
  GuionesIA,
  IdeasIA,
  PlanSemanaIA,
} from "../../../domain/entidades/contenido-ia.entity";
import {
  lunesDeLaSemana,
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";
import { GestionarEntregablesUseCase } from "../personal/gestionar-entregables.use-case";

const PLANTILLA_DEFAULT_ID = "plantilla_default";

function idUnico(prefijo: string): string {
  return `${prefijo}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

const mismoTitulo = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

export interface OpcionesCiclo {
  /** Lunes de la semana a planificar (por defecto, el de esta semana). */
  semanaInicio?: string;
  mezcla?: MezclaSemanal;
  diasCinta?: DiasCinta;
}

export interface ExtrasPieza {
  ficha?: FichaContenido;
  plan?: PlanPieza;
}

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
    const id = idUnico("idea");
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
    ideaIds: string[],
    opciones: OpcionesCiclo = {}
  ): Promise<Resultado<string>> {
    const ahora = Date.now();
    const id = idUnico("ciclo");
    const mezcla = opciones.mezcla ?? { Video: objetivoVideos };
    const registro: CicloSemanal = {
      id,
      fechaInicio: ahora,
      objetivoVideos: mezcla.Video ?? objetivoVideos,
      semanaInicio:
        opciones.semanaInicio ?? lunesDeLaSemana(obtenerDiaTareaHoy()),
      mezcla,
      diasCinta: opciones.diasCinta,
      estado: "activo",
      creadoEn: ahora,
    };
    try {
      await db.ciclo_semanal.add(registro);
      await QueueService.encolar("ciclo_semanal", "crear", id, { ...registro });

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
    ideaId?: string,
    extras: ExtrasPieza = {}
  ): Promise<Resultado<string>> {
    const parsed = guardarGuionSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const ahora = Date.now();
    const id = idUnico("cont");
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
      plan: extras.plan,
      ficha: extras.ficha,
      diaEstimado: extras.plan?.publicacion,
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
      if (existente.estado !== "Publicado") {
        await this.sumarAMetasDelPlan(
          existente.tipoContenido,
          fechaPublicacion
        );
      }
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al publicar."
        )
      );
    }
  }

  /**
   * Publicar una pieza suma +1 a la meta del plan que cuenta ese tipo (el
   * Entregable activo con unidad "videos", "posts"…), así "Metas de la
   * semana" refleja el avance sin cargarlo dos veces. Solo si hay exactamente
   * UN entregable candidato: si hay ninguno o varios, no adivina.
   */
  private async sumarAMetasDelPlan(
    tipo: TipoContenido,
    fechaPublicacion: number
  ): Promise<void> {
    const dia = diaISODeMs(fechaPublicacion);
    const candidatos = (
      await db.entregable.where("estado").equals("activo").toArray()
    ).filter(
      (e) =>
        tipoDeUnidad(e.unidad) === tipo &&
        e.cantidadObjetivo !== undefined &&
        e.diaInicio <= dia &&
        dia <= e.diaLimite
    );
    if (candidatos.length !== 1) return;
    await new GestionarEntregablesUseCase().anotarAvance(
      candidatos[0].id,
      1,
      dia
    );
  }

  // ------------------------------------------------------------------------
  // Planificación de la semana (dinámica: mezcla y días se arman cada semana)
  // ------------------------------------------------------------------------

  public async actualizarSemana(
    cicloId: string,
    cambios: { mezcla?: MezclaSemanal; diasCinta?: DiasCinta }
  ): Promise<Resultado<void>> {
    const ciclo = await db.ciclo_semanal.get(cicloId);
    if (!ciclo) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la semana.")
      );
    }
    const parche: Partial<CicloSemanal> = { ...cambios };
    if (cambios.mezcla) parche.objetivoVideos = cambios.mezcla.Video ?? 0;
    await db.ciclo_semanal.update(cicloId, parche);
    await QueueService.encolar("ciclo_semanal", "editar", cicloId, parche);
    return Resultado.exito(undefined);
  }

  public async asignarPlan(
    contenidoId: string,
    plan: PlanPieza
  ): Promise<Resultado<void>> {
    const c = await db.contenido.get(contenidoId);
    if (!c) {
      return Resultado.falla(new ErrorNoEncontrado("No se encontró la pieza."));
    }
    const nuevo = { ...(c.plan ?? {}), ...plan };
    const parche = {
      plan: nuevo,
      diaEstimado: nuevo.publicacion,
      actualizadoEn: Date.now(),
    };
    await db.contenido.update(contenidoId, parche);
    await QueueService.encolar("contenido", "editar", contenidoId, parche);
    return Resultado.exito(undefined);
  }

  public async actualizarFicha(
    contenidoId: string,
    ficha: FichaContenido
  ): Promise<Resultado<void>> {
    const c = await db.contenido.get(contenidoId);
    if (!c) {
      return Resultado.falla(new ErrorNoEncontrado("No se encontró la pieza."));
    }
    const parche = {
      ficha: { ...(c.ficha ?? {}), ...ficha },
      actualizadoEn: Date.now(),
    };
    await db.contenido.update(contenidoId, parche);
    await QueueService.encolar("contenido", "editar", contenidoId, parche);
    return Resultado.exito(undefined);
  }

  /** Crea las piezas que faltan para cumplir la mezcla de la semana (títulos "Video 1", "Post 2"…), con el plan inicial por defecto. Devuelve cuántas creó. */
  public async crearPiezasFaltantes(
    cicloId: string
  ): Promise<Resultado<number>> {
    const ciclo = await db.ciclo_semanal.get(cicloId);
    if (!ciclo) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la semana.")
      );
    }
    const mezcla = ciclo.mezcla ?? {};
    const lunes = semanaDeCiclo(ciclo);
    const existentes = await db.contenido
      .where("cicloId")
      .equals(cicloId)
      .toArray();
    let creadas = 0;
    for (const tipo of Object.keys(mezcla) as TipoContenido[]) {
      const objetivo = mezcla[tipo] ?? 0;
      const hay = existentes.filter((c) => c.tipoContenido === tipo).length;
      for (let i = hay; i < objetivo; i++) {
        const res = await this.crearContenidoDesdeIdea(
          cicloId,
          {
            titulo: `${tipo} ${i + 1}`,
            tipoContenido: tipo,
            canales: [],
            guion: {},
          },
          undefined,
          { plan: planInicial(lunes, ciclo.diasCinta) }
        );
        if (res.ok) creadas++;
      }
    }
    return Resultado.exito(creadas);
  }

  /** Reparte los días de publicación de todas las piezas de la semana (tipo por tipo, rotando entre los días permitidos). */
  public async distribuirPublicaciones(
    cicloId: string,
    diasPorTipo: Partial<Record<TipoContenido, number[]>>
  ): Promise<Resultado<number>> {
    const ciclo = await db.ciclo_semanal.get(cicloId);
    if (!ciclo) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la semana.")
      );
    }
    const piezas = await db.contenido
      .where("cicloId")
      .equals(cicloId)
      .toArray();
    const reparto = distribuirPublicaciones(
      piezas.map((p) => ({ id: p.id, tipo: p.tipoContenido })),
      diasPorTipo,
      semanaDeCiclo(ciclo)
    );
    for (const [id, dia] of Object.entries(reparto)) {
      await this.asignarPlan(id, { publicacion: dia });
    }
    return Resultado.exito(Object.keys(reparto).length);
  }

  // ------------------------------------------------------------------------
  // Importación de lo que devuelve la IA (una por etapa)
  // ------------------------------------------------------------------------

  public async importarIdeasIA(
    cicloId: string,
    datos: IdeasIA
  ): Promise<Resultado<number>> {
    const previas = (await db.idea_contenido.toArray()).map((i) => i.texto);
    let creadas = 0;
    for (const item of datos.ideas) {
      if (previas.some((t) => mismoTitulo(t, item.texto))) continue;
      const id = idUnico("idea");
      const registro = {
        id,
        texto: item.texto,
        dolorSemana: item.dolorSemana || undefined,
        estado: item.seleccionar
          ? ("Seleccionada" as const)
          : ("Backlog" as const),
        cicloId: item.seleccionar ? cicloId : undefined,
        creadoEn: Date.now(),
      };
      await db.idea_contenido.add(registro);
      await QueueService.encolar("idea_contenido", "crear", id, registro);
      creadas++;
    }
    return Resultado.exito(creadas);
  }

  public async importarPlanIA(
    cicloId: string,
    datos: PlanSemanaIA
  ): Promise<Resultado<{ creadas: number; actualizadas: number }>> {
    const ciclo = await db.ciclo_semanal.get(cicloId);
    if (!ciclo) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la semana.")
      );
    }
    if (datos.mezcla) {
      await this.actualizarSemana(cicloId, { mezcla: datos.mezcla });
    }
    const lunes = semanaDeCiclo(ciclo);
    const ideas = await db.idea_contenido.toArray();
    const existentes = await db.contenido
      .where("cicloId")
      .equals(cicloId)
      .toArray();
    let creadas = 0;
    let actualizadas = 0;
    for (const p of datos.piezas) {
      const ficha: FichaContenido = {
        pilar: p.pilar,
        persona: p.persona,
        serie: p.serie,
        modulo: p.modulo,
        keyword: p.keyword,
      };
      const plan: PlanPieza = {
        ...planInicial(lunes, ciclo.diasCinta),
        ...(p.dias ?? {}),
      };
      const previa = existentes.find((c) => mismoTitulo(c.titulo, p.titulo));
      if (previa) {
        await this.actualizarFicha(previa.id, ficha);
        await this.asignarPlan(previa.id, plan);
        actualizadas++;
        continue;
      }
      const idea = p.idea
        ? ideas.find((i) => mismoTitulo(i.texto, p.idea!))
        : undefined;
      if (idea && idea.estado !== "Seleccionada") {
        await db.idea_contenido.update(idea.id, {
          estado: "Seleccionada",
          cicloId,
        });
        await QueueService.encolar("idea_contenido", "editar", idea.id, {
          estado: "Seleccionada",
          cicloId,
        });
      }
      const res = await this.crearContenidoDesdeIdea(
        cicloId,
        {
          titulo: p.titulo,
          tipoContenido: p.tipoContenido,
          canales: p.canales,
          guion: {},
        },
        idea?.id,
        { ficha, plan }
      );
      if (res.ok) creadas++;
    }
    return Resultado.exito({ creadas, actualizadas });
  }

  public async importarGuionesIA(
    cicloId: string,
    datos: GuionesIA
  ): Promise<Resultado<{ creados: number; actualizados: number }>> {
    const existentes = await db.contenido
      .where("cicloId")
      .equals(cicloId)
      .toArray();
    let creados = 0;
    let actualizados = 0;
    for (const g of datos.guiones) {
      const previo = existentes.find((c) => mismoTitulo(c.titulo, g.titulo));
      if (previo) {
        await this.guardarGuion(previo.id, {
          titulo: previo.titulo,
          tipoContenido: g.tipoContenido ?? previo.tipoContenido,
          canales: g.canales ?? previo.canales,
          guion: { ...previo.guion, ...g.guion },
        });
        actualizados++;
      } else {
        const res = await this.crearContenidoDesdeIdea(cicloId, {
          titulo: g.titulo,
          tipoContenido: g.tipoContenido ?? "Video",
          canales: g.canales ?? [],
          guion: g.guion,
        });
        if (res.ok) creados++;
      }
    }
    return Resultado.exito({ creados, actualizados });
  }

  /** Si la plantilla guardada sigue siendo la vieja (7 secciones), la pasa a la del SOP; si el usuario ya la editó, no la toca. */
  public async asegurarPlantillaSop(): Promise<boolean> {
    const actual = await db.plantilla_guion.get(PLANTILLA_DEFAULT_ID);
    if (!actual) return false;
    const ids = actual.secciones
      .map((s) => s.id)
      .sort()
      .join(",");
    if (ids !== [...IDS_PLANTILLA_VIEJA].sort().join(",")) return false;
    await this.editarPlantillaGuion(SECCIONES_GUION_DEFAULT);
    return true;
  }

  /**
   * Marca (o desmarca) una pieza como grabada. Si todavía estaba en Guion, la
   * pasa a Producción con su checklist — así queda lista para la edición.
   */
  public async marcarGrabado(
    contenidoId: string,
    grabado = true
  ): Promise<Resultado<void>> {
    const c = await db.contenido.get(contenidoId);
    if (!c) {
      return Resultado.falla(new ErrorNoEncontrado("No se encontró la pieza."));
    }
    if (c.estado === "Guion") {
      const r = await this.avanzarAProduccion(contenidoId);
      if (!r.ok) return r;
    }
    const actual = (await db.contenido.get(contenidoId))!;
    const previas = actual.tareasPendientes ?? [];
    const tareas: TareaPendiente[] = previas.some(
      (t) => t.texto === TAREA_GRABAR
    )
      ? previas.map((t) =>
          t.texto === TAREA_GRABAR ? { ...t, hecha: grabado } : t
        )
      : [
          {
            id: `tarea_${Date.now()}_grabar`,
            texto: TAREA_GRABAR,
            hecha: grabado,
          },
          ...previas,
        ];
    return this.guardarTareas(contenidoId, tareas);
  }

  /** Marca varias piezas como grabadas de una (el lote del día). */
  public async marcarGrabadoLote(ids: string[]): Promise<Resultado<number>> {
    let n = 0;
    for (const id of ids) {
      const r = await this.marcarGrabado(id, true);
      if (r.ok) n++;
    }
    return Resultado.exito(n);
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

      const viejo = await db.ciclo_semanal.get(cicloViejoId);
      const lunesHoy = lunesDeLaSemana(obtenerDiaTareaHoy());
      const siguiente = viejo ? sumarDias(semanaDeCiclo(viejo), 7) : lunesHoy;
      const nuevoCiclo = await this.iniciarCiclo(objetivoVideos, [], {
        semanaInicio: siguiente > lunesHoy ? siguiente : lunesHoy,
        mezcla:
          viejo?.mezcla && totalMezcla(viejo.mezcla) > 0
            ? { ...viejo.mezcla, Video: objetivoVideos }
            : undefined,
        diasCinta: viejo?.diasCinta,
      });
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
