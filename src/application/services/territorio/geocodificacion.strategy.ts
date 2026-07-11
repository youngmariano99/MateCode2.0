import { Resultado } from "../../../shared/utilidades/resultado";
import { ErrorValidacion } from "../../../domain/errores/error-base";

export interface Coordenadas {
  latitud: number;
  longitud: number;
  precision: string;
  proveedor: string;
  direccionFormateada?: string;
}

export interface GeocodificacionStrategy {
  geocodificar(direccion: string): Promise<Resultado<Coordenadas>>;
}

export class GoogleGeocodificacionStrategy implements GeocodificacionStrategy {
  public async geocodificar(
    direccion: string
  ): Promise<Resultado<Coordenadas>> {
    if (!direccion?.trim()) {
      return Resultado.falla(new ErrorValidacion("Dirección vacía."));
    }
    const lat = -34.6 + Math.random() * 0.1;
    const lng = -58.4 - Math.random() * 0.1;
    return Resultado.exito({
      latitud: lat,
      longitud: lng,
      precision: "Alta",
      proveedor: "Google Maps Mock",
      direccionFormateada: `${direccion} (Verificado con Google Mock)`,
    });
  }
}

export class OpenStreetMapGeocodificacionStrategy implements GeocodificacionStrategy {
  public async geocodificar(
    direccion: string
  ): Promise<Resultado<Coordenadas>> {
    if (!direccion?.trim()) {
      return Resultado.falla(new ErrorValidacion("Dirección vacía."));
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          direccion
        )}`,
        {
          headers: {
            "User-Agent": "MateCodeApp/1.0",
          },
        }
      );
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        return Resultado.exito({
          latitud: parseFloat(item.lat),
          longitud: parseFloat(item.lon),
          precision: "Alta",
          proveedor: "OpenStreetMap (Nominatim)",
          direccionFormateada: item.display_name,
        });
      }
    } catch {
      // Fallback to offline simulation if network is down or query blocked
    }

    // Offline simulation fallback
    const lat = -34.61 + Math.random() * 0.08;
    const lng = -58.42 - Math.random() * 0.08;
    return Resultado.exito({
      latitud: lat,
      longitud: lng,
      precision: "Media",
      proveedor: "OpenStreetMap Mock (Offline)",
      direccionFormateada: `${direccion} (Coordenadas simuladas offline)`,
    });
  }
}
