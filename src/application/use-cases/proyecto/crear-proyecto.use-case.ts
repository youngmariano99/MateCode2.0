import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { QueueService } from "../../../offline/services/queue.service";
import { useConexionStore } from "../../../presentation/stores/conexion.store";

export class CrearProyectoUseCase {
  public async ejecutar(
    proyecto: Record<string, unknown>
  ): Promise<Resultado<void>> {
    const online = useConexionStore.getState().online;
    const id = (proyecto.id as string) || `pro_${Date.now()}`;
    const payload = {
      ...proyecto,
      id,
      creadoEn: Date.now(),
      actualizadoEn: Date.now(),
    };

    await db.proyectos.put(payload);

    // Initialize Default Design System (Swiss Design) and placeholders
    const defaultDesignSystem = {
      proyectoId: id,
      arquetipo: "Diseño Suizo",
      metafora:
        "Prioriza la jerarquía tipográfica y el espacio en blanco por encima de los elementos decorativos. Menos componentes, mejor alineación.",
      radioBordes: "0px",
      sombras: "Prohibidas",
      directrizNegacion:
        "Evitar elementos de adorno innecesarios, no usar esquinas redondeadas exageradas ni sombras difusas.",
      parejaTipografica: "Inter (con pesos extremos Thin 100 y Black 900)",
      escalaEspaciado: "Holgado",
      reglaColor:
        "Fondo oscuro/gris profundo, texto claro con alta legibilidad, un solo color de acento minimalista.",
      estiloAnimaciones: "Secas 0ms",
      estadoHover: "Invertir colores o agregar borde sutil",
      logoUrl: "",
    };
    await db.proyecto_design_system.put(defaultDesignSystem);

    await db.proyecto_contexto.put({
      proyectoId: id,
      doloresCliente: "",
      reglasNegocio: "",
      publicoObjetivo: "",
    });

    await db.proyecto_estado_tecnico.put({
      proyectoId: id,
      dependencias: [],
      esquemaDb: {},
    });

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Proyectos: Proyecto creado y Design System inicializado: ${proyecto.nombre}`,
      fecha: Date.now(),
    });

    if (!online) {
      await QueueService.encolar("proyectos", "crear", id, payload);
    }

    return Resultado.exito(undefined);
  }
}
