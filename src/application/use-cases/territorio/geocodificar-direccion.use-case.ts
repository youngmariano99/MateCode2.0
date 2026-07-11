import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  GoogleGeocodificacionStrategy,
  OpenStreetMapGeocodificacionStrategy,
} from "../../services/territorio/geocodificacion.strategy";

export class GeocodificarDireccionUseCase {
  private google = new GoogleGeocodificacionStrategy();
  private osm = new OpenStreetMapGeocodificacionStrategy();

  public async ejecutar(
    clienteId: string,
    direccion: string,
    proveedor: "Google" | "OSM" = "Google"
  ): Promise<
    Resultado<{ latitud: number; longitud: number; proveedor: string }>
  > {
    const strategy = proveedor === "Google" ? this.google : this.osm;
    const res = await strategy.geocodificar(direccion);
    if (!res.ok) {
      return Resultado.falla(res.error!);
    }

    const { latitud, longitud, proveedor: prov } = res.valor;

    const cli = await db.clientes.get(clienteId);
    if (cli) {
      await db.clientes.put({
        ...cli,
        latitud,
        longitud,
        proveedorGeocodificacion: prov,
        fechaGeocodificacion: Date.now(),
      });
    }

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Territorio: Dirección geocodificada para cliente ${clienteId} usando ${prov}`,
      fecha: Date.now(),
    });

    return Resultado.exito({ latitud, longitud, proveedor: prov });
  }
}
