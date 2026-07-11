import { Resultado } from "../../../shared/utilidades/resultado";
import { db } from "../../../offline/dexie/db";

export class ActualizarDesignUseCase {
  public async ejecutar(
    agenciaId: string,
    content: string
  ): Promise<Resultado<void>> {
    if (typeof window !== "undefined") {
      localStorage.setItem(`matecode_design_${agenciaId}`, content);
    }

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Archivo Design.md actualizado para agencia ${agenciaId}.`,
      fecha: Date.now(),
    });

    return Resultado.exito(undefined);
  }
}
