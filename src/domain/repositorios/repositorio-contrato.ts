import { Contrato } from "../entidades/contrato.entity";
import { Repositorio } from "./repositorio";

export type RepositorioContrato = Repositorio<Contrato, string>;
