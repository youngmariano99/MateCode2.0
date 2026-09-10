import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  crearObjetivoSchema,
  ajustarObjetivoSchema,
  type CrearObjetivoInput,
  type AjustarObjetivoInput,
  type ObjetivoCuantificable,
} from "../../../domain/entidades/objetivo-cuantificable.entity";

function idObjetivo(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Objetivos cuantitativos: todo objetivo lleva cantidad + fecha límite, sin
 * excepción — de ahí sale el ritmo necesario solo, en vez de que el usuario
 * tenga que recalcularlo a mano cada vez que se atrasa o se adelanta (ver
 * calcularRitmoObjetivo en el dominio).
 */
export class GestionarObjetivosUseCase {
  public async crearObjetivo(
    input: CrearObjetivoInput
  ): Promise<Resultado<string>> {
    const parsed = crearObjetivoSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const ahora = Date.now();
    const id = idObjetivo();
    const registro: ObjetivoCuantificable = {
      id,
      titulo: parsed.data.titulo.trim(),
      unidad: parsed.data.unidad.trim(),
      cantidadObjetivo: parsed.data.cantidadObjetivo,
      progresoActual: 0,
      diaInicio: parsed.data.diaInicio,
      diaLimite: parsed.data.diaLimite,
      area: parsed.data.area,
      estado: "activo",
      origenModulo: parsed.data.origenModulo,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    try {
      await db.objetivo_cuantificable.add(registro);
      await QueueService.encolar("objetivo_cuantificable", "crear", id, {
        ...registro,
      });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear el objetivo."
        )
      );
    }
  }

  /** Suma `cantidad` al progreso — ej. "hoy hice 3 contactos más". */
  public async registrarAvance(
    id: string,
    cantidad: number
  ): Promise<Resultado<void>> {
    if (!Number.isFinite(cantidad) || cantidad === 0) {
      return Resultado.falla(
        new ErrorDominio("Ingresá una cantidad distinta de cero.")
      );
    }
    const objetivo = await db.objetivo_cuantificable.get(id);
    if (!objetivo) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el objetivo.")
      );
    }
    const progresoActual = Math.max(0, objetivo.progresoActual + cantidad);
    const estado =
      progresoActual >= objetivo.cantidadObjetivo &&
      objetivo.estado === "activo"
        ? ("cumplido" as const)
        : objetivo.estado;
    const actualizadoEn = Date.now();
    try {
      await db.objetivo_cuantificable.update(id, {
        progresoActual,
        estado,
        actualizadoEn,
      });
      await QueueService.encolar("objetivo_cuantificable", "editar", id, {
        id,
        progresoActual,
        estado,
        actualizadoEn,
      });
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
   * Reajuste en un clic: cambiar la cantidad objetivo o la fecha límite (o
   * ambas) sin ningún ritual — cubre tanto "corré la fecha" como "bajá la
   * meta" cuando un desvío real hace que la planificación original ya no
   * tenga sentido.
   */
  public async ajustarObjetivo(
    input: AjustarObjetivoInput
  ): Promise<Resultado<void>> {
    const parsed = ajustarObjetivoSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const objetivo = await db.objetivo_cuantificable.get(parsed.data.id);
    if (!objetivo) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el objetivo.")
      );
    }
    if (
      parsed.data.cantidadObjetivo === undefined &&
      parsed.data.diaLimite === undefined
    ) {
      return Resultado.falla(
        new ErrorDominio("Indicá una nueva cantidad, una nueva fecha, o ambas.")
      );
    }
    const actualizadoEn = Date.now();
    const cambios: Partial<ObjetivoCuantificable> = { actualizadoEn };
    if (parsed.data.cantidadObjetivo !== undefined) {
      cambios.cantidadObjetivo = parsed.data.cantidadObjetivo;
    }
    if (parsed.data.diaLimite !== undefined) {
      cambios.diaLimite = parsed.data.diaLimite;
    }
    // Un reajuste reactiva un objetivo que había quedado vencido — es
    // justamente la vía para "salvarlo" en vez de abandonarlo.
    if (objetivo.estado === "vencido") {
      cambios.estado = "activo";
    }
    try {
      await db.objetivo_cuantificable.update(parsed.data.id, cambios);
      await QueueService.encolar(
        "objetivo_cuantificable",
        "editar",
        parsed.data.id,
        { id: parsed.data.id, ...cambios }
      );
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al ajustar el objetivo."
        )
      );
    }
  }

  public async archivarObjetivo(id: string): Promise<Resultado<void>> {
    const objetivo = await db.objetivo_cuantificable.get(id);
    if (!objetivo) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el objetivo.")
      );
    }
    const actualizadoEn = Date.now();
    try {
      await db.objetivo_cuantificable.update(id, {
        estado: "archivado",
        actualizadoEn,
      });
      await QueueService.encolar("objetivo_cuantificable", "editar", id, {
        id,
        estado: "archivado",
        actualizadoEn,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al archivar el objetivo."
        )
      );
    }
  }

  /**
   * Marca vencidos los objetivos activos cuya fecha límite ya pasó — se
   * corre al entrar a la vista de objetivos, no en segundo plano, para no
   * sumar infraestructura de jobs por algo tan chico.
   */
  public async marcarVencidosSiCorresponde(hoy: string): Promise<void> {
    const activos = await db.objetivo_cuantificable
      .where("estado")
      .equals("activo")
      .toArray();
    const vencidos = activos.filter(
      (o) => o.diaLimite < hoy && o.progresoActual < o.cantidadObjetivo
    );
    for (const o of vencidos) {
      const actualizadoEn = Date.now();
      await db.objetivo_cuantificable.update(o.id, {
        estado: "vencido",
        actualizadoEn,
      });
      await QueueService.encolar("objetivo_cuantificable", "editar", o.id, {
        id: o.id,
        estado: "vencido",
        actualizadoEn,
      });
    }
  }
}
