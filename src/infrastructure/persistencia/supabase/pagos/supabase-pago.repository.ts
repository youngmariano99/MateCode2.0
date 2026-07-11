import { Pago } from "../../../../domain/entidades/pago.entity";
import { RepositorioPago } from "../../../../domain/repositorios/repositorio-pago";
import { Resultado } from "../../../../shared/utilidades/resultado";
import {
  ErrorInfraestructura,
  ErrorNoEncontrado,
} from "../../../../domain/errores/error-base";
import { supabase } from "../supabase-client";

export class SupabasePagoRepository implements RepositorioPago {
  public async guardar(pago: Pago): Promise<Resultado<void>> {
    try {
      const { error } = await supabase.from("pagos").upsert({
        id: pago.id,
        agencia_id: pago.agenciaId,
        cliente_id: pago.clienteId,
        proyecto_id: pago.proyectoId,
        monto: pago.monto,
        moneda: pago.moneda,
        estado: pago.estado,
        fecha_vencimiento: pago.fechaVencimiento.toISOString(),
        fecha_pago: pago.fechaPago ? pago.fechaPago.toISOString() : null,
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

  public async obtenerPorId(id: string): Promise<Resultado<Pago>> {
    try {
      const { data, error } = await supabase
        .from("pagos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return Resultado.falla(new ErrorNoEncontrado(error.message));
      }

      const pago: Pago = {
        id: data.id,
        agenciaId: data.agencia_id,
        clienteId: data.cliente_id,
        proyectoId: data.proyecto_id,
        monto: Number(data.monto),
        moneda: data.moneda,
        estado: data.estado,
        fechaVencimiento: new Date(data.fecha_vencimiento),
        fechaPago: data.fecha_pago ? new Date(data.fecha_pago) : undefined,
        creadoEn: new Date(data.creado_en),
        actualizadoEn: new Date(data.actualizado_en),
      };

      return Resultado.exito(pago);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido";
      return Resultado.falla(new ErrorInfraestructura(mensaje));
    }
  }

  public async obtenerTodos(): Promise<Resultado<Pago[]>> {
    try {
      const { data, error } = await supabase
        .from("pagos")
        .select("*")
        .is("eliminado_en", null);

      if (error) {
        return Resultado.falla(new ErrorInfraestructura(error.message));
      }

      const pagos: Pago[] = (data || []).map((item) => ({
        id: item.id,
        agenciaId: item.agencia_id,
        clienteId: item.cliente_id,
        proyectoId: item.proyecto_id,
        monto: Number(item.monto),
        moneda: item.moneda,
        estado: item.estado,
        fechaVencimiento: new Date(item.fecha_vencimiento),
        fechaPago: item.fecha_pago ? new Date(item.fecha_pago) : undefined,
        creadoEn: new Date(item.creado_en),
        actualizadoEn: new Date(item.actualizado_en),
      }));

      return Resultado.exito(pagos);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido";
      return Resultado.falla(new ErrorInfraestructura(mensaje));
    }
  }

  public async eliminar(id: string): Promise<Resultado<void>> {
    try {
      const { error } = await supabase
        .from("pagos")
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
