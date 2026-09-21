import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import { ErrorDominio } from "../../../domain/errores/error-base";
import {
  aplicaHoyEntregable,
  idInstanciaEntregableRecurrente,
} from "../../../domain/entidades/entregable.entity";
import type { Actividad } from "../../../domain/entidades/actividad.entity";

/**
 * Corre al abrir la vista de Hoy: por cada Entregable recurrente activo
 * cuyo patrón (RecurrenciaEntregable) aplica hoy, crea la Actividad de hoy
 * si todavía no existe — así "Contacto en frío Lun-Vie" aparece solo, sin
 * que el usuario tenga que recrearlo cada semana (ver §2 del plan). Sigue
 * el mismo criterio 100%-calculado-al-vuelo que aplicaHoy() de Hábitos: no
 * hay job en segundo plano, no hay filas pre-generadas para el futuro.
 *
 * A propósito NO pasa por GestionarActividadesUseCase.crearActividad (que
 * exige el tope de 1 enfoque + 3 mantenimiento/día): un compromiso
 * recurrente es una obligación ya asumida, no una elección nueva que compita
 * por el cupo limitado del día — mismo criterio por el que los Hábitos
 * tampoco cuentan contra ese tope hoy.
 */
export class MaterializarActividadesDelDiaUseCase {
  public async ejecutar(diaISO: string): Promise<Resultado<number>> {
    try {
      const entregablesActivos = await db.entregable
        .where("estado")
        .equals("activo")
        .toArray();
      const recurrentes = entregablesActivos.filter(
        (e) => e.recurrencia && aplicaHoyEntregable(e.recurrencia, diaISO)
      );

      let creadas = 0;
      const ahora = Date.now();
      for (const entregable of recurrentes) {
        // Defensivo: si ya alcanzó su cantidad objetivo, no generar más
        // instancias aunque el estado todavía no se haya recalculado a
        // "cumplido" (recomputarEntregable corre async tras cada avance).
        if (
          entregable.cantidadObjetivo !== undefined &&
          entregable.progresoActual >= entregable.cantidadObjetivo
        ) {
          continue;
        }

        const id = idInstanciaEntregableRecurrente(entregable.id, diaISO);
        const yaExiste = await db.actividad.get(id);
        if (yaExiste) continue;

        // El proyecto al que se venía dedicando esta recurrencia (ej. "Desarrollo")
        // pasa solo al día siguiente; se puede cambiar cada día.
        const ultima = (
          await db.actividad
            .where("entregableId")
            .equals(entregable.id)
            .filter(
              (a) => a.recurrenciaId === entregable.id && !!a.proyectoTrabajoId
            )
            .toArray()
        ).sort((a, b) => (b.diaTarea ?? "").localeCompare(a.diaTarea ?? ""))[0];

        const registro: Actividad = {
          id,
          proyectoTrabajoId: ultima?.proyectoTrabajoId,
          entregableId: entregable.id,
          proyectoId: entregable.proyectoId,
          objetivoId: entregable.objetivoId,
          tipo: "mantenimiento",
          descripcion: entregable.titulo,
          diaTarea: diaISO,
          estado: "pendiente",
          recurrenciaId: entregable.id,
          creadoEn: ahora,
          actualizadoEn: ahora,
        };
        await db.actividad.add(registro);
        await QueueService.encolar("actividad", "crear", id, { ...registro });
        creadas++;
      }

      return Resultado.exito(creadas);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error
            ? err.message
            : "Error al materializar las actividades del día."
        )
      );
    }
  }
}
