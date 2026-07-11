import { Proyecto } from "../entidades/proyecto.entity";
import { Repositorio } from "./repositorio";

export type RepositorioProyecto = Repositorio<Proyecto, string>;
