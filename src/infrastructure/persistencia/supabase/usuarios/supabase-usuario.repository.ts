import { Usuario } from "../../../../domain/entidades/usuario.entity";
import { RepositorioUsuario } from "../../../../domain/repositorios/repositorio-usuario";
import { Resultado } from "../../../../shared/utilidades/resultado";
import {
  ErrorInfraestructura,
  ErrorNoEncontrado,
} from "../../../../domain/errores/error-base";
import { supabase } from "../supabase-client";

export class SupabaseUsuarioRepository implements RepositorioUsuario {
  public async guardar(usuario: Usuario): Promise<Resultado<void>> {
    try {
      const { error } = await supabase.from("usuarios").upsert({
        id: usuario.id,
        agencia_id: usuario.agenciaId,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol_id: usuario.rolId,
        estado: usuario.estado,
        actualizado_en: new Date().toISOString(),
      });

      if (error) {
        return Resultado.falla(new ErrorInfraestructura(error.message));
      }
      return Resultado.exito(undefined);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido";
      return Resultado.falla(new ErrorInfraestructura(mensaje));
    }
  }

  public async obtenerPorId(id: string): Promise<Resultado<Usuario>> {
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return Resultado.falla(new ErrorNoEncontrado(error.message));
      }

      const usuario: Usuario = {
        id: data.id,
        agenciaId: data.agencia_id,
        nombre: data.nombre,
        correo: data.correo,
        rolId: data.rol_id,
        estado: data.estado,
        creadoEn: new Date(data.creado_en),
        actualizadoEn: new Date(data.actualizado_en),
      };

      return Resultado.exito(usuario);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido";
      return Resultado.falla(new ErrorInfraestructura(mensaje));
    }
  }

  public async obtenerTodos(): Promise<Resultado<Usuario[]>> {
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .is("eliminado_en", null);

      if (error) {
        return Resultado.falla(new ErrorInfraestructura(error.message));
      }

      const usuarios: Usuario[] = (data || []).map((item) => ({
        id: item.id,
        agenciaId: item.agencia_id,
        nombre: item.nombre,
        correo: item.correo,
        rolId: item.rol_id,
        estado: item.estado,
        creadoEn: new Date(item.creado_en),
        actualizadoEn: new Date(item.actualizado_en),
      }));

      return Resultado.exito(usuarios);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido";
      return Resultado.falla(new ErrorInfraestructura(mensaje));
    }
  }

  public async eliminar(id: string): Promise<Resultado<void>> {
    try {
      const { error } = await supabase
        .from("usuarios")
        .update({ eliminado_en: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        return Resultado.falla(new ErrorInfraestructura(error.message));
      }
      return Resultado.exito(undefined);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido";
      return Resultado.falla(new ErrorInfraestructura(mensaje));
    }
  }
}
