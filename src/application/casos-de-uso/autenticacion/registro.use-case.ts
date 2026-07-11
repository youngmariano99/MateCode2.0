import { CasoDeUso } from "../caso-de-uso";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorInfraestructura,
  ErrorValidacion,
} from "../../../domain/errores/error-base";
import { crearClienteBrowser } from "../../../infrastructure/auth/client";
import { logger } from "../../../infrastructure/logger/logger";

export interface RegistroEntrada {
  correo: string;
  contrasena: string;
}

export class RegistroUseCase implements CasoDeUso<RegistroEntrada, void> {
  public async ejecutar(entrada: RegistroEntrada): Promise<Resultado<void>> {
    try {
      if (!entrada.correo || !entrada.contrasena) {
        return Resultado.falla(
          new ErrorValidacion("El correo y la contraseña son requeridos.")
        );
      }

      if (entrada.contrasena.length < 6) {
        return Resultado.falla(
          new ErrorValidacion("La contraseña debe tener al menos 6 caracteres.")
        );
      }

      const supabase = crearClienteBrowser();
      const { error } = await supabase.auth.signUp({
        email: entrada.correo,
        password: entrada.contrasena,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        logger.warning(`Intento de registro fallido para: ${entrada.correo}`, {
          error: error.message,
        });
        return Resultado.falla(new ErrorInfraestructura(error.message));
      }

      logger.info(`Registro exitoso para: ${entrada.correo}`);
      return Resultado.exito(undefined);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido";
      logger.error(
        "Error en RegistroUseCase",
        err instanceof Error ? err : new Error(mensaje)
      );
      return Resultado.falla(new ErrorInfraestructura(mensaje));
    }
  }
}
