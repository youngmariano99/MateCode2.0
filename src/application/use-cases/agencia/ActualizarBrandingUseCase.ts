import { AgenciaBranding } from "../../../domain/entidades/agencia-workspace.entity";
import { Resultado } from "../../../shared/utilidades/resultado";
import { db } from "../../../offline/dexie/db";

export class ActualizarBrandingUseCase {
  public async ejecutar(
    agenciaId: string,
    branding: AgenciaBranding
  ): Promise<Resultado<void>> {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        `matecode_branding_${agenciaId}`,
        JSON.stringify(branding)
      );
    }

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Branding actualizado para agencia ${agenciaId}.`,
      fecha: Date.now(),
    });

    return Resultado.exito(undefined);
  }
}
