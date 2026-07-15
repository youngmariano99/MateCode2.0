import { Resultado } from "../../../shared/utilidades/resultado";

export interface PuntoRuta {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  prioridad?: "Alta" | "Media" | "Baja";
}

export interface RutaOptimizada {
  puntos: PuntoRuta[];
  distanciaKm: number;
  duracionMin: number;
  proveedor: string;
  geometriaGeoJson?: [number, number][]; // Coordinates tracing the actual streets
}

export interface OptimizacionStrategy {
  optimizar(
    puntos: PuntoRuta[],
    perfil?: "driving" | "foot"
  ): Promise<Resultado<RutaOptimizada>>;
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
    let scoreMinimo = Infinity;
    for (let i = 0; i < pendientes.length; i++) {
      const p = pendientes[i];
      const dist = calcularDistanciaHaversine(
        actual.latitud,
        actual.longitud,
        p.latitud,
        p.longitud
      );

      // Default to 1.8 for Media, 3.0 for Baja, and 1.0 for Alta (favors Alta first unless Low/Medium are very close)
      let factor = 1.0;
      if (p.prioridad === "Media") {
        factor = 1.8;
      } else if (p.prioridad === "Baja") {
        factor = 3.0;
      }

      const score = dist * factor;
      if (score < scoreMinimo) {
        scoreMinimo = score;
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
    puntos: PuntoRuta[],
    perfil: "driving" | "foot" = "driving"
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

    let distancia = Math.round(5 + puntos.length * 1.5);
    let duracion = Math.round(15 + puntos.length * 20);
    let geometria: [number, number][] | undefined = undefined;

    try {
      const coordsStr = ordenados
        .map((p) => `${p.longitud},${p.latitud}`)
        .join(";");
      const serviceProfile = perfil === "foot" ? "routed-foot" : "routed-car";
      const url = `https://routing.openstreetmap.de/${serviceProfile}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.routes && data.routes[0]) {
        const route = data.routes[0];
        distancia = parseFloat((route.distance / 1000).toFixed(2));
        duracion = Math.round(route.duration / 60);
        if (route.geometry && route.geometry.coordinates) {
          geometria = route.geometry.coordinates.map((c: [number, number]) => [
            c[1],
            c[0],
          ]);
        }
      }
    } catch {
      // offline fallback
    }

    return Resultado.exito({
      puntos: ordenados,
      distanciaKm: distancia,
      duracionMin: duracion,
      proveedor: "GraphHopper",
      geometriaGeoJson: geometria,
    });
  }
}

export class OSRMOptimizacionStrategy implements OptimizacionStrategy {
  public async optimizar(
    puntos: PuntoRuta[],
    perfil: "driving" | "foot" = "driving"
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

    let distancia = Math.round(4 + puntos.length * 1.8);
    let duracion = Math.round(10 + puntos.length * 22);
    let geometria: [number, number][] | undefined = undefined;

    try {
      const coordsStr = ordenados
        .map((p) => `${p.longitud},${p.latitud}`)
        .join(";");
      const serviceProfile = perfil === "foot" ? "routed-foot" : "routed-car";
      const url = `https://routing.openstreetmap.de/${serviceProfile}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.routes && data.routes[0]) {
        const route = data.routes[0];
        distancia = parseFloat((route.distance / 1000).toFixed(2));
        duracion = Math.round(route.duration / 60);
        if (route.geometry && route.geometry.coordinates) {
          geometria = route.geometry.coordinates.map((c: [number, number]) => [
            c[1],
            c[0],
          ]);
        }
      }
    } catch {
      // offline fallback
    }

    return Resultado.exito({
      puntos: ordenados,
      distanciaKm: distancia,
      duracionMin: duracion,
      proveedor: "OSRM",
      geometriaGeoJson: geometria,
    });
  }
}
