import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { ErrorValidacion } from "../../../domain/errores/error-base";
import {
  GraphHopperOptimizacionStrategy,
  OSRMOptimizacionStrategy,
  PuntoRuta,
  RutaOptimizada,
} from "../../services/territorio/optimizacion.strategy";

export class CalcularRecorridoUseCase {
  private gh = new GraphHopperOptimizacionStrategy();
  private osrm = new OSRMOptimizacionStrategy();

  public async ejecutar(
    puntos: PuntoRuta[],
    proveedor: "GraphHopper" | "OSRM" = "GraphHopper",
    perfil: "driving" | "foot" = "driving"
  ): Promise<Resultado<RutaOptimizada>> {
    if (puntos.length === 0) {
      return Resultado.falla(
        new ErrorValidacion("No hay puntos para calcular recorrido.")
      );
    }
    const strategy = proveedor === "GraphHopper" ? this.gh : this.osrm;
    const res = await strategy.optimizar(puntos, perfil);
    if (!res.ok) {
      return Resultado.falla(res.error!);
    }

    const ruta = res.valor;
    const recorridoId = `rec_${Date.now()}`;

    await db.recorridos.put({
      id: recorridoId,
      fecha: Date.now(),
      distanciaKm: ruta.distanciaKm,
      duracionMin: ruta.duracionMin,
      proveedor: ruta.proveedor,
      perfil: perfil,
      puntos: ruta.puntos,
      geometriaGeoJson: ruta.geometriaGeoJson,
    });

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Territorio: Recorrido calculado y guardado con ID: ${recorridoId} usando ${ruta.proveedor} (${perfil})`,
      fecha: Date.now(),
    });

    return Resultado.exito(ruta);
  }
}
