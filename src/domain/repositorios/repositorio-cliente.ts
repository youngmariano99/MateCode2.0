import { Cliente } from "../entidades/cliente.entity";
import { Repositorio } from "./repositorio";

export type RepositorioCliente = Repositorio<Cliente, string>;
