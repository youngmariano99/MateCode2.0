import { Proyecto } from "../../../../domain/entidades/proyecto.entity";
import { RepositorioProyecto } from "../../../../domain/repositorios/repositorio-proyecto";
import { Resultado } from "../../../../shared/utilidades/resultado";
import {
  ErrorInfraestructura,
  ErrorNoEncontrado,
} from "../../../../domain/errores/error-base";
import { supabase } from "../supabase-client";

export class SupabaseProyectoRepository implements RepositorioProyecto {
  public async guardar(proyecto: Proyecto): Promise<Resultado<void>> {
    try {
      const { error } = await supabase.from("proyectos").upsert({
        id: proyecto.id,
        agencia_id: proyecto.agenciaId,
        cliente_id: proyecto.clienteId,
        nombre: proyecto.nombre,
        descripcion: proyecto.descripcion,
        tipo: proyecto.tipo,
        estado: proyecto.estado,
        fecha_inicio: proyecto.fechaInicio
          ? proyecto.fechaInicio.toISOString()
          : null,
        fecha_entrega: proyecto.fechaEntrega
          ? proyecto.fechaEntrega.toISOString()
          : null,
        responsable_id: proyecto.responsableId,
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

  public async obtenerPorId(id: string): Promise<Resultado<Proyecto>> {
    try {
      const { data, error } = await supabase
        .from("proyectos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return Resultado.falla(new ErrorNoEncontrado(error.message));
      }

      const proyecto: Proyecto = {
        id: data.id,
        agenciaId: data.agencia_id,
        clienteId: data.cliente_id,
        nombre: data.nombre,
        descripcion: data.descripcion,
        tipo: data.tipo,
        estado: data.estado,
        fechaInicio: data.fecha_inicio
          ? new Date(data.fecha_inicio)
          : undefined,
        fechaEntrega: data.fecha_entrega
          ? new Date(data.fecha_entrega)
          : undefined,
        responsableId: data.responsable_id,
        creadoEn: new Date(data.creado_en),
        actualizadoEn: new Date(data.actualizado_en),
      };

      return Resultado.exito(proyecto);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido";
      return Resultado.falla(new ErrorInfraestructura(mensaje));
    }
  }

  public async obtenerTodos(): Promise<Resultado<Proyecto[]>> {
    try {
      const { data, error } = await supabase
        .from("proyectos")
        .select("*")
        .is("eliminado_en", null);

      if (error) {
        return Resultado.falla(new ErrorInfraestructura(error.message));
      }

      const proyectos: Proyecto[] = (data || []).map((item) => ({
        id: item.id,
        agenciaId: item.agencia_id,
        clienteId: item.cliente_id,
        nombre: item.nombre,
        descripcion: item.descripcion,
        tipo: item.tipo,
        estado: item.estado,
        fechaInicio: item.fecha_inicio
          ? new Date(item.fecha_inicio)
          : undefined,
        fechaEntrega: item.fecha_entrega
          ? new Date(item.fecha_entrega)
          : undefined,
        responsableId: item.responsable_id,
        creadoEn: new Date(item.creado_en),
        actualizadoEn: new Date(item.actualizado_en),
      }));

      return Resultado.exito(proyectos);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido";
      return Resultado.falla(new ErrorInfraestructura(mensaje));
    }
  }

  public async eliminar(id: string): Promise<Resultado<void>> {
    try {
      const { error } = await supabase
        .from("proyectos")
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
