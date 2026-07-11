import { Agencia } from "../../../../domain/entidades/agencia.entity";
import { RepositorioAgencia } from "../../../../domain/repositorios/repositorio-agencia";
import { Resultado } from "../../../../shared/utilidades/resultado";
import {
  ErrorInfraestructura,
  ErrorNoEncontrado,
} from "../../../../domain/errores/error-base";
import { supabase } from "../supabase-client";

export class SupabaseAgenciaRepository implements RepositorioAgencia {
  public async guardar(agencia: Agencia): Promise<Resultado<void>> {
    try {
      const { error } = await supabase.from("agencias").upsert({
        id: agencia.id,
        nombre_comercial: agencia.nombreComercial,
        tipo_agencia: agencia.tipoAgencia,
        nombre_legal: agencia.nombreLegal,
        descripcion: agencia.descripcion,
        sitio_web: agencia.sitioWeb,
        email_principal: agencia.emailPrincipal,
        telefono: agencia.telefono,
        estado: agencia.estado,
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

  public async obtenerPorId(id: string): Promise<Resultado<Agencia>> {
    try {
      const { data, error } = await supabase
        .from("agencias")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return Resultado.falla(new ErrorNoEncontrado(error.message));
      }

      const agencia: Agencia = {
        id: data.id,
        nombreComercial: data.nombre_comercial,
        tipoAgencia: data.tipo_agencia,
        nombreLegal: data.nombre_legal,
        descripcion: data.descripcion,
        sitioWeb: data.sitio_web,
        emailPrincipal: data.email_principal,
        telefono: data.telefono,
        estado: data.estado,
        creadoEn: new Date(data.creado_en),
        actualizadoEn: new Date(data.actualizado_en),
      };

      return Resultado.exito(agencia);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido";
      return Resultado.falla(new ErrorInfraestructura(mensaje));
    }
  }

  public async obtenerTodos(): Promise<Resultado<Agencia[]>> {
    try {
      const { data, error } = await supabase
        .from("agencias")
        .select("*")
        .is("eliminado_en", null);

      if (error) {
        return Resultado.falla(new ErrorInfraestructura(error.message));
      }

      const agencias: Agencia[] = (data || []).map((item) => ({
        id: item.id,
        nombreComercial: item.nombre_comercial,
        tipoAgencia: item.tipo_agencia,
        nombreLegal: item.nombre_legal,
        descripcion: item.descripcion,
        sitioWeb: item.sitio_web,
        emailPrincipal: item.email_principal,
        telefono: item.telefono,
        estado: item.estado,
        creadoEn: new Date(item.creado_en),
        actualizadoEn: new Date(item.actualizado_en),
      }));

      return Resultado.exito(agencias);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido";
      return Resultado.falla(new ErrorInfraestructura(mensaje));
    }
  }

  public async eliminar(id: string): Promise<Resultado<void>> {
    try {
      const { error } = await supabase
        .from("agencias")
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
