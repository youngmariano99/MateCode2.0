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
  aplicaHoy,
  type CrearHabitoInput,
  type RegistrarHabitoInput,
  type HabitoDefinicion,
  type HabitoRegistro,
} from "../../../domain/entidades/habitos.entity";
import { sumarDias } from "../../../domain/entidades/personal.entity";

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
      frecuencia: parsed.data.frecuencia,
      diasSemana: parsed.data.diasSemana,
      etiquetaArea: parsed.data.etiquetaArea,
      objetivoId: parsed.data.objetivoId,
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
      motivoIncumplimiento: parsed.data.motivoIncumplimiento,
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

  /**
   * Días entre `desdeISO` (exclusivo) y `hastaISO` (inclusivo, normalmente
   * "ayer") en los que el hábito aplicaba (`aplicaHoy`) pero no tiene
   * `habito_registro` — la base del panel de recuperación tras un desvío.
   * No devuelve nada para días que ni le correspondían al hábito.
   */
  public async buscarDiasSinRegistrar(
    habitoId: string,
    desdeISO: string,
    hastaISO: string
  ): Promise<string[]> {
    const habito = await db.habito_definicion.get(habitoId);
    if (!habito) return [];

    const dias: string[] = [];
    let cursor = sumarDias(desdeISO, 1);
    while (cursor <= hastaISO) {
      if (aplicaHoy(habito, cursor)) dias.push(cursor);
      cursor = sumarDias(cursor, 1);
    }
    if (dias.length === 0) return [];

    const registrosExistentes = await db.habito_registro
      .where("habitoId")
      .equals(habitoId)
      .and((r) => dias.includes(r.diaTarea))
      .toArray();
    const diasConRegistro = new Set(registrosExistentes.map((r) => r.diaTarea));
    return dias.filter((d) => !diasConRegistro.has(d));
  }
}
