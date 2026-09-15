import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { ErrorDominio } from "../../../domain/errores/error-base";
import { GestionarBunkerUseCase } from "./gestionar-bunker.use-case";
import { GestionarPendientesUseCase } from "./gestionar-pendientes.use-case";
import { GestionarObjetivosUseCase } from "./gestionar-objetivos.use-case";
import { importarPlanSemanalSchema } from "../../../domain/entidades/personal.entity";
import { importarPlanObjetivosSchema } from "../../../domain/entidades/objetivo-cuantificable.entity";

/** Arma un mensaje legible a partir de los issues de zod — mismo criterio que parseHandoffIA. */
function mensajeDeIssues(
  issues: { path: PropertyKey[]; message: string }[]
): string {
  return issues
    .map((i) => `${i.path.map(String).join(".") || "(raíz)"}: ${i.message}`)
    .join(" — ");
}

/**
 * Aplica lo que devuelve la IA en los prompts de planificación semanal/de
 * objetivos — valida la estructura estrictamente (mismo criterio que
 * parseHandoffIA para los tickets: un JSON mal formado se reporta con el
 * campo y el motivo exactos, no se importa a medias) y delega todo en los
 * use-cases ya existentes (mismos límites, mismas reglas de negocio) en vez
 * de escribir directo a Dexie. Resuelve objetivos existentes por TÍTULO
 * exacto (como `resolverEjercicioPorNombre` en rutinas); si no matchea, no
 * falla — es un flujo aditivo, así que lo ignora y lo reporta, no bloquea el
 * resto del import.
 */
export class ImportarPlanificacionUseCase {
  private readonly bunker = new GestionarBunkerUseCase();
  private readonly pendientes = new GestionarPendientesUseCase();
  private readonly objetivos = new GestionarObjetivosUseCase();

  public async importarSemana(items: unknown[]): Promise<Resultado<string>> {
    const parsed = importarPlanSemanalSchema.safeParse(items[0] ?? {});
    if (!parsed.success) {
      return Resultado.falla(
        new ErrorDominio(
          `El JSON no tiene la estructura esperada: ${mensajeDeIssues(parsed.error.issues)}`
        )
      );
    }
    const plan = parsed.data;
    let tareasCreadas = 0;
    let pendientesCreados = 0;
    const errores: string[] = [];

    for (const t of plan.tareasDiarias) {
      const res = await this.bunker.crearTareaDiaria({
        diaTarea: t.diaTarea,
        tipo: t.tipo,
        descripcion: t.descripcion,
      });
      if (res.ok) tareasCreadas++;
      else errores.push(`"${t.descripcion}": ${res.error!.mensaje}`);
    }

    for (const p of plan.pendientes) {
      const res = await this.pendientes.crearPendiente({
        descripcion: p.descripcion,
        prioridad: p.prioridad,
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
    const parsed = importarPlanObjetivosSchema.safeParse(items[0] ?? {});
    if (!parsed.success) {
      return Resultado.falla(
        new ErrorDominio(
          `El JSON no tiene la estructura esperada: ${mensajeDeIssues(parsed.error.issues)}`
        )
      );
    }
    const plan = parsed.data;
    let creados = 0;
    let ajustados = 0;
    const noEncontrados: string[] = [];
    const hoy = new Date().toISOString().slice(0, 10);

    for (const o of plan.objetivosNuevos) {
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

    if (plan.ajustes.length > 0) {
      const existentes = await db.objetivo_cuantificable
        .where("estado")
        .anyOf(["activo", "vencido"])
        .toArray();
      for (const a of plan.ajustes) {
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
