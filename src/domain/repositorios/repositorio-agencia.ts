import { Agencia } from "../entidades/agencia.entity";
import { Repositorio } from "./repositorio";

export type RepositorioAgencia = Repositorio<Agencia, string>;
