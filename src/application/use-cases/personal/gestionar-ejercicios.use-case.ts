import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import { ErrorDominio } from "../../../domain/errores/error-base";
import {
  crearEjercicioSchema,
  type CrearEjercicioInput,
  type CatalogoEjercicio,
} from "../../../domain/entidades/ejercicio.entity";

function idEjercicio(): string {
  return `ejer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Ejercicios de catálogo — hasta el Sprint 22 solo se sembraban una vez
 * (ejercicio-catalogo-seed.ts), sin forma de agregar uno nuevo. Acá se
 * habilita la creación real, con un solo requisito no negociable: el
 * equipamiento que pide un ejercicio nuevo tiene que ser el que el usuario
 * REALMENTE tiene — nunca se crea un ejercicio con equipo que no está en su
 * lista (catalogo_etiquetas, categoría "equipamiento_propio").
 */
export class GestionarEjerciciosUseCase {
  public async crearEjercicio(
    input: CrearEjercicioInput
  ): Promise<Resultado<string>> {
    const parsed = crearEjercicioSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }

    if (parsed.data.equipamiento.length > 0) {
      const equipamientoPropio = await db.catalogo_etiquetas
        .where("categoria")
        .equals("equipamiento_propio")
        .toArray();
      const propioNormalizado = new Set(
        equipamientoPropio.map((e) => e.etiqueta.toLowerCase().trim())
      );
      const noDisponible = parsed.data.equipamiento.filter(
        (e) => !propioNormalizado.has(e.toLowerCase().trim())
      );
      if (noDisponible.length > 0) {
        return Resultado.falla(
          new ErrorDominio(
            `"${parsed.data.nombre}" necesita equipamiento que no tenés registrado: ${noDisponible.join(", ")}.`
          )
        );
      }
    }

    const ahora = Date.now();
    const id = idEjercicio();
    const registro: CatalogoEjercicio = {
      id,
      patron: parsed.data.patron,
      nombre: parsed.data.nombre.trim(),
      tipoConteo: parsed.data.tipoConteo,
      modoConteo: parsed.data.modoConteo,
      equipamiento: parsed.data.equipamiento,
      esPausaActiva: parsed.data.esPausaActiva,
      esNeat: parsed.data.esNeat,
      permiteCarga: parsed.data.permiteCarga,
      niveles: parsed.data.niveles,
      creadoEn: ahora,
    };
    try {
      await db.catalogo_ejercicio.add(registro);
      await QueueService.encolar("catalogo_ejercicio", "crear", id, {
        ...registro,
      });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear el ejercicio."
        )
      );
    }
  }
}
