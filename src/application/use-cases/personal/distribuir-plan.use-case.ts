import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  expandirReparto,
  repartirEnListaDeDias,
  diasDelRango,
  type EntregableSugerido,
  type RepartoExpandido,
  type RepartoJson,
} from "../../../domain/entidades/distribucion-personal.entity";
import { GestionarEntregablesUseCase } from "./gestionar-entregables.use-case";
import { GestionarActividadesUseCase } from "./gestionar-actividades.use-case";

export interface EntradaCrearEntregables {
  proyectoId: string;
  partes: EntregableSugerido[];
  unidad: string;
  /** Si viene, además se arman las Actividades diarias de cada entregable (paso 2 encadenado). */
  reparto?: Pick<RepartoJson, "descripcion" | "tipo" | "diasSemana">;
}

export interface EntradaRepartirEnDias {
  entregableId: string;
  descripcion: string;
  tipo: "enfoque" | "mantenimiento";
  unidad?: string;
  diaInicio: string;
  diaLimite: string;
  diasSemana: number[];
  total: number;
}

/**
 * El "asistente de dos pasos": convierte una meta numérica en la estructura
 * concreta — Entregables por parte y Actividades diarias con cantidad — para
 * que el día a día sea una planilla lista, sin tener que armar cada pieza a
 * mano. Delega la creación en los use-cases existentes (mismas validaciones,
 * auditoría y progreso); acá solo se orquesta y se hace la cuenta.
 */
export class DistribuirPlanUseCase {
  private readonly entregables = new GestionarEntregablesUseCase();
  private readonly actividades = new GestionarActividadesUseCase();

  /**
   * Crea una Actividad por día con su cantidad. Sigue aunque una falle y
   * reporta cuántas se crearon. Idempotente: un día que ya tiene una
   * actividad con esa misma descripción en este Entregable se OMITE (no se
   * duplica ni se suma), así repetir un import o un reparto no ensucia nada.
   */
  public async crearActividadesDeReparto(
    entregableId: string,
    reparto: RepartoExpandido
  ): Promise<{ creadas: number; omitidas: number; errores: string[] }> {
    let creadas = 0;
    let omitidas = 0;
    const errores: string[] = [];
    const existentes = await db.actividad
      .where("entregableId")
      .equals(entregableId)
      .filter((a) => a.estado !== "cancelada" && a.estado !== "descartada")
      .toArray();
    const yaExiste = (dia: string) =>
      existentes.some(
        (a) =>
          a.diaTarea === dia &&
          a.descripcion.trim().toLowerCase() ===
            reparto.descripcion.trim().toLowerCase()
      );
    for (const r of reparto.porDia) {
      if (yaExiste(r.dia)) {
        omitidas++;
        continue;
      }
      const res = await this.actividades.crearActividad({
        entregableId,
        tipo: reparto.tipo,
        descripcion: reparto.descripcion,
        diaTarea: r.dia,
        cantidadObjetivo: r.cantidad,
        unidad: reparto.unidad,
      });
      if (res.ok) creadas++;
      else errores.push(`${r.dia}: ${res.error!.mensaje}`);
    }
    return { creadas, omitidas, errores };
  }

  /** Paso 2: repartir un total en Actividades diarias de un Entregable ya existente. */
  public async repartirEnDias(
    entrada: EntradaRepartirEnDias
  ): Promise<Resultado<string>> {
    const entregable = await db.entregable.get(entrada.entregableId);
    if (!entregable) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el entregable.")
      );
    }
    if (!(entrada.total > 0)) {
      return Resultado.falla(
        new ErrorDominio("La cantidad a repartir tiene que ser mayor a 0.")
      );
    }
    const dias = diasDelRango(
      entrada.diaInicio,
      entrada.diaLimite,
      entrada.diasSemana
    );
    if (dias.length === 0) {
      return Resultado.falla(
        new ErrorDominio(
          "Ningún día del rango coincide con los días de la semana elegidos."
        )
      );
    }
    const porDia = repartirEnListaDeDias(entrada.total, dias);
    const { creadas, omitidas, errores } = await this.crearActividadesDeReparto(
      entrada.entregableId,
      {
        descripcion: entrada.descripcion,
        tipo: entrada.tipo,
        unidad: entrada.unidad,
        porDia,
      }
    );
    if (creadas === 0 && omitidas === 0) {
      return Resultado.falla(
        new ErrorDominio(errores.join(" — ") || "No se creó ninguna actividad.")
      );
    }
    return Resultado.exito(
      creadas === 0
        ? `Nada nuevo: esos ${omitidas} día(s) ya tenían esta actividad.`
        : `${creadas} actividad(es) creada(s)` +
            (omitidas > 0
              ? `; ${omitidas} día(s) ya la tenían y se omitieron.`
              : ".") +
            (errores.length > 0 ? ` Con errores: ${errores.join(" — ")}` : "")
    );
  }

  /** Paso 1 (+ opcionalmente 2): crear los Entregables de un Proyecto y, si se pide, sus Actividades diarias. */
  public async crearEntregablesDesdeProyecto(
    entrada: EntradaCrearEntregables
  ): Promise<Resultado<string>> {
    const proyecto = await db.proyecto_personal.get(entrada.proyectoId);
    if (!proyecto) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el proyecto.")
      );
    }
    if (entrada.partes.length === 0) {
      return Resultado.falla(
        new ErrorDominio("No hay ninguna parte para crear.")
      );
    }

    let entregablesCreados = 0;
    let entregablesOmitidos = 0;
    let actividadesCreadas = 0;
    const errores: string[] = [];
    // Secuencial a propósito: cada Entregable actualiza el mismo Proyecto
    // (tieneHijos) y sus actividades cuelgan de él.
    for (const parte of entrada.partes) {
      // Idempotente: si ya hay un entregable con ese título en el proyecto,
      // se reusa (no se duplica) y solo se completan las actividades que falten.
      const existente = await db.entregable
        .where("proyectoId")
        .equals(entrada.proyectoId)
        .filter(
          (e) =>
            e.estado !== "archivado" &&
            e.titulo.trim().toLowerCase() === parte.titulo.trim().toLowerCase()
        )
        .first();
      let entregableId: string;
      if (existente) {
        entregableId = existente.id;
        entregablesOmitidos++;
      } else {
        const res = await this.entregables.crearEntregable({
          proyectoId: entrada.proyectoId,
          objetivoId: proyecto.objetivoId,
          titulo: parte.titulo,
          diaInicio: parte.diaInicio,
          diaLimite: parte.diaLimite,
          cantidadObjetivo: parte.cantidad,
          unidad: entrada.unidad,
        });
        if (!res.ok) {
          errores.push(`"${parte.titulo}": ${res.error!.mensaje}`);
          continue;
        }
        entregableId = res.valor!;
        entregablesCreados++;
      }
      if (entrada.reparto) {
        const expandido = expandirReparto(
          { ...entrada.reparto, cantidadTotal: parte.cantidad },
          {
            diaInicio: parte.diaInicio,
            diaLimite: parte.diaLimite,
            total: parte.cantidad,
            unidad: entrada.unidad,
          }
        );
        const r = await this.crearActividadesDeReparto(entregableId, expandido);
        actividadesCreadas += r.creadas;
        errores.push(...r.errores.map((e) => `"${parte.titulo}" ${e}`));
      }
    }

    if (entregablesCreados === 0 && entregablesOmitidos === 0) {
      return Resultado.falla(
        new ErrorDominio(errores.join(" — ") || "No se creó ningún entregable.")
      );
    }
    return Resultado.exito(
      `${entregablesCreados} entregable(s)` +
        (entrada.reparto ? ` y ${actividadesCreadas} actividad(es)` : "") +
        " creados." +
        (entregablesOmitidos > 0
          ? ` ${entregablesOmitidos} ya existían y se reusaron.`
          : "") +
        (errores.length > 0 ? ` Con errores: ${errores.join(" — ")}` : "")
    );
  }
}
