import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { ErrorDominio } from "../../../domain/errores/error-base";
import { GestionarBunkerUseCase } from "./gestionar-bunker.use-case";
import { GestionarPendientesUseCase } from "./gestionar-pendientes.use-case";
import { GestionarObjetivosUseCase } from "./gestionar-objetivos.use-case";
import type { TipoTareaDiaria } from "../../../domain/entidades/personal.entity";
import type { PrioridadPendiente } from "../../../domain/entidades/personal.entity";

interface PlanSemanalJson {
  tareasDiarias?: { diaTarea: string; tipo: string; descripcion: string }[];
  pendientes?: { descripcion: string; prioridad?: string }[];
}

interface PlanObjetivosJson {
  objetivosNuevos?: {
    titulo: string;
    unidad: string;
    cantidadObjetivo: number;
    diaLimite: string;
    etiquetaArea?: string;
  }[];
  ajustes?: { titulo: string; cantidadObjetivo?: number; diaLimite?: string }[];
}

const TIPOS_VALIDOS: TipoTareaDiaria[] = ["enfoque", "mantenimiento"];
const PRIORIDADES_VALIDAS: PrioridadPendiente[] = [
  "urgente",
  "importante",
  "puede_esperar",
];

/**
 * Aplica lo que devuelve la IA en los prompts de planificación semanal/de
 * objetivos — delega todo en los use-cases ya existentes (mismos límites,
 * mismas reglas de negocio) en vez de escribir directo a Dexie. Resuelve
 * objetivos existentes por TÍTULO exacto (como `resolverEjercicioPorNombre`
 * en rutinas); si no matchea, no falla — es un flujo aditivo, así que lo
 * ignora y lo reporta, no bloquea el resto del import.
 */
export class ImportarPlanificacionUseCase {
  private readonly bunker = new GestionarBunkerUseCase();
  private readonly pendientes = new GestionarPendientesUseCase();
  private readonly objetivos = new GestionarObjetivosUseCase();

  public async importarSemana(items: unknown[]): Promise<Resultado<string>> {
    const plan = (items[0] || {}) as PlanSemanalJson;
    let tareasCreadas = 0;
    let pendientesCreados = 0;
    const errores: string[] = [];

    for (const t of plan.tareasDiarias || []) {
      if (!t.diaTarea || !t.descripcion) continue;
      const tipo = TIPOS_VALIDOS.includes(t.tipo as TipoTareaDiaria)
        ? (t.tipo as TipoTareaDiaria)
        : "mantenimiento";
      const res = await this.bunker.crearTareaDiaria({
        diaTarea: t.diaTarea,
        tipo,
        descripcion: t.descripcion,
      });
      if (res.ok) tareasCreadas++;
      else errores.push(`"${t.descripcion}": ${res.error!.mensaje}`);
    }

    for (const p of plan.pendientes || []) {
      if (!p.descripcion) continue;
      const prioridad = PRIORIDADES_VALIDAS.includes(
        p.prioridad as PrioridadPendiente
      )
        ? (p.prioridad as PrioridadPendiente)
        : "importante";
      const res = await this.pendientes.crearPendiente({
        descripcion: p.descripcion,
        prioridad,
        area: "ambas",
      });
      if (res.ok) pendientesCreados++;
      else errores.push(`"${p.descripcion}": ${res.error!.mensaje}`);
    }

    if (tareasCreadas === 0 && pendientesCreados === 0) {
      return Resultado.falla(
        new ErrorDominio(
          errores.length > 0
            ? errores.join(" — ")
            : "El JSON no tenía tareas ni pendientes para crear."
        )
      );
    }
    return Resultado.exito(
      `${tareasCreadas} tarea(s) y ${pendientesCreados} pendiente(s) creados.` +
        (errores.length > 0 ? ` Con errores: ${errores.join(" — ")}` : "")
    );
  }

  public async importarObjetivos(items: unknown[]): Promise<Resultado<string>> {
    const plan = (items[0] || {}) as PlanObjetivosJson;
    let creados = 0;
    let ajustados = 0;
    const noEncontrados: string[] = [];
    const hoy = new Date().toISOString().slice(0, 10);

    for (const o of plan.objetivosNuevos || []) {
      if (!o.titulo || !o.unidad || !o.cantidadObjetivo || !o.diaLimite) {
        continue;
      }
      const res = await this.objetivos.crearObjetivo({
        titulo: o.titulo,
        unidad: o.unidad,
        cantidadObjetivo: o.cantidadObjetivo,
        diaInicio: hoy,
        diaLimite: o.diaLimite,
        etiquetaArea: o.etiquetaArea,
      });
      if (res.ok) creados++;
    }

    if ((plan.ajustes || []).length > 0) {
      const existentes = await db.objetivo_cuantificable
        .where("estado")
        .anyOf(["activo", "vencido"])
        .toArray();
      for (const a of plan.ajustes || []) {
        const encontrado = existentes.find(
          (e) => e.titulo.toLowerCase().trim() === a.titulo.toLowerCase().trim()
        );
        if (!encontrado) {
          noEncontrados.push(a.titulo);
          continue;
        }
        const res = await this.objetivos.ajustarObjetivo({
          id: encontrado.id,
          cantidadObjetivo: a.cantidadObjetivo,
          diaLimite: a.diaLimite,
        });
        if (res.ok) ajustados++;
      }
    }

    if (creados === 0 && ajustados === 0) {
      return Resultado.falla(
        new ErrorDominio(
          noEncontrados.length > 0
            ? `No se encontraron estos objetivos activos: ${noEncontrados.join(", ")}.`
            : "El JSON no tenía objetivos nuevos ni ajustes para aplicar."
        )
      );
    }
    return Resultado.exito(
      `${creados} objetivo(s) creado(s), ${ajustados} ajustado(s).` +
        (noEncontrados.length > 0
          ? ` No se encontraron: ${noEncontrados.join(", ")}.`
          : "")
    );
  }
}
