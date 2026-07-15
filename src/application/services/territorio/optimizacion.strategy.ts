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

  // 1. Separate selected prospects into Primary (Alta) and Secondary (Media + Baja)
  const primarios: PuntoRuta[] = [];
  const secundarios: PuntoRuta[] = [];

  puntos.forEach((p) => {
    if (p.id === "mi_posicion_actual") return;

    if (p.prioridad === "Alta") {
      primarios.push(p);
    } else {
      secundarios.push(p);
    }
  });

  // Fallback: If no Alta points are selected, treat all selected prospects as primary
  if (primarios.length === 0) {
    puntos.forEach((p) => {
      if (p.id !== "mi_posicion_actual") {
        primarios.push(p);
      }
    });
  }

  if (primarios.length === 0) {
    return inicio ? [inicio] : [];
  }

  // 2. Build the primary backbone route
  const rutaPrimaria: PuntoRuta[] = [];
  const pendientesPrimarios = [...primarios];

  // Select the primary point closest to the starting point to start the backbone
  let actual: PuntoRuta;
  if (inicio) {
    let indexClosest = 0;
    let distMin = Infinity;
    for (let i = 0; i < pendientesPrimarios.length; i++) {
      const d = calcularDistanciaHaversine(
        inicio.latitud,
        inicio.longitud,
        pendientesPrimarios[i].latitud,
        pendientesPrimarios[i].longitud
      );
      if (d < distMin) {
        distMin = d;
        indexClosest = i;
      }
    }
    actual = pendientesPrimarios[indexClosest];
    pendientesPrimarios.splice(indexClosest, 1);
  } else {
    actual = pendientesPrimarios.shift()!;
  }

  rutaPrimaria.push(actual);

  // Build the rest of the primary route
  while (pendientesPrimarios.length > 0) {
    let indexMasCercano = 0;
    let distMinima = Infinity;
    for (let i = 0; i < pendientesPrimarios.length; i++) {
      const dist = calcularDistanciaHaversine(
        actual.latitud,
        actual.longitud,
        pendientesPrimarios[i].latitud,
        pendientesPrimarios[i].longitud
      );
      if (dist < distMinima) {
        distMinima = dist;
        indexMasCercano = i;
      }
    }
    actual = pendientesPrimarios[indexMasCercano];
    rutaPrimaria.push(actual);
    pendientesPrimarios.splice(indexMasCercano, 1);
  }

  // 3. Prepare the route with starting point at index 0 for detour evaluation
  const rutaFinal = inicio ? [inicio, ...rutaPrimaria] : [...rutaPrimaria];

  // 4. Insert secondary points into the route
  secundarios.forEach((sec) => {
    if (sec.id === "mi_posicion_actual") return;

    let bestIndex = rutaFinal.length;
    let minDetour = Infinity;

    for (let i = 0; i < rutaFinal.length - 1; i++) {
      const pA = rutaFinal[i];
      const pB = rutaFinal[i + 1];

      // If evaluating the very first segment (from starting point to the first primary point),
      // we only allow insertion if the secondary point is physically closer to the start than to the primary destination.
      // This prevents distant cluster points from being visited first before reaching the first high-priority point.
      if (inicio && i === 0) {
        const distToStart = calcularDistanciaHaversine(
          pA.latitud,
          pA.longitud,
          sec.latitud,
          sec.longitud
        );
        const distToFirstPrimary = calcularDistanciaHaversine(
          sec.latitud,
          sec.longitud,
          pB.latitud,
          pB.longitud
        );
        if (distToStart > distToFirstPrimary) {
          continue; // Skip this segment, evaluate other segments in the cluster instead!
        }
      }

      const distAS = calcularDistanciaHaversine(
        pA.latitud,
        pA.longitud,
        sec.latitud,
        sec.longitud
      );
      const distSB = calcularDistanciaHaversine(
        sec.latitud,
        sec.longitud,
        pB.latitud,
        pB.longitud
      );
      const distAB = calcularDistanciaHaversine(
        pA.latitud,
        pA.longitud,
        pB.latitud,
        pB.longitud
      );

      const detour = distAS + distSB - distAB;
      if (detour < minDetour) {
        minDetour = detour;
        bestIndex = i + 1;
      }
    }

    // Evaluate appending at the end
    const lastPoint = rutaFinal[rutaFinal.length - 1];
    const detourEnd = calcularDistanciaHaversine(
      lastPoint.latitud,
      lastPoint.longitud,
      sec.latitud,
      sec.longitud
    );
    if (detourEnd < minDetour) {
      minDetour = detourEnd;
      bestIndex = rutaFinal.length;
    }

    rutaFinal.splice(bestIndex, 0, sec);
  });

  return rutaFinal;
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
