export const CacheService = {
  guardar: <T>(key: string, data: T, ttlSegundos = 300): void => {
    if (typeof window === "undefined") return;
    const item = {
      data,
      expiracion: Date.now() + ttlSegundos * 1000,
    };
    localStorage.setItem(`matecode_cache_${key}`, JSON.stringify(item));
  },

  obtener: <T>(key: string): T | null => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(`matecode_cache_${key}`);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (Date.now() > parsed.expiracion) {
        localStorage.removeItem(`matecode_cache_${key}`);
        return null;
      }
      return parsed.data as T;
    } catch {
      return null;
    }
  },

  eliminar: (key: string): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`matecode_cache_${key}`);
  },

  limpiar: (): void => {
    if (typeof window === "undefined") return;
    Object.keys(localStorage)
      .filter((k) => k.startsWith("matecode_cache_"))
      .forEach((k) => localStorage.removeItem(k));
  },
};
