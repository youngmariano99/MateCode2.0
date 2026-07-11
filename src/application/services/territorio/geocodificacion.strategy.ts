import { Resultado } from "../../../shared/utilidades/resultado";
import { ErrorValidacion } from "../../../domain/errores/error-base";

export interface Coordenadas {
  latitud: number;
  longitud: number;
  precision: string;
  proveedor: string;
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
      proveedor: "Google",
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
    const lat = -34.61 + Math.random() * 0.08;
    const lng = -58.42 - Math.random() * 0.08;
    return Resultado.exito({
      latitud: lat,
      longitud: lng,
      precision: "Media",
      proveedor: "OpenStreetMap",
    });
  }
}
