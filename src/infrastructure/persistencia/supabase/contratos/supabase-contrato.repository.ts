import { Contrato } from "../../../../domain/entidades/contrato.entity";
import { RepositorioContrato } from "../../../../domain/repositorios/repositorio-contrato";
import { Resultado } from "../../../../shared/utilidades/resultado";
import {
  ErrorInfraestructura,
  ErrorNoEncontrado,
} from "../../../../domain/errores/error-base";
import { supabase } from "../supabase-client";

export class SupabaseContratoRepository implements RepositorioContrato {
  public async guardar(contrato: Contrato): Promise<Resultado<void>> {
    try {
      const { error } = await supabase.from("contratos").upsert({
        id: contrato.id,
        agencia_id: contrato.agenciaId,
        cliente_id: contrato.clienteId,
        proyecto_id: contrato.proyectoId,
        titulo: contrato.titulo,
        contenido: contrato.contenido,
        estado: contrato.estado,
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

  public async obtenerPorId(id: string): Promise<Resultado<Contrato>> {
    try {
      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return Resultado.falla(new ErrorNoEncontrado(error.message));
      }

      const contrato: Contrato = {
        id: data.id,
        agenciaId: data.agencia_id,
        clienteId: data.cliente_id,
        proyectoId: data.proyecto_id,
        titulo: data.titulo,
        contenido: data.contenido,
        estado: data.estado,
        creadoEn: new Date(data.creado_en),
        actualizadoEn: new Date(data.actualizado_en),
      };

      return Resultado.exito(contrato);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido";
      return Resultado.falla(new ErrorInfraestructura(mensaje));
    }
  }

  public async obtenerTodos(): Promise<Resultado<Contrato[]>> {
    try {
      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .is("eliminado_en", null);

      if (error) {
        return Resultado.falla(new ErrorInfraestructura(error.message));
      }

      const contratos: Contrato[] = (data || []).map((item) => ({
        id: item.id,
        agenciaId: item.agencia_id,
        clienteId: item.cliente_id,
        proyectoId: item.proyecto_id,
        titulo: item.titulo,
        contenido: item.contenido,
        estado: item.estado,
        creadoEn: new Date(item.creado_en),
        actualizadoEn: new Date(item.actualizado_en),
      }));

      return Resultado.exito(contratos);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido";
      return Resultado.falla(new ErrorInfraestructura(mensaje));
    }
  }

  public async eliminar(id: string): Promise<Resultado<void>> {
    try {
      const { error } = await supabase
        .from("contratos")
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
