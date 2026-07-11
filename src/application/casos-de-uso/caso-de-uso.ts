import { Resultado } from "../../shared/utilidades/resultado";

export interface CasoDeUso<Entrada, Salida> {
  ejecutar(entrada: Entrada): Promise<Resultado<Salida>> | Resultado<Salida>;
}
