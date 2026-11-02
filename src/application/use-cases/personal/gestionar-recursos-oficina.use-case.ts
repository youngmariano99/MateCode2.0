import { db } from "../../../offline/dexie/db";
import {
  crearRecursoOficinaSchema,
  actualizarRecursoOficinaSchema,
  calcularEstadoHito,
  type RecursoOficina,
  type CrearRecursoOficinaInput,
  type ActualizarRecursoOficinaInput,
  type TipoRecursoOficina,
  type EstadoAlertaHito,
} from "../../../domain/entidades/recurso-oficina.entity";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import { QueueService } from "../../../offline/services/queue.service";

export class GestionarRecursosOficinaUseCase {
  async crearRecurso(
    input: CrearRecursoOficinaInput
  ): Promise<Resultado<RecursoOficina>> {
    const val = crearRecursoOficinaSchema.safeParse(input);
    if (!val.success) {
      return Resultado.falla(
        new ErrorDominio(val.error.issues[0]?.message ?? "Datos inválidos.")
      );
    }

    const ahora = Date.now();
    const id = `rec_${ahora}_${Math.random().toString(36).substring(2, 7)}`;

    // Si es un acceso directo sin orden explícito, colocarlo al final
    let orden = val.data.orden;
    if (val.data.tipo === "acceso_directo" && orden === 0) {
      const maxOrden = await db.recurso_oficina
        .where("tipo")
        .equals("acceso_directo")
        .toArray();
      orden =
        maxOrden.length > 0
          ? Math.max(...maxOrden.map((r) => r.orden ?? 0)) + 1
          : 0;
    }

    const recurso: RecursoOficina = {
      id,
      tipo: val.data.tipo,
      titulo: val.data.titulo,
      url: val.data.url || undefined,
      icono: val.data.icono || undefined,
      etiquetas: val.data.etiquetas || [],
      fechaLimite: val.data.fechaLimite,
      diasAvisoPrevio: val.data.diasAvisoPrevio,
      descripcion: val.data.descripcion || undefined,
      orden,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };

    await db.recurso_oficina.put(recurso);
    await QueueService.encolar(
      "recurso_oficina",
      "crear",
      id,
      recurso as unknown as Record<string, unknown>
    );

    return Resultado.exito(recurso);
  }

  async actualizarRecurso(
    id: string,
    cambios: ActualizarRecursoOficinaInput
  ): Promise<Resultado<RecursoOficina>> {
    const actual = await db.recurso_oficina.get(id);
    if (!actual) {
      return Resultado.falla(new ErrorNoEncontrado("Recurso no encontrado."));
    }

    const val = actualizarRecursoOficinaSchema.safeParse(cambios);
    if (!val.success) {
      return Resultado.falla(
        new ErrorDominio(val.error.issues[0]?.message ?? "Datos inválidos.")
      );
    }

    const actualizado: RecursoOficina = {
      ...actual,
      ...val.data,
      url: val.data.url !== undefined ? val.data.url || undefined : actual.url,
      icono:
        val.data.icono !== undefined
          ? val.data.icono || undefined
          : actual.icono,
      descripcion:
        val.data.descripcion !== undefined
          ? val.data.descripcion || undefined
          : actual.descripcion,
      actualizadoEn: Date.now(),
    };

    await db.recurso_oficina.put(actualizado);
    await QueueService.encolar(
      "recurso_oficina",
      "editar",
      id,
      actualizado as unknown as Record<string, unknown>
    );

    return Resultado.exito(actualizado);
  }

  async eliminarRecurso(id: string): Promise<Resultado<void>> {
    const actual = await db.recurso_oficina.get(id);
    if (!actual) {
      return Resultado.falla(new ErrorNoEncontrado("Recurso no encontrado."));
    }

    await db.recurso_oficina.delete(id);
    await QueueService.encolar("recurso_oficina", "eliminar", id, {});

    return Resultado.exito(undefined);
  }

  async listarPorTipo(tipo: TipoRecursoOficina): Promise<RecursoOficina[]> {
    const listado = await db.recurso_oficina
      .where("tipo")
      .equals(tipo)
      .toArray();
    if (tipo === "acceso_directo") {
      return listado.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    }
    if (tipo === "hito_fecha") {
      return listado.sort((a, b) =>
        (a.fechaLimite ?? "").localeCompare(b.fechaLimite ?? "")
      );
    }
    return listado.sort((a, b) => b.creadoEn - a.creadoEn);
  }

  /**
   * Devuelve todos los hitos que deben disparar una alerta hoy en el banner
   */
  async obtenerHitosAlerta(
    hoyISO: string
  ): Promise<{ recurso: RecursoOficina; alerta: EstadoAlertaHito }[]> {
    const hitos = await this.listarPorTipo("hito_fecha");
    const alertas: { recurso: RecursoOficina; alerta: EstadoAlertaHito }[] = [];

    for (const hito of hitos) {
      const alerta = calcularEstadoHito(hito, hoyISO);
      if (alerta && alerta.debeAvisar) {
        alertas.push({ recurso: hito, alerta });
      }
    }

    // Ordenar por fecha límite más cercana primero
    return alertas.sort(
      (a, b) => a.alerta.diasRestantes - b.alerta.diasRestantes
    );
  }

  async reordenarAccesos(idsEnOrden: string[]): Promise<Resultado<void>> {
    const ahora = Date.now();
    for (let i = 0; i < idsEnOrden.length; i++) {
      const id = idsEnOrden[i];
      await db.recurso_oficina.update(id, { orden: i, actualizadoEn: ahora });
    }
    return Resultado.exito(undefined);
  }
}
