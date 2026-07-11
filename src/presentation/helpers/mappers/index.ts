import { ErrorBase } from "../../../domain/errores/error-base";

export const mapearErrorAPresentacion = (error: unknown): string => {
  if (error instanceof ErrorBase) {
    switch (error.codigo) {
      case "NETWORK_ERROR":
        return "No hay conexión a Internet. Por favor, verificá tu red.";
      case "ERROR_AUTORIZACION":
        return "No tenés permisos suficientes para realizar esta acción.";
      case "REQUEST_CANCELLED":
        return "Operación cancelada por el usuario.";
      case "ERROR_NO_ENCONTRADO":
        return "El recurso solicitado no existe.";
      default:
        return error.mensaje;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado. Por favor, reintentá más tarde.";
};
