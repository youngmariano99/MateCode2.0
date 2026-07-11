import { CasoDeUso } from "../caso-de-uso";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorAutorizacion,
  ErrorInfraestructura,
} from "../../../domain/errores/error-base";
import { crearClienteBrowser } from "../../../infrastructure/auth/client";
import { logger } from "../../../infrastructure/logger/logger";

export interface LoginEntrada {
  correo: string;
  contrasena: string;
}

export class LoginUseCase implements CasoDeUso<LoginEntrada, void> {
  public async ejecutar(entrada: LoginEntrada): Promise<Resultado<void>> {
    try {
      const supabase = crearClienteBrowser();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: entrada.correo,
        password: entrada.contrasena,
      });

      if (error) {
        logger.warning(
          `Intento de inicio de sesión fallido para: ${entrada.correo}`,
          {
            error: error.message,
          }
        );
        return Resultado.falla(
          new ErrorAutorizacion("Credenciales incorrectas.")
        );
      }

      logger.info(`Inicio de sesión exitoso para: ${entrada.correo}`, {
        usuarioId: data.user?.id,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido";
      logger.error(
        "Error en LoginUseCase",
        err instanceof Error ? err : new Error(mensaje)
      );
      return Resultado.falla(new ErrorInfraestructura(mensaje));
    }
  }
}
