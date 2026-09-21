import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import { ErrorDominio } from "../../../domain/errores/error-base";
import {
  CONFIGURACION_OFICINA_DEFAULT,
  ID_CONFIGURACION_OFICINA,
  guardarConfiguracionOficinaSchema,
  type ConfiguracionOficina,
  type GuardarConfiguracionOficinaInput,
} from "../../../domain/entidades/configuracion-oficina.entity";

/** Lee la configuración (o los defaults si todavía no existe la fila). */
export async function leerConfiguracionOficina(): Promise<ConfiguracionOficina> {
  const fila = await db.configuracion_oficina.get(ID_CONFIGURACION_OFICINA);
  return fila ?? { ...CONFIGURACION_OFICINA_DEFAULT, actualizadoEn: 0 };
}

async function escribir(
  cambios: Partial<Omit<ConfiguracionOficina, "id">>
): Promise<void> {
  const existente = await db.configuracion_oficina.get(
    ID_CONFIGURACION_OFICINA
  );
  const actualizadoEn = Date.now();
  if (existente) {
    await db.configuracion_oficina.update(ID_CONFIGURACION_OFICINA, {
      ...cambios,
      actualizadoEn,
    });
    await QueueService.encolar(
      "configuracion_oficina",
      "editar",
      ID_CONFIGURACION_OFICINA,
      { id: ID_CONFIGURACION_OFICINA, ...cambios, actualizadoEn }
    );
  } else {
    const registro: ConfiguracionOficina = {
      ...CONFIGURACION_OFICINA_DEFAULT,
      ...cambios,
      actualizadoEn,
    };
    await db.configuracion_oficina.add(registro);
    await QueueService.encolar(
      "configuracion_oficina",
      "crear",
      ID_CONFIGURACION_OFICINA,
      { ...registro }
    );
  }
}

export class GestionarConfiguracionOficinaUseCase {
  public async guardar(
    input: GuardarConfiguracionOficinaInput
  ): Promise<Resultado<void>> {
    const parsed = guardarConfiguracionOficinaSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    try {
      await escribir({
        intervaloPausaMin: parsed.data.intervaloPausaMin,
        pausaAlAzar: parsed.data.pausaAlAzar,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error
            ? err.message
            : "Error al guardar la configuración."
        )
      );
    }
  }

  /** Suma tiempo trabajado al contador de "desde la última pausa" — lo llama la sesión al pausarse/cerrarse. */
  public async sumarSegundos(segundos: number): Promise<void> {
    if (segundos <= 0) return;
    const config = await leerConfiguracionOficina();
    if (config.intervaloPausaMin <= 0) return;
    await escribir({
      segundosDesdePausa: config.segundosDesdePausa + segundos,
    });
  }

  /** La pausa se hizo o se salteó: el contador arranca de cero. */
  public async reiniciarContadorPausa(): Promise<void> {
    const config = await leerConfiguracionOficina();
    if (config.segundosDesdePausa === 0) return;
    await escribir({ segundosDesdePausa: 0 });
  }
}
