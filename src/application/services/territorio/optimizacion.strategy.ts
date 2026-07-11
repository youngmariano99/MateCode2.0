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

function calcularDistanciaHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function optimizarCaminoNearestNeighbor(
  puntos: PuntoRuta[],
  inicio: PuntoRuta | null
): PuntoRuta[] {
  if (puntos.length === 0) {
    return inicio ? [inicio] : [];
  }
  const ruta: PuntoRuta[] = [];
  const pendientes = [...puntos];

  let actual = inicio;
  if (!actual) {
    actual = pendientes.shift()!;
  }

  ruta.push(actual);

  while (pendientes.length > 0) {
    let indexMasCercano = 0;
    let distMinima = Infinity;
    for (let i = 0; i < pendientes.length; i++) {
      const dist = calcularDistanciaHaversine(
        actual.latitud,
        actual.longitud,
        pendientes[i].latitud,
        pendientes[i].longitud
      );
      if (dist < distMinima) {
        distMinima = dist;
        indexMasCercano = i;
      }
    }
    actual = pendientes[indexMasCercano];
    ruta.push(actual);
    pendientes.splice(indexMasCercano, 1);
  }

  return ruta;
}

export class GraphHopperOptimizacionStrategy implements OptimizacionStrategy {
  public async optimizar(
    puntos: PuntoRuta[]
  ): Promise<Resultado<RutaOptimizada>> {
    if (puntos.length === 0) {
      return Resultado.exito({
        puntos: [],
        distanciaKm: 0,
        duracionMin: 0,
        proveedor: "GraphHopper",
      });
    }

    const startingPoint = puntos[0];
    const remainingPoints = puntos.slice(1);
    const ordenados = optimizarCaminoNearestNeighbor(
      remainingPoints,
      startingPoint
    );

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
    if (puntos.length === 0) {
      return Resultado.exito({
        puntos: [],
        distanciaKm: 0,
        duracionMin: 0,
        proveedor: "OSRM",
      });
    }

    const startingPoint = puntos[0];
    const remainingPoints = puntos.slice(1);
    const ordenados = optimizarCaminoNearestNeighbor(
      remainingPoints,
      startingPoint
    );

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
