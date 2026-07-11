import { CasoDeUso } from "../caso-de-uso";
import { Resultado } from "../../../shared/utilidades/resultado";
import { ErrorInfraestructura } from "../../../domain/errores/error-base";
import { crearClienteBrowser } from "../../../infrastructure/auth/client";
import { logger } from "../../../infrastructure/logger/logger";

export class LogoutUseCase implements CasoDeUso<void, void> {
  public async ejecutar(): Promise<Resultado<void>> {
    try {
      const supabase = crearClienteBrowser();
      const { error } = await supabase.auth.signOut();

      if (error) {
        logger.error(
          "Error al cerrar sesión en Supabase",
          new Error(error.message)
        );
        return Resultado.falla(new ErrorInfraestructura(error.message));
      }

      logger.info("Sesión cerrada exitosamente");
      return Resultado.exito(undefined);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido";
      logger.error(
        "Error en LogoutUseCase",
        err instanceof Error ? err : new Error(mensaje)
      );
      return Resultado.falla(new ErrorInfraestructura(mensaje));
    }
  }
}
