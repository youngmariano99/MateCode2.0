import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  ajustesIAJsonSchema,
  type ItemAjusteIAJson,
} from "../../../domain/entidades/ajuste-ia.entity";
import { GestionarObjetivosUseCase } from "./gestionar-objetivos.use-case";
import { GestionarProyectosPersonalUseCase } from "./gestionar-proyectos-personal.use-case";
import { GestionarEntregablesUseCase } from "./gestionar-entregables.use-case";
import { GestionarFasesUseCase } from "./gestionar-fases.use-case";

function mensajeDeIssues(
  issues: { path: PropertyKey[]; message: string }[]
): string {
  return issues
    .map((i) => `${i.path.map(String).join(".") || "(raíz)"}: ${i.message}`)
    .join(" — ");
}

function normalizar(s: string): string {
  return s.toLowerCase().trim();
}

/**
 * Aplica ajustes sugeridos por una IA externa sobre TODO el árbol de un
 * Objetivo (Proyectos/Entregables/Fases debajo) — mismo patrón copiar-
 * prompt/pegar-JSON del resto del módulo (ver Decisión E, Sprint 21: no hay
 * llamada a IA desde el servidor). Resuelve cada ajuste por título EXACTO
 * dentro del subárbol de ese Objetivo (nunca por id — la IA no conoce ids
 * internos); si el título no matchea exactamente uno solo, se reporta como
 * error no bloqueante y se sigue con el resto (aditivo, mismo criterio que
 * ImportarArbolPersonalUseCase).
 */
export class AplicarAjustesIAUseCase {
  private readonly objetivos = new GestionarObjetivosUseCase();
  private readonly proyectos = new GestionarProyectosPersonalUseCase();
  private readonly entregables = new GestionarEntregablesUseCase();
  private readonly fases = new GestionarFasesUseCase();

  public async aplicar(
    objetivoId: string,
    items: unknown[]
  ): Promise<Resultado<string>> {
    const parsed = ajustesIAJsonSchema.safeParse(items[0] ?? {});
    if (!parsed.success) {
      return Resultado.falla(
        new ErrorDominio(
          `El JSON no tiene la estructura esperada: ${mensajeDeIssues(parsed.error.issues)}`
        )
      );
    }

    const objetivo = await db.objetivo_cuantificable.get(objetivoId);
    if (!objetivo) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el objetivo.")
      );
    }

    const proyectosDelObjetivo = await db.proyecto_personal
      .where("objetivoId")
      .equals(objetivoId)
      .toArray();
    const entregablesDelObjetivo = await db.entregable
      .where("objetivoId")
      .equals(objetivoId)
      .toArray();
    const entregableIds = entregablesDelObjetivo.map((e) => e.id);
    const fasesDelObjetivo =
      entregableIds.length > 0
        ? await db.fase_personal
            .where("entregableId")
            .anyOf(entregableIds)
            .toArray()
        : [];

    let aplicados = 0;
    const errores: string[] = [];

    for (const item of parsed.data.ajustes) {
      const res = await this.aplicarUno(
        item,
        objetivo.id,
        objetivo.titulo,
        proyectosDelObjetivo,
        entregablesDelObjetivo,
        fasesDelObjetivo
      );
      if (res.ok) aplicados++;
      else errores.push(res.error!.mensaje);
    }

    if (aplicados === 0) {
      return Resultado.falla(
        new ErrorDominio(
          errores.length > 0
            ? errores.join(" — ")
            : "No se aplicó ningún ajuste."
        )
      );
    }
    return Resultado.exito(
      `${aplicados} ajuste(s) aplicado(s).` +
        (errores.length > 0 ? ` Con errores: ${errores.join(" — ")}` : "")
    );
  }

  private async aplicarUno(
    item: ItemAjusteIAJson,
    objetivoId: string,
    objetivoTitulo: string,
    proyectosDelObjetivo: { id: string; titulo: string }[],
    entregablesDelObjetivo: { id: string; titulo: string }[],
    fasesDelObjetivo: { id: string; titulo: string }[]
  ): Promise<Resultado<void>> {
    const cambio = {
      cantidadObjetivo: item.cantidadObjetivo,
      diaLimite: item.diaLimite,
    };
    const tituloNorm = normalizar(item.titulo);

    if (item.nivel === "objetivo") {
      if (normalizar(objetivoTitulo) !== tituloNorm) {
        return Resultado.falla(
          new ErrorDominio(
            `Objetivo "${item.titulo}" no coincide con el objetivo "${objetivoTitulo}" — no se aplicó.`
          )
        );
      }
      return this.objetivos.ajustarObjetivo({ id: objetivoId, ...cambio });
    }

    if (item.nivel === "proyecto") {
      const candidatos = proyectosDelObjetivo.filter(
        (p) => normalizar(p.titulo) === tituloNorm
      );
      if (candidatos.length !== 1) {
        return Resultado.falla(
          new ErrorDominio(
            candidatos.length === 0
              ? `No se encontró un proyecto "${item.titulo}" bajo este objetivo.`
              : `Hay más de un proyecto "${item.titulo}" bajo este objetivo — no se aplicó, ajustalo a mano.`
          )
        );
      }
      return this.proyectos.ajustarProyecto({
        id: candidatos[0].id,
        ...cambio,
      });
    }

    if (item.nivel === "entregable") {
      const candidatos = entregablesDelObjetivo.filter(
        (e) => normalizar(e.titulo) === tituloNorm
      );
      if (candidatos.length !== 1) {
        return Resultado.falla(
          new ErrorDominio(
            candidatos.length === 0
              ? `No se encontró un entregable "${item.titulo}" bajo este objetivo.`
              : `Hay más de un entregable "${item.titulo}" bajo este objetivo — no se aplicó, ajustalo a mano.`
          )
        );
      }
      return this.entregables.ajustarEntregable({
        id: candidatos[0].id,
        ...cambio,
      });
    }

    // "fase"
    const candidatos = fasesDelObjetivo.filter(
      (f) => normalizar(f.titulo) === tituloNorm
    );
    if (candidatos.length !== 1) {
      return Resultado.falla(
        new ErrorDominio(
          candidatos.length === 0
            ? `No se encontró una fase "${item.titulo}" bajo este objetivo.`
            : `Hay más de una fase "${item.titulo}" bajo este objetivo — no se aplicó, ajustala a mano.`
        )
      );
    }
    return this.fases.ajustarFase({ id: candidatos[0].id, ...cambio });
  }
}
