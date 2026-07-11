export interface Logger {
  info(mensaje: string, metadata?: Record<string, unknown>): void;
  warning(mensaje: string, metadata?: Record<string, unknown>): void;
  error(
    mensaje: string,
    error?: Error,
    metadata?: Record<string, unknown>
  ): void;
  bug(mensaje: string, metadata?: Record<string, unknown>): void;
  debug(mensaje: string, metadata?: Record<string, unknown>): void;
}

export class ConsolaLogger implements Logger {
  private formatear(
    nivel: string,
    mensaje: string,
    metadata?: Record<string, unknown>
  ): string {
    const timestamp = new Date().toISOString();
    const metaStr = metadata ? ` | Meta: ${JSON.stringify(metadata)}` : "";
    return `[${nivel}] [${timestamp}]: ${mensaje}${metaStr}`;
  }

  public info(mensaje: string, metadata?: Record<string, unknown>): void {
    console.info(this.formatear("INFO", mensaje, metadata));
  }

  public warning(mensaje: string, metadata?: Record<string, unknown>): void {
    console.warn(this.formatear("WARNING", mensaje, metadata));
  }

  public error(
    mensaje: string,
    error?: Error,
    metadata?: Record<string, unknown>
  ): void {
    const errMeta = error
      ? {
          ...metadata,
          errorNombre: error.name,
          errorMensaje: error.message,
          errorStack: error.stack,
        }
      : metadata;
    console.error(this.formatear("ERROR", mensaje, errMeta));
  }

  public bug(mensaje: string, metadata?: Record<string, unknown>): void {
    console.error(this.formatear("BUG", mensaje, metadata));
  }

  public debug(mensaje: string, metadata?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatear("DEBUG", mensaje, metadata));
    }
  }
}

export const logger: Logger = new ConsolaLogger();
export default logger;
