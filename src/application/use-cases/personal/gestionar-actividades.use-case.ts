import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  crearActividadSchema,
  migrarActividadSchema,
  cerrarConCantidadSchema,
  repartirFondoSchema,
  type CerrarConCantidadInput,
  type RepartirFondoInput,
  type CrearActividadInput,
  type MigrarActividadInput,
  type MotivoDesvio,
  type BucketDia,
  bucketDeActividad,
  type Actividad,
} from "../../../domain/entidades/actividad.entity";
import { registrarHistorialPersonal } from "../../servicios/registrar-historial-personal.service";
import { recomputarEntregable } from "../../servicios/recomputar-progreso-personal.service";
import {
  lunesDeLaSemana,
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";
import {
  agregarAlFondo,
  sumarOCrearEnDia,
} from "../../servicios/trasladar-faltante.service";

function idActividad(): string {
  return `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Actividad — día a día, hoja de la jerarquía. `entregableId` es opcional:
 * una actividad suelta (sin Entregable arriba) sigue siendo válida.
 *
 * Sin tope duro por día (cambio post-Sprint 20: antes el Búnker bloqueaba a
 * partir de 1 enfoque + 3 mantenimiento; ahora esos números son solo una
 * cantidad *recomendada* — ver MAX_TAREAS_* en actividad.entity.ts — que la
 * UI y los prompts de IA usan como guía, pero nunca bloquean crear una más
 * si el usuario, después de resolver esas, quiere seguir agregando.
 */
export class GestionarActividadesUseCase {
  public async crearActividad(
    input: CrearActividadInput
  ): Promise<Resultado<string>> {
    const parsed = crearActividadSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }

    let entregable:
      | {
          id: string;
          proyectoId: string;
          objetivoId: string;
          titulo: string;
          tieneHijos: boolean;
        }
      | undefined;
    if (parsed.data.entregableId) {
      const fila = await db.entregable.get(parsed.data.entregableId);
      if (!fila) {
        return Resultado.falla(
          new ErrorNoEncontrado("No se encontró el entregable padre.")
        );
      }
      entregable = fila;
    }

    const ahora = Date.now();
    const id = idActividad();
    const registro: Actividad = {
      id,
      entregableId: entregable?.id,
      proyectoId: entregable?.proyectoId,
      objetivoId: entregable?.objetivoId,
      tipo: parsed.data.tipo,
      descripcion: parsed.data.descripcion.trim(),
      diaTarea: parsed.data.diaTarea,
      prioridad: parsed.data.prioridad,
      area: parsed.data.area,
      estado: "pendiente",
      cantidadObjetivo: parsed.data.cantidadObjetivo,
      cantidadMinima: parsed.data.cantidadMinima,
      unidad: parsed.data.unidad,
      semanaId: parsed.data.semanaId,
      recurrenciaId: parsed.data.recurrenciaId,
      origenInboxId: parsed.data.origenInboxId,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    try {
      await db.transaction(
        "rw",
        [db.actividad, db.entregable, db.cola_eventos],
        async () => {
          await db.actividad.add(registro);
          await QueueService.encolar("actividad", "crear", id, { ...registro });
          if (entregable && !entregable.tieneHijos) {
            await db.entregable.update(entregable.id, {
              tieneHijos: true,
              actualizadoEn: ahora,
            });
            await QueueService.encolar("entregable", "editar", entregable.id, {
              id: entregable.id,
              tieneHijos: true,
              actualizadoEn: ahora,
            });
          }
        }
      );
      await registrarHistorialPersonal({
        entidadTipo: "actividad",
        entidadId: id,
        accion: "crear",
        descripcion: entregable
          ? `Actividad "${registro.descripcion}" creada bajo "${entregable.titulo}".`
          : `Actividad suelta "${registro.descripcion}" creada.`,
      });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear la actividad."
        )
      );
    }
  }

  /**
   * Nota ("voy a hacer" / "hice") y proyecto de trabajo de una actividad.
   * Se puede editar antes de hacerla, al completarla o después. `null` borra
   * el valor; `undefined` lo deja como está.
   */
  public async editarDetalle(
    id: string,
    cambios: { nota?: string | null; proyectoTrabajoId?: string | null }
  ): Promise<Resultado<void>> {
    const actividad = await db.actividad.get(id);
    if (!actividad) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la actividad.")
      );
    }
    const local: Partial<Actividad> = { actualizadoEn: Date.now() };
    const remoto: Record<string, unknown> = {
      id,
      actualizadoEn: local.actualizadoEn,
    };
    if (cambios.nota !== undefined) {
      const nota = cambios.nota === null ? "" : cambios.nota.trim();
      local.nota = nota === "" ? undefined : nota;
      remoto.nota = nota === "" ? null : nota;
    }
    if (cambios.proyectoTrabajoId !== undefined) {
      local.proyectoTrabajoId = cambios.proyectoTrabajoId ?? undefined;
      remoto.proyectoTrabajoId = cambios.proyectoTrabajoId;
    }
    try {
      await db.actividad.update(id, local);
      await QueueService.encolar("actividad", "editar", id, remoto);
      await registrarHistorialPersonal({
        entidadTipo: "actividad",
        entidadId: id,
        accion: "editar",
        descripcion: `Detalle de "${actividad.descripcion}" actualizado${
          cambios.proyectoTrabajoId !== undefined ? " (proyecto)" : ""
        }${cambios.nota !== undefined ? " (nota)" : ""}.`,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al guardar el detalle."
        )
      );
    }
  }

  public async completarActividad(id: string): Promise<Resultado<void>> {
    return this.cambiarEstado(id, "completada");
  }

  public async cancelarActividad(
    id: string,
    motivo?: MotivoDesvio
  ): Promise<Resultado<void>> {
    return this.cambiarEstado(id, "cancelada", motivo);
  }

  public async descartarActividad(id: string): Promise<Resultado<void>> {
    return this.cambiarEstado(id, "descartada");
  }

  private async cambiarEstado(
    id: string,
    estado: "completada" | "cancelada" | "descartada",
    motivo?: MotivoDesvio
  ): Promise<Resultado<void>> {
    const actividad = await db.actividad.get(id);
    if (!actividad) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la actividad.")
      );
    }
    const actualizadoEn = Date.now();
    try {
      await db.actividad.update(id, { estado, actualizadoEn });
      await QueueService.encolar("actividad", "editar", id, {
        id,
        estado,
        actualizadoEn,
      });
      await registrarHistorialPersonal({
        entidadTipo: "actividad",
        entidadId: id,
        accion: "editar",
        descripcion: `Actividad "${actividad.descripcion}" → ${estado}.`,
        campoNuevo: motivo ? { estado, motivo } : undefined,
      });
      if (actividad.entregableId) {
        await recomputarEntregable(actividad.entregableId);
      }
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error
            ? err.message
            : "Error al actualizar la actividad."
        )
      );
    }
  }

  /**
   * Cambia una tarea PENDIENTE de categoría en un toque: "prioridad" (enfoque),
   * "mantenimiento" o "si_llego" (puede esperar). No toca fechas, cantidades ni
   * progreso — solo cómo se ordena y se distingue en la agenda.
   */
  public async reclasificarActividad(
    id: string,
    destino: BucketDia
  ): Promise<Resultado<void>> {
    const actividad = await db.actividad.get(id);
    if (!actividad) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la actividad.")
      );
    }
    if (actividad.estado !== "pendiente" || actividad.tipo === "backlog") {
      return Resultado.falla(
        new ErrorDominio("Solo se reclasifica una tarea pendiente del día.")
      );
    }
    if (bucketDeActividad(actividad) === destino) {
      return Resultado.exito(undefined);
    }
    const actualizadoEn = Date.now();
    const cambios: Partial<Actividad> =
      destino === "prioridad"
        ? { tipo: "enfoque", prioridad: undefined }
        : destino === "mantenimiento"
          ? { tipo: "mantenimiento", prioridad: undefined }
          : { prioridad: "puede_esperar" };
    try {
      await db.actividad.update(id, { ...cambios, actualizadoEn });
      await QueueService.encolar("actividad", "editar", id, {
        id,
        ...cambios,
        prioridad: cambios.prioridad ?? null,
        actualizadoEn,
      });
      await registrarHistorialPersonal({
        entidadTipo: "actividad",
        entidadId: id,
        accion: "editar",
        descripcion: `Actividad "${actividad.descripcion}" reclasificada a ${destino}.`,
        campoAnterior: { bucket: bucketDeActividad(actividad) },
        campoNuevo: { bucket: destino },
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al reclasificar."
        )
      );
    }
  }

  /**
   * Trae a hoy todo lo que quedó sin cerrar de días anteriores, de una:
   * las cuantificables pasan SOLO su faltante (y se suman a la de hoy si ya
   * existe), las que ya cumplieron su meta se completan, el resto se migra.
   */
  public async pasarPendientesAHoy(
    hoy: string
  ): Promise<
    Resultado<{ pasadas: number; completadas: number; errores: string[] }>
  > {
    const viejas = (
      await db.actividad
        .where("estado")
        .equals("pendiente")
        .and((a) => a.tipo !== "backlog" && !!a.diaTarea && a.diaTarea < hoy)
        .toArray()
    ).sort((a, b) => ((a.diaTarea ?? "") < (b.diaTarea ?? "") ? -1 : 1));
    let pasadas = 0;
    let completadas = 0;
    const errores: string[] = [];
    for (const a of viejas) {
      const cumplida =
        a.cantidadObjetivo !== undefined &&
        (a.progresoActual ?? 0) >= a.cantidadObjetivo;
      const res = cumplida
        ? await this.completarActividad(a.id)
        : await this.migrarActividad({ id: a.id, nuevoDiaTarea: hoy });
      if (!res.ok) errores.push(`"${a.descripcion}": ${res.error!.mensaje}`);
      else if (cumplida) completadas++;
      else pasadas++;
    }
    return Resultado.exito({ pasadas, completadas, errores });
  }

  /** Suma `cantidad` al progreso de una actividad cuantificada (ej. "escribí 300 de 500 palabras"). */
  public async registrarAvance(
    id: string,
    cantidad: number
  ): Promise<Resultado<void>> {
    if (!Number.isFinite(cantidad) || cantidad === 0) {
      return Resultado.falla(
        new ErrorDominio("Ingresá una cantidad distinta de cero.")
      );
    }
    const actividad = await db.actividad.get(id);
    if (!actividad) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la actividad.")
      );
    }
    // A diferencia de Entregable/Proyecto/Objetivo (donde cantidadObjetivo es
    // una meta declarada de antemano), una Actividad puede ser una instancia
    // materializada de un Entregable recurrente (ver materializar-actividades-
    // del-dia.use-case.ts) cuya cantidad del día no se sabe hasta hacerla —
    // "cuántos contactos hice hoy" no tiene un objetivo diario fijo. Por eso
    // acá SÍ se permite registrar avance sin cantidadObjetivo predeclarada.
    const progresoActual = Math.max(
      0,
      (actividad.progresoActual ?? 0) + cantidad
    );
    const estado =
      actividad.cantidadObjetivo !== undefined &&
      progresoActual >= actividad.cantidadObjetivo &&
      actividad.estado === "pendiente"
        ? ("completada" as const)
        : actividad.estado;
    const actualizadoEn = Date.now();
    try {
      await db.actividad.update(id, { progresoActual, estado, actualizadoEn });
      await QueueService.encolar("actividad", "editar", id, {
        id,
        progresoActual,
        estado,
        actualizadoEn,
      });
      await registrarHistorialPersonal({
        entidadTipo: "actividad",
        entidadId: id,
        accion: "registrar_avance",
        descripcion: `+${cantidad} ${actividad.unidad ?? ""}`.trim(),
      });
      if (actividad.entregableId) {
        await recomputarEntregable(actividad.entregableId);
      }
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al registrar el avance."
        )
      );
    }
  }

  /**
   * Migración intencional (Bullet Journal). Para una tarea cuantificable
   * pasa SOLO lo que falta (meta - hecho): si ya tenía avance, la original
   * queda "completada" parcial con lo que sí se hizo (cuenta una sola vez),
   * y el faltante se suma a la tarea de ese día si ya existe (2 + 1 = 3) o
   * crea una nueva. Antes copiaba la actividad entera, avance incluido, y
   * ese avance contaba dos veces en el Entregable.
   */
  public async migrarActividad(
    input: MigrarActividadInput
  ): Promise<Resultado<string>> {
    const parsed = migrarActividadSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const original = await db.actividad.get(parsed.data.id);
    if (!original) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la actividad.")
      );
    }
    const ahora = Date.now();
    const cuantificada = original.cantidadObjetivo !== undefined;
    const hecha = original.progresoActual ?? 0;
    const faltante = cuantificada
      ? Math.max(0, original.cantidadObjetivo! - hecha)
      : 0;
    if (cuantificada && faltante === 0) {
      return Resultado.falla(
        new ErrorDominio(
          "Ya cumpliste la meta de esta actividad — marcala como hecha."
        )
      );
    }
    const estadoOriginal =
      cuantificada && hecha > 0
        ? ("completada" as const)
        : ("migrada" as const);
    let nuevoId = "";
    try {
      await db.transaction("rw", [db.actividad, db.cola_eventos], async () => {
        await db.actividad.update(original.id, {
          estado: estadoOriginal,
          actualizadoEn: ahora,
        });
        await QueueService.encolar("actividad", "editar", original.id, {
          id: original.id,
          estado: estadoOriginal,
          actualizadoEn: ahora,
        });
        if (cuantificada) {
          const res = await sumarOCrearEnDia(
            original,
            faltante,
            parsed.data.nuevoDiaTarea,
            original.tipo
          );
          nuevoId = res.id;
        } else {
          nuevoId = idActividad();
          const copia: Actividad = {
            ...original,
            id: nuevoId,
            diaTarea: parsed.data.nuevoDiaTarea,
            estado: "pendiente",
            progresoActual: undefined,
            fechaMigradaDesde: original.diaTarea,
            creadoEn: ahora,
            actualizadoEn: ahora,
          };
          await db.actividad.add(copia);
          await QueueService.encolar("actividad", "crear", nuevoId, {
            ...copia,
          });
        }
      });
      await registrarHistorialPersonal({
        entidadTipo: "actividad",
        entidadId: nuevoId,
        accion: "crear",
        descripcion: cuantificada
          ? `Migrado el faltante (${faltante}) desde ${original.diaTarea} a ${parsed.data.nuevoDiaTarea}.`
          : `Migrada desde ${original.diaTarea} a ${parsed.data.nuevoDiaTarea}.`,
        campoAnterior: { diaTarea: original.diaTarea },
        campoNuevo: { diaTarea: parsed.data.nuevoDiaTarea },
      });
      // El motivo se guarda sobre la actividad ORIGINAL (la que no se hizo),
      // no sobre la copia: así las estadísticas saben por qué se postergó
      // cada una, y el repaso no lo cuenta dos veces.
      if (parsed.data.motivo) {
        await registrarHistorialPersonal({
          entidadTipo: "actividad",
          entidadId: original.id,
          accion: "editar",
          descripcion: `Pasada de ${original.diaTarea} a ${parsed.data.nuevoDiaTarea}.`,
          campoNuevo: { estado: estadoOriginal, motivo: parsed.data.motivo },
        });
      }
      if (original.entregableId) {
        await recomputarEntregable(original.entregableId);
      }
      return Resultado.exito(nuevoId);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al migrar la actividad."
        )
      );
    }
  }

  /**
   * Cierra una tarea cuantificable con lo que realmente se hizo (`hecha`,
   * total del día — no incremental). Si quedó por debajo de la meta, `destino`
   * dice qué hacer con el faltante: "manana" (se suma a la tarea de mañana),
   * "fondo" (queda acumulado para repartir después) o "descartar". Con algo
   * hecho la tarea queda "completada" (parcial, cuenta solo lo hecho); sin
   * nada hecho, "migrada" si va a mañana o "cancelada" si no.
   */
  public async cerrarConCantidad(
    input: CerrarConCantidadInput
  ): Promise<Resultado<void>> {
    const parsed = cerrarConCantidadSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const { id, hecha, destino, motivo } = parsed.data;
    const actividad = await db.actividad.get(id);
    if (!actividad) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la actividad.")
      );
    }
    if (actividad.cantidadObjetivo === undefined) {
      return Resultado.falla(
        new ErrorDominio("Esta actividad no tiene una cantidad para contar.")
      );
    }
    if (actividad.estado !== "pendiente") {
      return Resultado.falla(
        new ErrorDominio("Esta actividad ya está resuelta.")
      );
    }
    const faltante = Math.max(0, actividad.cantidadObjetivo - hecha);
    if (faltante > 0 && !destino) {
      return Resultado.falla(
        new ErrorDominio("Elegí qué hacer con lo que faltó.")
      );
    }
    const estado =
      hecha > 0
        ? ("completada" as const)
        : destino === "manana"
          ? ("migrada" as const)
          : ("cancelada" as const);
    const ahora = Date.now();
    try {
      await db.transaction("rw", [db.actividad, db.cola_eventos], async () => {
        await db.actividad.update(id, {
          progresoActual: hecha,
          estado,
          actualizadoEn: ahora,
        });
        await QueueService.encolar("actividad", "editar", id, {
          id,
          progresoActual: hecha,
          estado,
          actualizadoEn: ahora,
        });
        if (faltante > 0 && destino === "manana") {
          await sumarOCrearEnDia(
            actividad,
            faltante,
            sumarDias(actividad.diaTarea ?? obtenerDiaTareaHoy(), 1),
            actividad.tipo
          );
        } else if (faltante > 0 && destino === "fondo") {
          await agregarAlFondo(actividad, faltante);
        }
      });
      await registrarHistorialPersonal({
        entidadTipo: "actividad",
        entidadId: id,
        accion: "editar",
        descripcion: `Actividad "${actividad.descripcion}" cerrada con ${hecha}/${actividad.cantidadObjetivo}${faltante > 0 ? ` — faltante ${faltante} → ${destino}` : ""}.`,
        campoNuevo: { estado, hecha, faltante, destino, motivo },
      });
      if (actividad.entregableId) {
        await recomputarEntregable(actividad.entregableId);
      }
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al cerrar la actividad."
        )
      );
    }
  }

  /**
   * Reparte lo acumulado en un fondo de faltantes en uno o varios días (cada
   * día se suma a la tarea de ese día si ya existe, o crea una). Lo que
   * sobre queda en el fondo; si se reparte todo, el fondo se descarta (no
   * "completada": una tarea completada sin avance contaría toda su meta).
   */
  public async repartirFondo(
    input: RepartirFondoInput
  ): Promise<Resultado<void>> {
    const parsed = repartirFondoSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const fondo = await db.actividad.get(parsed.data.fondoId);
    if (!fondo || !fondo.esFaltante || fondo.estado !== "pendiente") {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró ese fondo de faltantes.")
      );
    }
    const total = parsed.data.reparto.reduce((s, r) => s + r.cantidad, 0);
    const disponible = fondo.cantidadObjetivo ?? 0;
    if (total > disponible) {
      return Resultado.falla(
        new ErrorDominio(
          `Estás repartiendo ${total} pero el fondo tiene ${disponible}.`
        )
      );
    }
    const restante = disponible - total;
    const ahora = Date.now();
    try {
      await db.transaction("rw", [db.actividad, db.cola_eventos], async () => {
        for (const r of parsed.data.reparto) {
          await sumarOCrearEnDia(fondo, r.cantidad, r.dia, "mantenimiento");
        }
        const cambios =
          restante > 0
            ? { cantidadObjetivo: restante, actualizadoEn: ahora }
            : {
                cantidadObjetivo: 0,
                estado: "descartada" as const,
                actualizadoEn: ahora,
              };
        await db.actividad.update(fondo.id, cambios);
        await QueueService.encolar("actividad", "editar", fondo.id, {
          id: fondo.id,
          ...cambios,
        });
      });
      await registrarHistorialPersonal({
        entidadTipo: "actividad",
        entidadId: fondo.id,
        accion: "editar",
        descripcion: `Fondo de faltantes "${fondo.descripcion}": repartidos ${total} en ${parsed.data.reparto.length} día(s), quedan ${restante}.`,
        campoNuevo: { reparto: parsed.data.reparto, restante },
      });
      if (fondo.entregableId) {
        await recomputarEntregable(fondo.entregableId);
      }
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al repartir el fondo."
        )
      );
    }
  }

  /**
   * Promueve una Actividad de backlog a la agenda de hoy — crea una fila
   * nueva (enfoque/mantenimiento, sujeta al mismo tope diario) y marca la
   * de backlog como "completada" (cumplió su función), mismo criterio que
   * la migración Sprint 5 mapeó "promovida" de TareaPendiente.
   */
  public async promoverAAgenda(
    id: string,
    diaTarea: string,
    tipo: "enfoque" | "mantenimiento"
  ): Promise<Resultado<string>> {
    const pendiente = await db.actividad.get(id);
    if (!pendiente) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la actividad.")
      );
    }
    const creada = await this.crearActividad({
      tipo,
      diaTarea,
      descripcion: pendiente.descripcion,
      area: pendiente.area,
    });
    if (!creada.ok) return creada;

    const actualizadoEn = Date.now();
    await db.actividad.update(id, { estado: "completada", actualizadoEn });
    await QueueService.encolar("actividad", "editar", id, {
      id,
      estado: "completada",
      actualizadoEn,
    });
    return creada;
  }

  /**
   * "Armar la semana": asigna en lote las actividades de backlog elegidas a
   * la semana actual (lunes de hoy) — mismo patrón que tenía TareaPendiente.
   */
  public async asignarASemanaActual(ids: string[]): Promise<Resultado<void>> {
    if (ids.length === 0) {
      return Resultado.falla(new ErrorDominio("Elegí al menos una actividad."));
    }
    const semanaId = lunesDeLaSemana(obtenerDiaTareaHoy());
    const actualizadoEn = Date.now();
    try {
      for (const id of ids) {
        await db.actividad.update(id, { semanaId, actualizadoEn });
        await QueueService.encolar("actividad", "editar", id, {
          id,
          semanaId,
          actualizadoEn,
        });
      }
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al asignar a la semana."
        )
      );
    }
  }
}
