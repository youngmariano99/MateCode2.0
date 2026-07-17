/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";

export class GestionarContactosUseCase {
  /**
   * Crea una nueva sesión de prospección/contacto
   */
  public async crearSesion(nombre: string): Promise<Resultado<string>> {
    if (!nombre.trim()) {
      return Resultado.falla(
        new ErrorDominio("El nombre de la sesión es obligatorio.")
      );
    }
    const id = `ses_${Date.now()}`;
    try {
      await db.contacto_sesiones.add({
        id,
        nombre: nombre.trim(),
        creadoEn: Date.now(),
        estado: "ACTIVE",
      });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear sesión."
        )
      );
    }
  }

  /**
   * Agrega un prospecto a una sesión activa
   * Valida el límite estricto de 15 prospectos por lote
   */
  public async agregarProspectoSesion(
    sesionId: string,
    prospectoId: string
  ): Promise<Resultado<void>> {
    try {
      const sesion = await db.contacto_sesiones.get(sesionId);
      if (!sesion)
        return Resultado.falla(
          new ErrorNoEncontrado("No se encontró la sesión.")
        );

      // Contar cantidad de prospectos asignados a esta sesión
      const count = await db.potenciales_clientes
        .where("sesionId")
        .equals(sesionId)
        .count();
      if (count >= 15) {
        return Resultado.falla(
          new ErrorDominio(
            "Límite superado: Cada sesión de contacto puede tener un máximo de 15 prospectos para evitar bloqueos por spam."
          )
        );
      }

      const prospecto = await db.potenciales_clientes.get(prospectoId);
      if (!prospecto)
        return Resultado.falla(
          new ErrorNoEncontrado("No se encontró el prospecto.")
        );

      await db.potenciales_clientes.update(prospectoId, {
        sesionId,
        estadoOutbound: (prospecto as any).estadoOutbound || "Por Contactar",
        actualizadoEn: Date.now(),
      });

      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al agregar prospecto."
        )
      );
    }
  }

  /**
   * Quita un prospecto de una sesión de contacto
   */
  public async quitarProspectoSesion(
    prospectoId: string
  ): Promise<Resultado<void>> {
    try {
      const prospecto = await db.potenciales_clientes.get(prospectoId);
      if (!prospecto)
        return Resultado.falla(
          new ErrorNoEncontrado("No se encontró el prospecto.")
        );

      await db.potenciales_clientes.update(prospectoId, {
        sesionId: "",
        actualizadoEn: Date.now(),
      });

      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al quitar prospecto."
        )
      );
    }
  }

  /**
   * Crea un nuevo prospecto en frío "al vuelo" (on the fly)
   */
  public async crearProspectoAlVuelo(
    nombre: string,
    instagram?: string,
    whatsapp?: string,
    email?: string
  ): Promise<Resultado<string>> {
    if (!nombre.trim()) {
      return Resultado.falla(new ErrorDominio("El nombre es obligatorio."));
    }
    const id = `pot_${Date.now()}`;
    try {
      await db.potenciales_clientes.add({
        id,
        nombre: nombre.trim(),
        instagram: instagram?.trim() || "",
        whatsapp: whatsapp?.trim() || "",
        email: email?.trim() || "",
        visitado: false,
        visitasCount: 0,
        convertido: false,
        estadoOutbound: "Por Contactar",
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
      });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear prospecto."
        )
      );
    }
  }

  /**
   * Guarda los detalles de calificación/formulario del prospecto y el estado de su checklist
   */
  public async actualizarFichaProspecto(
    prospectoId: string,
    data: {
      nombreNegocio: string;
      rubro: string;
      ganchoEmpatico: string;
      canalVentaActual: string;
      dolorDetectado: string;
      servicioOfrecidoId: string;
      checklist: string[];
    }
  ): Promise<Resultado<void>> {
    try {
      const prospecto = await db.potenciales_clientes.get(prospectoId);
      if (!prospecto)
        return Resultado.falla(
          new ErrorNoEncontrado("No se encontró el prospecto.")
        );

      await db.potenciales_clientes.update(prospectoId, {
        nombreNegocio: data.nombreNegocio.trim(),
        rubro: data.rubro.trim(),
        ganchoEmpatico: data.ganchoEmpatico.trim(),
        canalVentaActual: data.canalVentaActual.trim(),
        dolorDetectado: data.dolorDetectado.trim(),
        servicioOfrecidoId: data.servicioOfrecidoId,
        checklistWarming: data.checklist,
        actualizadoEn: Date.now(),
      });

      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al actualizar ficha."
        )
      );
    }
  }

  /**
   * Compila el Prompt Maestro de Pitch inyectando toda la ficha y detalles del servicio ofrecido
   */
  public async compilarPitchPrompt(
    prospectoId: string
  ): Promise<Resultado<string>> {
    try {
      const p = await db.potenciales_clientes.get(prospectoId);
      if (!p)
        return Resultado.falla(
          new ErrorNoEncontrado("No se encontró el prospecto.")
        );

      const serviceId = (p as any).servicioOfrecidoId;
      let serviceName = "Servicio de Desarrollo Web";
      let serviceDesc = "Desarrollo web premium a medida.";

      if (serviceId) {
        const service = await db.servicios_agencia.get(serviceId);
        if (service) {
          serviceName = (service as any).nombre;
          serviceDesc = (service as any).descripcion || "";
        }
      }

      const promptMaestro = `Actúa como un Copywriter de Ventas Outbound de Elite especializado en ventas en frío por Instagram. 
Tu objetivo es redactar un mensaje de primer contacto corto, empático, directo y altamente personalizado.

INFORMACIÓN DEL PROSPECTO:
- Nombre del Negocio: ${(p as any).nombreNegocio || p.nombre}
- Rubro/Industria: ${(p as any).rubro || "N/A"}
- Canal de Contacto: Instagram
- Gancho Empático (Lo que vimos e investigamos en su perfil/web): ${(p as any).ganchoEmpatico || ""}
- Canal de Venta Actual que usan: ${(p as any).canalVentaActual || ""}
- Dolor o Deficiencia Técnica Detectada: ${(p as any).dolorDetectado || ""}

SERVICIO A OFRECER (Solución a su dolor):
- Servicio: ${serviceName}
- Descripción: ${serviceDesc}

INSTRUCCIONES DE REDACCIÓN:
1. No uses saludos corporativos ni acartonados ("Estimado/a"). Sé cercano pero profesional.
2. Comienza directamente con el Gancho Empático de manera sutil para demostrar que investigamos de verdad su cuenta.
3. Menciona el dolor técnico detectado y cómo nuestro servicio lo soluciona, sin sonar condescendiente ni invasivo.
4. Finaliza con una llamada a la acción (CTA) súper simple y de baja presión (ej. "¿Te interesaría que te arme un video Loom de 2 minutos sin compromiso detallándolo?").
5. Longitud máxima: 150 palabras. Que quepa cómodamente en un chat de Instagram.`;

      return Resultado.exito(promptMaestro);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al compilar prompt pitch."
        )
      );
    }
  }

  /**
   * Guarda de forma manual el Pitch final redactado por la IA
   */
  public async guardarPitchFinal(
    prospectoId: string,
    pitchFinal: string
  ): Promise<Resultado<void>> {
    try {
      const p = await db.potenciales_clientes.get(prospectoId);
      if (!p)
        return Resultado.falla(
          new ErrorNoEncontrado("No se encontró el prospecto.")
        );

      await db.potenciales_clientes.update(prospectoId, {
        pitch: pitchFinal,
        actualizadoEn: Date.now(),
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al guardar pitch final."
        )
      );
    }
  }

  /**
   * Cambia el estado del prospecto e inicia acciones colaterales
   */
  public async cambiarEstadoProspecto(
    prospectoId: string,
    nuevoEstado:
      | "Por Contactar"
      | "Rechazado"
      | "En Seguimiento"
      | "Aceptado"
      | "Reunión / Loom",
    metadata?: {
      motivoRechazo?: string;
      tipoReunion?: "sincronica" | "loom";
      fechaReunion?: number;
      linkLoom?: string;
    }
  ): Promise<Resultado<void>> {
    try {
      const p = await db.potenciales_clientes.get(prospectoId);
      if (!p)
        return Resultado.falla(
          new ErrorNoEncontrado("No se encontró el prospecto.")
        );

      const updates: Record<string, any> = {
        estadoOutbound: nuevoEstado,
        fechaUltimoContacto: Date.now(),
        actualizadoEn: Date.now(),
      };

      if (nuevoEstado === "Rechazado") {
        if (!metadata?.motivoRechazo?.trim()) {
          return Resultado.falla(
            new ErrorDominio(
              "Es obligatorio ingresar un motivo para registrar el rechazo."
            )
          );
        }
        updates.motivoRechazo = metadata.motivoRechazo.trim();
      }

      await db.potenciales_clientes.update(prospectoId, updates);

      if (nuevoEstado === "Reunión / Loom" && metadata) {
        // Handoff to reuniones
        const reunionId = `reu_${Date.now()}`;
        await db.reuniones_contacto.add({
          id: reunionId,
          prospectoId,
          tipo: metadata.tipoReunion || "loom",
          fecha: metadata.fechaReunion || Date.now(),
          linkLoom: metadata.linkLoom || "",
          completado: false,
        });
      }

      if (nuevoEstado === "Aceptado") {
        // Convert to client core
        const clientRes = await this.convertirAClienteCore(prospectoId);
        if (!clientRes.ok) return Resultado.falla(clientRes.error!);
      }

      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al cambiar estado."
        )
      );
    }
  }

  /**
   * Obtiene la lista de seguimientos pendientes calculando reactivamente 'dias_sin_respuesta'
   */
  public async obtenerListaSeguimiento(): Promise<Resultado<any[]>> {
    try {
      // Traer todos los prospectos en seguimiento
      const list = await db.potenciales_clientes
        .where("estadoOutbound")
        .equals("En Seguimiento")
        .toArray();

      const calculatedList = list.map((p) => {
        const lastContact = (p as any).fechaUltimoContacto || p.creadoEn;
        const diffMs = Date.now() - lastContact;
        const diasSinRespuesta = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return {
          ...p,
          dias_sin_respuesta: diasSinRespuesta,
        };
      });

      // Ordenar descendente (los que llevan más días sin responder van primero)
      calculatedList.sort(
        (a, b) => b.dias_sin_respuesta - a.dias_sin_respuesta
      );

      return Resultado.exito(calculatedList);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al obtener lista."
        )
      );
    }
  }

  private async convertirAClienteCore(
    prospectoId: string
  ): Promise<Resultado<string>> {
    try {
      const p = await db.potenciales_clientes.get(prospectoId);
      if (!p)
        return Resultado.falla(
          new ErrorNoEncontrado("No se encontró el prospecto.")
        );

      const clientId = `cli_${Date.now()}`;
      await db.clientes.add({
        id: clientId,
        nombre: p.nombre,
        correo: (p as any).email || "",
        telefono: (p as any).whatsapp || "",
        instagram: (p as any).instagram || "",
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
      });

      // Mark prospect as converted
      await db.potenciales_clientes.update(prospectoId, {
        convertido: true,
        clienteIdRef: clientId,
        actualizadoEn: Date.now(),
      });

      return Resultado.exito(clientId);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al convertir cliente."
        )
      );
    }
  }
}
