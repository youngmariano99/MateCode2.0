export interface NavegacionStrategy {
  obtenerUrl(lat: number, lng: number, label?: string): string;
}

export class GoogleMapsNavegacionStrategy implements NavegacionStrategy {
  public obtenerUrl(lat: number, lng: number, label?: string): string {
    const q = label ? encodeURIComponent(label) : "";
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}${
      q ? `&query_place_id=${q}` : ""
    }`;
  }
}

export class AppleMapsNavegacionStrategy implements NavegacionStrategy {
  public obtenerUrl(lat: number, lng: number, label?: string): string {
    const q = label ? encodeURIComponent(label) : "Destino";
    return `http://maps.apple.com/?q=${q}&ll=${lat},${lng}`;
  }
}

export class WazeNavegacionStrategy implements NavegacionStrategy {
  public obtenerUrl(lat: number, lng: number): string {
    return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  }
}
