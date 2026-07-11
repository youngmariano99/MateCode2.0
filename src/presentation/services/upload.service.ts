export interface UploadProgressPayload {
  cargando: boolean;
  progreso: number;
  error?: string;
  url?: string;
}

export const UploadService = {
  subirArchivo: async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<string> => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        if (onProgress) onProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          resolve(`https://matecode.mock/uploads/${Date.now()}_${file.name}`);
        }
      }, 150);
    });
  },
};
