import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import { GestionarProyectosPersonalUseCase } from "./gestionar-proyectos-personal.use-case";
import { GestionarEntregablesUseCase } from "./gestionar-entregables.use-case";
import { GestionarObjetivosUseCase } from "./gestionar-objetivos.use-case";

export type NivelConHijosFecha = "objetivo" | "proyecto";

export interface ItemPreviewAjusteFecha {
  id: string;
  titulo: string;
  fechaActual: string;
  /** true si la fecha actual del hijo ya supera la nueva fecha límite propuesta para el padre — necesita resolución manual, no se ajusta solo. */
  conflicto: boolean;
}

export interface CambioFechaHijo {
  id: string;
  nuevaFecha: string;
}

/**
 * Ajuste de fecha con preview obligatorio — nunca silencioso (ver §3 del
 * plan). PreviewarAjusteFechaUseCase solo LEE, no escribe nada: arma la
 * lista de hijos directos afectados para que la UI la muestre antes de
 * confirmar. AplicarAjusteFechaUseCase recién ahí escribe, delegando en los
 * use-cases de ajuste ya existentes (mismo historial/QueueService que un
 * ajuste manual normal).
 */
export class PreviewarAjusteFechaUseCase {
  public async ejecutar(
    nivel: NivelConHijosFecha,
    id: string,
    nuevaFecha: string
  ): Promise<Resultado<ItemPreviewAjusteFecha[]>> {
    try {
      if (nivel === "objetivo") {
        const objetivo = await db.objetivo_cuantificable.get(id);
        if (!objetivo) {
          return Resultado.falla(
            new ErrorNoEncontrado("No se encontró el objetivo.")
          );
        }
        const proyectos = await db.proyecto_personal
          .where("objetivoId")
          .equals(id)
          .toArray();
        return Resultado.exito(
          proyectos
            .filter((p) => p.estado !== "archivado")
            .map((p) => ({
              id: p.id,
              titulo: p.titulo,
              fechaActual: p.diaLimite,
              conflicto: p.diaLimite > nuevaFecha,
            }))
        );
      }

      const proyecto = await db.proyecto_personal.get(id);
      if (!proyecto) {
        return Resultado.falla(
          new ErrorNoEncontrado("No se encontró el proyecto.")
        );
      }
      const entregables = await db.entregable
        .where("proyectoId")
        .equals(id)
        .toArray();
      return Resultado.exito(
        entregables
          .filter((e) => e.estado !== "archivado")
          .map((e) => ({
            id: e.id,
            titulo: e.titulo,
            fechaActual: e.diaLimite,
            conflicto: e.diaLimite > nuevaFecha,
          }))
      );
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error
            ? err.message
            : "Error al armar el preview de ajuste."
        )
      );
    }
  }
}

export class AplicarAjusteFechaUseCase {
  private readonly objetivos = new GestionarObjetivosUseCase();
  private readonly proyectos = new GestionarProyectosPersonalUseCase();
  private readonly entregables = new GestionarEntregablesUseCase();

  /**
   * Aplica la nueva fecha del nodo + los cambios de hijos que el usuario
   * confirmó explícitamente en el preview (puede ser un subconjunto, o
   * ninguno — el usuario decide cuáles de los hijos afectados ajustar
   * también). Cada escritura pasa por su use-case normal, así que queda
   * historial de "ajustar_fecha" por cada fila tocada, no solo la raíz.
   */
  public async ejecutar(
    nivel: NivelConHijosFecha,
    id: string,
    nuevaFecha: string,
    cambiosHijos: CambioFechaHijo[] = []
  ): Promise<Resultado<void>> {
    const resultadoPadre =
      nivel === "objetivo"
        ? await this.objetivos.ajustarObjetivo({ id, diaLimite: nuevaFecha })
        : await this.proyectos.ajustarProyecto({ id, diaLimite: nuevaFecha });
    if (!resultadoPadre.ok) return resultadoPadre;

    for (const cambio of cambiosHijos) {
      const resultadoHijo =
        nivel === "objetivo"
          ? await this.proyectos.ajustarProyecto({
              id: cambio.id,
              diaLimite: cambio.nuevaFecha,
            })
          : await this.entregables.ajustarEntregable({
              id: cambio.id,
              diaLimite: cambio.nuevaFecha,
            });
      if (!resultadoHijo.ok) return resultadoHijo;
    }

    return Resultado.exito(undefined);
  }
}
