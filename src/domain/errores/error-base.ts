export abstract class ErrorBase extends Error {
  public abstract readonly codigo: string;
  public readonly mensaje: string;
  public readonly metadata?: Record<string, unknown>;

  protected constructor(mensaje: string, metadata?: Record<string, unknown>) {
    super(mensaje);
    this.mensaje = mensaje;
    this.metadata = metadata;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ErrorDominio extends ErrorBase {
  public readonly codigo = "ERROR_DOMINIO";
  public constructor(mensaje: string, metadata?: Record<string, unknown>) {
    super(mensaje, metadata);
  }
}

export class ErrorValidacion extends ErrorBase {
  public readonly codigo = "ERROR_VALIDACION";
  public constructor(mensaje: string, metadata?: Record<string, unknown>) {
    super(mensaje, metadata);
  }
}

export class ErrorInfraestructura extends ErrorBase {
  public readonly codigo = "ERROR_INFRAESTRUCTURA";
  public constructor(mensaje: string, metadata?: Record<string, unknown>) {
    super(mensaje, metadata);
  }
}

export class ErrorAutorizacion extends ErrorBase {
  public readonly codigo = "ERROR_AUTORIZACION";
  public constructor(mensaje: string, metadata?: Record<string, unknown>) {
    super(mensaje, metadata);
  }
}

export class ErrorNoEncontrado extends ErrorBase {
  public readonly codigo = "ERROR_NO_ENCONTRADO";
  public constructor(mensaje: string, metadata?: Record<string, unknown>) {
    super(mensaje, metadata);
  }
}
