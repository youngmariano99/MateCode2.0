import { ErrorBase } from "../../domain/errores/error-base";

export class Resultado<T> {
  public readonly ok: boolean;
  public readonly error: ErrorBase | null;
  private readonly _valor: T | null;

  private constructor(ok: boolean, error: ErrorBase | null, valor: T | null) {
    this.ok = ok;
    this.error = error;
    this._valor = valor;
  }

  public get valor(): T {
    if (!this.ok) {
      throw new Error(
        `No se puede obtener el valor de un resultado fallido. Error: ${this.error?.mensaje}`
      );
    }
    return this._valor as T;
  }

  public static exito<T>(valor: T): Resultado<T> {
    return new Resultado<T>(true, null, valor);
  }

  public static falla<T>(error: ErrorBase): Resultado<T> {
    return new Resultado<T>(false, error, null);
  }
}
