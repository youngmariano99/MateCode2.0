import { ErrorValidacion } from "../../domain/errores/error-base";

export const ArchivoService = {
  validarImagen: (file: File, maxMB = 2): void => {
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      throw new ErrorValidacion(
        "Formato de imagen inválido. Solo se permiten PNG, JPG, JPEG o WEBP."
      );
    }
    const maxSize = maxMB * 1024 * 1024;
    if (file.size > maxSize) {
      throw new ErrorValidacion(
        `La imagen supera el límite permitido de ${maxMB}MB.`
      );
    }
  },

  convertirABase64: async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });
  },

  guardarArchivoLocal: (key: string, base64: string): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`matecode_file_${key}`, base64);
    }
  },

  obtenerArchivoLocal: (key: string): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`matecode_file_${key}`);
    }
    return null;
  },

  eliminarArchivoLocal: (key: string): void => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`matecode_file_${key}`);
    }
  },
};
