import { db } from "../../offline/dexie/db";
import { QueueService } from "../../offline/services/queue.service";
import type {
  TipoEntidadHistorial,
  AccionHistorial,
  PersonalHistorialRow,
} from "../../domain/entidades/personal-historial.entity";

function idHistorial(): string {
  return `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Escribe una fila permanente en personal_historial — llamado explícitamente
 * al final de cada método de use-case que muta un nodo de la jerarquía
 * (crear/editar/eliminar/ajustar/registrar avance), mismo estilo del resto
 * del código: sin clase base compartida, una línea por mutación. A
 * diferencia de QueueService.encolar (buzón de salida que se borra al
 * sincronizar), estas filas nunca se borran — son el registro auditable.
 */
export async function registrarHistorialPersonal(params: {
  entidadTipo: TipoEntidadHistorial;
  entidadId: string;
  accion: AccionHistorial;
  descripcion?: string;
  campoAnterior?: Record<string, unknown>;
  campoNuevo?: Record<string, unknown>;
}): Promise<void> {
  const id = idHistorial();
  const registro: PersonalHistorialRow = {
    id,
    entidadTipo: params.entidadTipo,
    entidadId: params.entidadId,
    accion: params.accion,
    descripcion: params.descripcion,
    campoAnterior: params.campoAnterior,
    campoNuevo: params.campoNuevo,
    creadoEn: Date.now(),
  };
  await db.personal_historial.add(registro);
  await QueueService.encolar("personal_historial", "crear", id, {
    ...registro,
  });
}
