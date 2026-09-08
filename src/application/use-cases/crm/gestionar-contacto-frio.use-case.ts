import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  crearProspectoSchema,
  calificarFichaDigitalSchema,
  agregarFichaFisicaSchema,
  registrarIntentoSchema,
  type CrearProspectoInput,
  type CalificarFichaDigitalInput,
  type AgregarFichaFisicaInput,
  type RegistrarIntentoInput,
  type EstadoEmbudo,
  type CategoriaEtiqueta,
} from "../../../domain/entidades/contacto-frio.entity";

/**
 * Reemplaza GestionarContactosUseCase (taller-contacto + territorio digital):
 * un solo embudo de estados, calculado a partir de los intentos de contacto
 * reales, en vez de 3 vocabularios paralelos que nunca se reconciliaban.
 */
export class GestionarContactoFrioUseCase {
  public async crearProspecto(
    input: CrearProspectoInput
  ): Promise<Resultado<string>> {
    const parsed = crearProspectoSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const ahora = Date.now();
    const id = `pot_${ahora}`;
    const registro = {
      id,
      nombre: parsed.data.nombre.trim(),
      rubro: parsed.data.rubro?.trim() || undefined,
      prioridad: parsed.data.prioridad,
      estado: "Nuevo" as EstadoEmbudo,
      esHistoricoLegacy: false,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    try {
      await db.potencial_cliente.add(registro);
      await QueueService.encolar("potencial_cliente", "crear", id, registro);
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear prospecto."
        )
      );
    }
  }

  public async calificarFichaDigital(
    potencialClienteId: string,
    input: CalificarFichaDigitalInput
  ): Promise<Resultado<void>> {
    const parsed = calificarFichaDigitalSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const prospecto = await db.potencial_cliente.get(potencialClienteId);
    if (!prospecto) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el prospecto.")
      );
    }
    const ahora = Date.now();
    const registro = {
      potencialClienteId,
      ...parsed.data,
      actualizadoEn: ahora,
    };
    try {
      await db.ficha_digital.put(registro);
      await QueueService.encolar(
        "ficha_digital",
        "crear",
        potencialClienteId,
        registro
      );
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al calificar prospecto."
        )
      );
    }
  }

  public async agregarFichaFisica(
    potencialClienteId: string,
    input: AgregarFichaFisicaInput
  ): Promise<Resultado<void>> {
    const parsed = agregarFichaFisicaSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const prospecto = await db.potencial_cliente.get(potencialClienteId);
    if (!prospecto) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el prospecto.")
      );
    }
    const ahora = Date.now();
    const registro = {
      potencialClienteId,
      ...parsed.data,
      visitado: false,
      actualizadoEn: ahora,
    };
    try {
      await db.ficha_fisica.put(registro);
      await QueueService.encolar(
        "ficha_fisica",
        "crear",
        potencialClienteId,
        registro
      );
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al agregar ficha física."
        )
      );
    }
  }

  /**
   * Registra un intento de contacto y recalcula el estado del embudo a
   * partir del resultado — el estado nunca se edita a mano salvo Demo
   * Enviada / Cliente Cerrado (ver métodos dedicados abajo).
   */
  public async registrarIntento(
    input: RegistrarIntentoInput
  ): Promise<Resultado<string>> {
    const parsed = registrarIntentoSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const prospecto = await db.potencial_cliente.get(
      parsed.data.potencialClienteId
    );
    if (!prospecto) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el prospecto.")
      );
    }
    const ahora = Date.now();
    const id = `int_${ahora}`;
    const intento = { id, ...parsed.data, fecha: ahora, creadoEn: ahora };

    const nuevoEstado: EstadoEmbudo =
      parsed.data.resultado === "Rechazó"
        ? "Rechazado"
        : parsed.data.resultado === "Respondió" ||
            parsed.data.resultado === "Pidió más info"
          ? "En Conversación"
          : "Contactado";

    try {
      await db.intento_contacto.add(intento);
      await QueueService.encolar("intento_contacto", "crear", id, intento);

      await db.potencial_cliente.update(parsed.data.potencialClienteId, {
        estado: nuevoEstado,
        fechaUltimoContacto: ahora,
        actualizadoEn: ahora,
      });
      await QueueService.encolar(
        "potencial_cliente",
        "editar",
        parsed.data.potencialClienteId,
        {
          estado: nuevoEstado,
          fechaUltimoContacto: ahora,
          actualizadoEn: ahora,
        }
      );

      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al registrar el intento."
        )
      );
    }
  }

  private async fijarEstado(
    potencialClienteId: string,
    estado: EstadoEmbudo
  ): Promise<Resultado<void>> {
    const prospecto = await db.potencial_cliente.get(potencialClienteId);
    if (!prospecto) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el prospecto.")
      );
    }
    const ahora = Date.now();
    try {
      await db.potencial_cliente.update(potencialClienteId, {
        estado,
        actualizadoEn: ahora,
      });
      await QueueService.encolar(
        "potencial_cliente",
        "editar",
        potencialClienteId,
        {
          estado,
          actualizadoEn: ahora,
        }
      );
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al actualizar el estado."
        )
      );
    }
  }

  public async marcarDemoEnviada(
    potencialClienteId: string
  ): Promise<Resultado<void>> {
    return this.fijarEstado(potencialClienteId, "Demo Enviada");
  }

  public async marcarClienteCerrado(
    potencialClienteId: string
  ): Promise<Resultado<void>> {
    return this.fijarEstado(potencialClienteId, "Cliente Cerrado");
  }

  /** Edita nombre/rubro/prioridad de un prospecto ya existente. */
  public async actualizarDatosBasicos(
    potencialClienteId: string,
    cambios: {
      nombre?: string;
      rubro?: string;
      prioridad?: "Alta" | "Media" | "Baja";
    }
  ): Promise<Resultado<void>> {
    const prospecto = await db.potencial_cliente.get(potencialClienteId);
    if (!prospecto) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el prospecto.")
      );
    }
    const ahora = Date.now();
    const payload = { ...cambios, actualizadoEn: ahora };
    try {
      await db.potencial_cliente.update(potencialClienteId, payload);
      await QueueService.encolar(
        "potencial_cliente",
        "editar",
        potencialClienteId,
        payload
      );
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error
            ? err.message
            : "Error al actualizar el prospecto."
        )
      );
    }
  }

  /**
   * Registra el resultado de una visita presencial (estación de campo de
   * territorio). Una visita exitosa también cuenta como un intento de
   * contacto real — hace avanzar el mismo embudo único que usa el resto del
   * sistema, no un estado paralelo aparte.
   */
  public async registrarVisitaFisica(
    potencialClienteId: string,
    resultado: {
      visitado: boolean;
      motivoNoVisita?: string;
      volverFecha?: number;
    }
  ): Promise<Resultado<void>> {
    const fichaFisica = await db.ficha_fisica.get(potencialClienteId);
    if (!fichaFisica) {
      return Resultado.falla(
        new ErrorNoEncontrado(
          "Este prospecto todavía no tiene ficha física cargada."
        )
      );
    }
    const ahora = Date.now();
    const cambiosFicha = {
      visitado: resultado.visitado,
      motivoNoVisita: resultado.motivoNoVisita,
      volverFecha: resultado.volverFecha,
      actualizadoEn: ahora,
    };
    try {
      await db.ficha_fisica.update(potencialClienteId, cambiosFicha);
      await QueueService.encolar(
        "ficha_fisica",
        "editar",
        potencialClienteId,
        cambiosFicha
      );

      if (resultado.visitado) {
        await this.registrarIntento({
          potencialClienteId,
          canal: "Presencial",
          resultado: "Respondió",
          tagsResultado: [],
        });
      }
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al registrar la visita."
        )
      );
    }
  }

  /** Borra un prospecto y sus fichas/intentos asociados. */
  public async eliminarProspecto(
    potencialClienteId: string
  ): Promise<Resultado<void>> {
    try {
      const intentos = await db.intento_contacto
        .where("potencialClienteId")
        .equals(potencialClienteId)
        .toArray();
      for (const i of intentos) {
        await db.intento_contacto.delete(i.id);
        await QueueService.encolar("intento_contacto", "eliminar", i.id, {});
      }
      await db.ficha_digital.delete(potencialClienteId);
      await QueueService.encolar(
        "ficha_digital",
        "eliminar",
        potencialClienteId,
        {}
      );
      await db.ficha_fisica.delete(potencialClienteId);
      await QueueService.encolar(
        "ficha_fisica",
        "eliminar",
        potencialClienteId,
        {}
      );
      await db.potencial_cliente.delete(potencialClienteId);
      await QueueService.encolar(
        "potencial_cliente",
        "eliminar",
        potencialClienteId,
        {}
      );
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al eliminar el prospecto."
        )
      );
    }
  }

  public async crearEtiqueta(
    etiqueta: string,
    categoria: CategoriaEtiqueta
  ): Promise<Resultado<string>> {
    if (!etiqueta.trim()) {
      return Resultado.falla(
        new ErrorDominio("La etiqueta no puede estar vacía.")
      );
    }
    const ahora = Date.now();
    const id = `etq_${ahora}`;
    const registro = {
      id,
      etiqueta: etiqueta.trim(),
      categoria,
      esDelUsuario: true,
      creadoEn: ahora,
    };
    try {
      await db.catalogo_etiquetas.add(registro);
      await QueueService.encolar("catalogo_etiquetas", "crear", id, registro);
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear la etiqueta."
        )
      );
    }
  }
}
