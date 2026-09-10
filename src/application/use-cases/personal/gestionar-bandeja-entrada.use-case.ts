import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  crearInboxItemSchema,
  type CrearInboxItemInput,
  type InboxItem,
  type TipoTareaDiaria,
  type PrioridadPendiente,
  type AreaPendiente,
} from "../../../domain/entidades/personal.entity";
import { GestionarBunkerUseCase } from "./gestionar-bunker.use-case";
import { GestionarPendientesUseCase } from "./gestionar-pendientes.use-case";

function idInboxItem(): string {
  return `inb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Bandeja de entrada: captura libre de ideas/pensamientos sin fricción —
 * nada que decidir en el momento (ni categoría, ni prioridad). Se resuelve
 * después promoviendo cada ítem a algo concreto (tarea del Búnker o
 * pendiente) o descartándolo.
 */
export class GestionarBandejaEntradaUseCase {
  private readonly bunker = new GestionarBunkerUseCase();
  private readonly pendientes = new GestionarPendientesUseCase();

  public async crearItem(
    input: CrearInboxItemInput
  ): Promise<Resultado<string>> {
    const parsed = crearInboxItemSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const ahora = Date.now();
    const id = idInboxItem();
    const registro: InboxItem = {
      id,
      texto: parsed.data.texto.trim(),
      estado: "pendiente",
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    try {
      await db.inbox_item.add(registro);
      await QueueService.encolar("inbox_item", "crear", id, { ...registro });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al guardar la nota."
        )
      );
    }
  }

  public async descartarItem(id: string): Promise<Resultado<void>> {
    const item = await db.inbox_item.get(id);
    if (!item) {
      return Resultado.falla(new ErrorNoEncontrado("No se encontró la nota."));
    }
    return this.marcarPromovido(id, "descartado");
  }

  public async promoverATareaDiaria(
    id: string,
    diaTarea: string,
    tipo: TipoTareaDiaria
  ): Promise<Resultado<string>> {
    const item = await db.inbox_item.get(id);
    if (!item) {
      return Resultado.falla(new ErrorNoEncontrado("No se encontró la nota."));
    }
    const resultado = await this.bunker.crearTareaDiaria({
      diaTarea,
      tipo,
      descripcion: item.texto,
      origenInboxId: id,
    });
    if (!resultado.ok) return resultado;
    await this.marcarPromovido(
      id,
      "promovido",
      tipo === "enfoque" ? "tarea_enfoque" : "tarea_mantenimiento",
      resultado.valor
    );
    return resultado;
  }

  public async promoverAPendiente(
    id: string,
    prioridad: PrioridadPendiente,
    area: AreaPendiente
  ): Promise<Resultado<string>> {
    const item = await db.inbox_item.get(id);
    if (!item) {
      return Resultado.falla(new ErrorNoEncontrado("No se encontró la nota."));
    }
    const resultado = await this.pendientes.crearPendiente({
      descripcion: item.texto,
      prioridad,
      area,
      origenInboxId: id,
    });
    if (!resultado.ok) return resultado;
    await this.marcarPromovido(id, "promovido", "pendiente", resultado.valor);
    return resultado;
  }

  private async marcarPromovido(
    id: string,
    estado: "promovido" | "descartado",
    promovidoATipo?: "tarea_enfoque" | "tarea_mantenimiento" | "pendiente",
    promovidoAId?: string
  ): Promise<Resultado<void>> {
    const actualizadoEn = Date.now();
    const cambios = { estado, promovidoATipo, promovidoAId, actualizadoEn };
    try {
      await db.inbox_item.update(id, cambios);
      await QueueService.encolar("inbox_item", "editar", id, {
        id,
        ...cambios,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al actualizar la nota."
        )
      );
    }
  }
}
