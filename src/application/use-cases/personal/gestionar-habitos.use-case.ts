import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  crearHabitoSchema,
  registrarHabitoSchema,
  idRegistroHabito,
  type CrearHabitoInput,
  type RegistrarHabitoInput,
  type HabitoDefinicion,
  type HabitoRegistro,
} from "../../../domain/entidades/habitos.entity";

function idHabito(): string {
  return `hab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * El Acordeón: hábitos de 3 niveles. Nunca hay que "fallar" — siempre existe
 * el nivel MIN como salida digna. El registro diario es un upsert por
 * (hábito, día): corregir lo que ya anotaste hoy no requiere buscar nada.
 */
export class GestionarHabitosUseCase {
  public async crearHabito(
    input: CrearHabitoInput
  ): Promise<Resultado<string>> {
    const parsed = crearHabitoSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const ahora = Date.now();
    const id = idHabito();
    const registro: HabitoDefinicion = {
      id,
      nombre: parsed.data.nombre.trim(),
      descripcionMin: parsed.data.descripcionMin.trim(),
      descripcionMed: parsed.data.descripcionMed.trim(),
      descripcionMax: parsed.data.descripcionMax.trim(),
      area: parsed.data.area,
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    try {
      await db.habito_definicion.add(registro);
      await QueueService.encolar("habito_definicion", "crear", id, {
        ...registro,
      });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear el hábito."
        )
      );
    }
  }

  public async desactivarHabito(id: string): Promise<Resultado<void>> {
    const habito = await db.habito_definicion.get(id);
    if (!habito) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el hábito.")
      );
    }
    const actualizadoEn = Date.now();
    try {
      await db.habito_definicion.update(id, { activo: false, actualizadoEn });
      await QueueService.encolar("habito_definicion", "editar", id, {
        id,
        activo: false,
        actualizadoEn,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al desactivar el hábito."
        )
      );
    }
  }

  /**
   * Registra (o corrige, si ya había uno) el nivel ejecutado de un hábito
   * en un día — id determinístico, así que es un `put` directo, sin tener
   * que buscar si ya existía.
   */
  public async registrarNivel(
    input: RegistrarHabitoInput
  ): Promise<Resultado<string>> {
    const parsed = registrarHabitoSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const habito = await db.habito_definicion.get(parsed.data.habitoId);
    if (!habito) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el hábito.")
      );
    }
    const id = idRegistroHabito(parsed.data.habitoId, parsed.data.diaTarea);
    const registro: HabitoRegistro = {
      id,
      habitoId: parsed.data.habitoId,
      diaTarea: parsed.data.diaTarea,
      nivelEjecutado: parsed.data.nivelEjecutado,
      creadoEn: Date.now(),
    };
    try {
      await db.habito_registro.put(registro);
      await QueueService.encolar("habito_registro", "crear", id, {
        ...registro,
      });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al registrar el hábito."
        )
      );
    }
  }
}
