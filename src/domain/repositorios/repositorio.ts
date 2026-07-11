import { Resultado } from "../../shared/utilidades/resultado";

export interface Repositorio<Entidad, ID> {
  guardar(entidad: Entidad): Promise<Resultado<void>>;
  obtenerPorId(id: ID): Promise<Resultado<Entidad>>;
  obtenerTodos(): Promise<Resultado<Entidad[]>>;
  eliminar(id: ID): Promise<Resultado<void>>;
}
