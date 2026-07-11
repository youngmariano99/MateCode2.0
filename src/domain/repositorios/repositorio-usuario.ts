import { Usuario } from "../entidades/usuario.entity";
import { Repositorio } from "./repositorio";

export type RepositorioUsuario = Repositorio<Usuario, string>;
