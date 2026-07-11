export class ContenedorDependencias {
  private static instancia: ContenedorDependencias;
  private dependencias = new Map<string, unknown>();

  private constructor() {}

  public static obtenerInstancia(): ContenedorDependencias {
    if (!ContenedorDependencias.instancia) {
      ContenedorDependencias.instancia = new ContenedorDependencias();
    }
    return ContenedorDependencias.instancia;
  }

  public registrar<T>(clave: string, valor: T): void {
    this.dependencias.set(clave, valor);
  }

  public resolver<T>(clave: string): T {
    if (!this.dependencias.has(clave)) {
      throw new Error(`Dependencia no encontrada: ${clave}`);
    }
    return this.dependencias.get(clave) as T;
  }

  public limpiar(): void {
    this.dependencias.clear();
  }
}

export const contenedor = ContenedorDependencias.obtenerInstancia();
export default contenedor;
