export interface EventoDominio {
  ocurridoEn: Date;
  nombreEvento: string;
  obtenerDatos(): Record<string, unknown>;
}

export type EventoHandler = (evento: EventoDominio) => void | Promise<void>;

export class PublicadorEventos {
  private static instancia: PublicadorEventos;
  private subscriptores = new Map<string, EventoHandler[]>();

  private constructor() {}

  public static obtenerInstancia(): PublicadorEventos {
    if (!PublicadorEventos.instancia) {
      PublicadorEventos.instancia = new PublicadorEventos();
    }
    return PublicadorEventos.instancia;
  }

  public suscribir(nombreEvento: string, handler: EventoHandler): void {
    const handlers = this.subscriptores.get(nombreEvento) || [];
    handlers.push(handler);
    this.subscriptores.set(nombreEvento, handlers);
  }

  public desuscribir(nombreEvento: string, handler: EventoHandler): void {
    const handlers = this.subscriptores.get(nombreEvento);
    if (!handlers) return;
    this.subscriptores.set(
      nombreEvento,
      handlers.filter((h) => h !== handler)
    );
  }

  public async publicar(evento: EventoDominio): Promise<void> {
    const handlers = this.subscriptores.get(evento.nombreEvento);
    if (!handlers) return;

    const promesas = handlers.map(async (handler) => {
      try {
        await handler(evento);
      } catch {
        // Reportar error silenciosamente en el bus de dominio para evitar
        // interrumpir la ejecución del resto de los handlers.
        // En una etapa posterior, esto podría derivarse al servicio de telemetría.
      }
    });

    await Promise.all(promesas);
  }

  public limpiar(): void {
    this.subscriptores.clear();
  }
}
