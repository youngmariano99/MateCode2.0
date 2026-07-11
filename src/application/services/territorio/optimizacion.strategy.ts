import { Resultado } from "../../../shared/utilidades/resultado";

export interface PuntoRuta {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
}

export interface RutaOptimizada {
  puntos: PuntoRuta[];
  distanciaKm: number;
  duracionMin: number;
  proveedor: string;
}

export interface OptimizacionStrategy {
  optimizar(puntos: PuntoRuta[]): Promise<Resultado<RutaOptimizada>>;
}

export class GraphHopperOptimizacionStrategy implements OptimizacionStrategy {
  public async optimizar(
    puntos: PuntoRuta[]
  ): Promise<Resultado<RutaOptimizada>> {
    const ordenados = [...puntos].sort((a, b) => a.latitud - b.latitud);
    const distancia = Math.round(5 + puntos.length * 1.5);
    const duracion = Math.round(15 + puntos.length * 20);

    return Resultado.exito({
      puntos: ordenados,
      distanciaKm: distancia,
      duracionMin: duracion,
      proveedor: "GraphHopper",
    });
  }
}

export class OSRMOptimizacionStrategy implements OptimizacionStrategy {
  public async optimizar(
    puntos: PuntoRuta[]
  ): Promise<Resultado<RutaOptimizada>> {
    const ordenados = [...puntos].sort((a, b) => a.longitud - b.longitud);
    const distancia = Math.round(4 + puntos.length * 1.8);
    const duracion = Math.round(10 + puntos.length * 22);

    return Resultado.exito({
      puntos: ordenados,
      distanciaKm: distancia,
      duracionMin: duracion,
      proveedor: "OSRM",
    });
  }
}
