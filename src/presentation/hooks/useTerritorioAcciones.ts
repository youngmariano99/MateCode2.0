import { db } from "../../offline/dexie/db";
import { QueueService } from "../../offline/services/queue.service";
import { useToast } from "./useToast";
import { GestionarContactoFrioUseCase } from "../../application/use-cases/crm/gestionar-contacto-frio.use-case";
import type { PotencialCliente } from "../components/territorio/ModalPotencialCliente";
import type { ItemImportadoPotencial } from "../components/territorio/ModalImportarPotenciales";
import type { FichaDigital } from "../../domain/entidades/contacto-frio.entity";

const useCase = new GestionarContactoFrioUseCase();

interface UseTerritorioAccionesParams {
  fichasDigitales: FichaDigital[];
  prospectoEdicion: PotencialCliente | null;
  prospectoVisita: PotencialCliente | null;
  prospectoAConvertir: PotencialCliente | null;
  onProspectoGuardado: () => void;
  onLoteImportado: () => void;
  onVisitaRegistrada: () => void;
  onConvertidoACrm: () => void;
}

/**
 * Handlers de mutación de la estación de prospección física, separados de
 * la página para que el componente se enfoque en orquestar UI, no en lógica
 * de guardado.
 */
export function useTerritorioAcciones({
  fichasDigitales,
  prospectoEdicion,
  prospectoVisita,
  prospectoAConvertir,
  onProspectoGuardado,
  onLoteImportado,
  onVisitaRegistrada,
  onConvertidoACrm,
}: UseTerritorioAccionesParams) {
  const { mostrarToast } = useToast();

  /**
   * Redes sociales son opcionales acá — si se cargó alguna, se guarda en la
   * ficha digital preservando lo que ya tenía (dolores, señales) cargado
   * desde Contacto en Frío, para no pisarlo con un formulario que no las
   * conoce.
   */
  const guardarRedesSiCorresponde = async (
    potencialClienteId: string,
    payload: Partial<PotencialCliente>
  ) => {
    if (
      !payload.whatsapp &&
      !payload.instagram &&
      !payload.facebook &&
      !payload.email
    ) {
      return;
    }
    const fichaExistente = fichasDigitales.find(
      (f) => f.potencialClienteId === potencialClienteId
    );
    await useCase.calificarFichaDigital(potencialClienteId, {
      whatsapp: payload.whatsapp || fichaExistente?.whatsapp,
      instagram: payload.instagram || fichaExistente?.instagram,
      facebook: payload.facebook || fichaExistente?.facebook,
      email: payload.email || fichaExistente?.email,
      nombreDueño: fichaExistente?.nombreDueño,
      dolorTags: fichaExistente?.dolorTags || [],
      tieneWeb: fichaExistente?.tieneWeb || "no",
      usaCatalogoNativoWhatsapp:
        fichaExistente?.usaCatalogoNativoWhatsapp || false,
      notasExtra: fichaExistente?.notasExtra,
      referenciaPosteo: fichaExistente?.referenciaPosteo,
    });
  };

  const handleCrearOEditarProspecto = async (
    payload: Partial<PotencialCliente>
  ) => {
    try {
      const direccionCalle = payload.direccionCalle?.trim();
      if (prospectoEdicion) {
        await useCase.actualizarDatosBasicos(prospectoEdicion.id, {
          nombre: payload.nombre,
          rubro: payload.rubro,
          prioridad: payload.prioridad,
        });
        if (direccionCalle) {
          await useCase.agregarFichaFisica(prospectoEdicion.id, {
            direccionCalle,
            direccionCiudad: payload.direccionCiudad,
            direccionProvincia: payload.direccionProvincia,
            latitud: payload.latitud,
            longitud: payload.longitud,
          });
        }
        await guardarRedesSiCorresponde(prospectoEdicion.id, payload);
        mostrarToast("Prospecto actualizado con éxito.", "exito");
      } else {
        const res = await useCase.crearProspecto({
          nombre: payload.nombre || "Prospecto Sin Nombre",
          rubro: payload.rubro,
          prioridad: payload.prioridad || "Media",
        });
        if (res.ok && direccionCalle) {
          await useCase.agregarFichaFisica(res.valor, {
            direccionCalle,
            direccionCiudad: payload.direccionCiudad,
            direccionProvincia: payload.direccionProvincia,
            latitud: payload.latitud,
            longitud: payload.longitud,
          });
        }
        if (res.ok) {
          await guardarRedesSiCorresponde(res.valor, payload);
        }
        mostrarToast("Prospecto registrado con éxito.", "exito");
      }
      onProspectoGuardado();
    } catch {
      mostrarToast("Ocurrió un error al guardar el prospecto.", "error");
    }
  };

  const handleImportarLote = async (lote: ItemImportadoPotencial[]) => {
    try {
      for (const p of lote) {
        const res = await useCase.crearProspecto({
          nombre: p.nombre || "Prospecto Sin Nombre",
          rubro: p.rubro,
          prioridad: p.prioridad || "Media",
        });
        if (!res.ok) continue;
        if (p.direccionCalle?.trim()) {
          await useCase.agregarFichaFisica(res.valor, {
            direccionCalle: p.direccionCalle,
            direccionCiudad: p.direccionCiudad,
            direccionProvincia: p.direccionProvincia,
            latitud: p.latitud,
            longitud: p.longitud,
          });
        }
        if (p.whatsapp || p.email || p.instagram || p.facebook) {
          await useCase.calificarFichaDigital(res.valor, {
            instagram: p.instagram,
            whatsapp: p.whatsapp,
            email: p.email,
            facebook: p.facebook,
            dolorTags: [],
            tieneWeb: "no",
            usaCatalogoNativoWhatsapp: false,
          });
        }
      }
      mostrarToast(
        `Se importaron ${lote.length} prospectos correctamente.`,
        "exito"
      );
      onLoteImportado();
    } catch {
      mostrarToast("Error al importar prospectos en lote.", "error");
    }
  };

  const handleRegistrarVisita = async (resultado: {
    visitado: boolean;
    motivoNoVisita?: string;
    volverFecha?: string;
  }) => {
    if (!prospectoVisita) return;
    const res = await useCase.registrarVisitaFisica(prospectoVisita.id, {
      visitado: resultado.visitado,
      motivoNoVisita: resultado.motivoNoVisita,
      volverFecha: resultado.volverFecha
        ? new Date(resultado.volverFecha).getTime()
        : undefined,
    });
    if (res.ok) {
      mostrarToast("Visita registrada con éxito.", "exito");
      onVisitaRegistrada();
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  const handleConfirmarConversionCrm = async (
    crmPayload: Record<string, unknown>
  ) => {
    if (!prospectoAConvertir) return;
    try {
      const clienteId = `cli_${Date.now()}`;
      const clientePayload = {
        id: clienteId,
        ...crmPayload,
        latitud: prospectoAConvertir.latitud,
        longitud: prospectoAConvertir.longitud,
        creadoEn: Date.now(),
      };
      await db.transaction("rw", [db.clientes, db.cola_eventos], async () => {
        await db.clientes.add(clientePayload);
        await QueueService.encolar(
          "clientes",
          "crear",
          clienteId,
          clientePayload
        );
      });
      await useCase.marcarClienteCerrado(prospectoAConvertir.id);
      mostrarToast(
        "¡Felicidades! Prospecto convertido con éxito a Cliente CRM.",
        "exito"
      );
      onConvertidoACrm();
    } catch {
      mostrarToast("Error al convertir el prospecto.", "error");
    }
  };

  const eliminarProspecto = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este prospecto?"))
      return;
    const res = await useCase.eliminarProspecto(id);
    if (res.ok) {
      mostrarToast("Prospecto eliminado.", "info");
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  return {
    handleCrearOEditarProspecto,
    handleImportarLote,
    handleRegistrarVisita,
    handleConfirmarConversionCrm,
    eliminarProspecto,
  };
}
