import { Cliente } from "../../../../domain/entidades/cliente.entity";
import { RepositorioCliente } from "../../../../domain/repositorios/repositorio-cliente";
import { Resultado } from "../../../../shared/utilidades/resultado";
import {
  ErrorInfraestructura,
  ErrorNoEncontrado,
} from "../../../../domain/errores/error-base";
import { supabase } from "../supabase-client";

export class SupabaseClienteRepository implements RepositorioCliente {
  public async guardar(cliente: Cliente): Promise<Resultado<void>> {
    try {
      const { error } = await supabase.from("clientes").upsert({
        id: cliente.id,
        agencia_id: cliente.agenciaId,
        nombre_comercial: cliente.nombreComercial,
        razon_social: cliente.razonSocial,
        cuit: cliente.cuit,
        sitio_web: cliente.sitioWeb,
        estado: cliente.estado,
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

  public async obtenerPorId(id: string): Promise<Resultado<Cliente>> {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return Resultado.falla(new ErrorNoEncontrado(error.message));
      }

      const cliente: Cliente = {
        id: data.id,
        agenciaId: data.agencia_id,
        nombreComercial: data.nombre_comercial,
        razonSocial: data.razon_social,
        cuit: data.cuit,
        sitioWeb: data.sitio_web,
        estado: data.estado,
        creadoEn: new Date(data.creado_en),
        actualizadoEn: new Date(data.actualizado_en),
      };

      return Resultado.exito(cliente);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido";
      return Resultado.falla(new ErrorInfraestructura(mensaje));
    }
  }

  public async obtenerTodos(): Promise<Resultado<Cliente[]>> {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .is("eliminado_en", null);

      if (error) {
        return Resultado.falla(new ErrorInfraestructura(error.message));
      }

      const clientes: Cliente[] = (data || []).map((item) => ({
        id: item.id,
        agenciaId: item.agencia_id,
        nombreComercial: item.nombre_comercial,
        razonSocial: item.razon_social,
        cuit: item.cuit,
        sitioWeb: item.sitio_web,
        estado: item.estado,
        creadoEn: new Date(item.creado_en),
        actualizadoEn: new Date(item.actualizado_en),
      }));

      return Resultado.exito(clientes);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido";
      return Resultado.falla(new ErrorInfraestructura(mensaje));
    }
  }

  public async eliminar(id: string): Promise<Resultado<void>> {
    try {
      const { error } = await supabase
        .from("clientes")
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
