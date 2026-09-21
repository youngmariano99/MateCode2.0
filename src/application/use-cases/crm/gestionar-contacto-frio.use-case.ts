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
  type AccionProximoPaso,
  type Aprendizaje,
  type PotencialCliente,
  type TipoEnvio,
} from "../../../domain/entidades/contacto-frio.entity";
import {
  DIAS_ENTRE_SEGUIMIENTOS,
  DIAS_HASTA_PRIMER_SEGUIMIENTO,
  resumirProspecto,
  sumarDiasMs,
  aprendizajeAcumulado,
} from "../../../domain/entidades/contacto-frio-cinta.entity";
import type { ProspectoIA } from "../../../domain/entidades/contacto-frio-ia.entity";
import { GestionarCatalogoEtiquetasUseCase } from "../shared/gestionar-catalogo-etiquetas.use-case";
import { CrmUseCase } from "./CrmUseCase";

function idUnico(prefijo: string): string {
  return `${prefijo}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/** null = borrar el valor; undefined = no tocarlo. */
interface CambiosProximoPaso {
  proximoPasoAccion?: AccionProximoPaso | null;
  proximoPasoFecha?: number | null;
  proximoPasoNota?: string | null;
}

export interface EntradaRegistrarEnvio {
  potencialClienteId: string;
  canal: "Instagram" | "WhatsApp" | "Email" | "Facebook" | "Presencial";
  mensaje: string;
  tipoEnvio: TipoEnvio;
  aprendizaje?: Aprendizaje;
  /** En cuántos días toca volver a hablarle. Si no se pasa, sale de la cadencia (2 días, después 7). */
  diasHastaProximoToque?: number;
  /** Qué toca cuando llegue esa fecha (por defecto, hacer seguimiento). */
  proximoPasoAccion?: AccionProximoPaso;
  proximoPasoNota?: string;
}

export interface EntradaRegistrarRespuesta {
  potencialClienteId: string;
  canal: "Instagram" | "WhatsApp" | "Email" | "Facebook" | "Presencial";
  respuestaTexto: string;
  aprendizaje?: Aprendizaje;
  resultado?: "Respondió" | "Pidió más info";
}

/**
 * Reemplaza GestionarContactosUseCase (taller-contacto + territorio digital):
 * un solo embudo de estados, calculado a partir de los intentos de contacto
 * reales, en vez de 3 vocabularios paralelos que nunca se reconciliaban.
 */
export class GestionarContactoFrioUseCase {
  private readonly catalogoEtiquetas = new GestionarCatalogoEtiquetasUseCase();

  public async crearProspecto(
    input: CrearProspectoInput
  ): Promise<Resultado<string>> {
    const parsed = crearProspectoSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const ahora = Date.now();
    const id = idUnico("pot");
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
   * Enviada / Cliente Cerrado (ver métodos dedicados abajo). Un estado ya
   * avanzado NO retrocede: escribirle un seguimiento a alguien "En
   * Conversación" o con la demo enviada no lo devuelve a "Contactado".
   */
  public async registrarIntento(
    input: RegistrarIntentoInput,
    cambiosProximoPaso: CambiosProximoPaso = {}
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
    const id = idUnico("int");
    const intento = { id, ...parsed.data, fecha: ahora, creadoEn: ahora };

    const actual = prospecto.estado;
    let nuevoEstado: EstadoEmbudo;
    if (parsed.data.resultado === "Rechazó") {
      nuevoEstado = "Rechazado";
    } else if (parsed.data.tipoEnvio === "demo") {
      nuevoEstado = "Demo Enviada";
    } else if (
      parsed.data.resultado === "Respondió" ||
      parsed.data.resultado === "Pidió más info"
    ) {
      nuevoEstado =
        actual === "Demo Enviada" || actual === "Cliente Cerrado"
          ? actual
          : "En Conversación";
    } else {
      nuevoEstado = actual === "Nuevo" ? "Contactado" : actual;
    }

    const cambiosDexie: Partial<PotencialCliente> = {
      estado: nuevoEstado,
      fechaUltimoContacto: ahora,
      actualizadoEn: ahora,
    };
    const payloadServidor: Record<string, unknown> = { ...cambiosDexie };
    for (const clave of [
      "proximoPasoAccion",
      "proximoPasoFecha",
      "proximoPasoNota",
    ] as const) {
      const valor = cambiosProximoPaso[clave];
      if (valor === undefined) continue;
      (cambiosDexie as Record<string, unknown>)[clave] =
        valor === null ? undefined : valor;
      payloadServidor[clave] = valor;
    }

    try {
      await db.intento_contacto.add(intento);
      await QueueService.encolar("intento_contacto", "crear", id, intento);

      await db.potencial_cliente.update(
        parsed.data.potencialClienteId,
        cambiosDexie
      );
      await QueueService.encolar(
        "potencial_cliente",
        "editar",
        parsed.data.potencialClienteId,
        { id: parsed.data.potencialClienteId, ...payloadServidor }
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

  private async cargarResumen(potencialClienteId: string) {
    const prospecto = await db.potencial_cliente.get(potencialClienteId);
    if (!prospecto) return undefined;
    const intentos = await db.intento_contacto
      .where("potencialClienteId")
      .equals(potencialClienteId)
      .toArray();
    return resumirProspecto(prospecto, intentos, Date.now());
  }

  /**
   * Un mensaje MÍO (apertura, seguimiento, respuesta, demo…). Deja
   * programado cuándo toca volver a hablarle: 2 días después del primer
   * mensaje sin respuesta, 7 después de cada seguimiento siguiente — o los
   * días que se elijan. El lead sigue en la cinta hasta que se lo pase a
   * Rechazado (o Cliente Cerrado): nunca se cierra solo.
   */
  public async registrarEnvio(
    entrada: EntradaRegistrarEnvio
  ): Promise<Resultado<string>> {
    if (!entrada.mensaje.trim()) {
      return Resultado.falla(
        new ErrorDominio("Pegá el mensaje que mandaste para dejarlo guardado.")
      );
    }
    const resumen = await this.cargarResumen(entrada.potencialClienteId);
    if (!resumen) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el prospecto.")
      );
    }
    const dias =
      entrada.diasHastaProximoToque ??
      (resumen.enviadosSinRespuesta + 1 <= 1
        ? DIAS_HASTA_PRIMER_SEGUIMIENTO
        : DIAS_ENTRE_SEGUIMIENTOS);
    return this.registrarIntento(
      {
        potencialClienteId: entrada.potencialClienteId,
        canal: entrada.canal,
        mensajeEnviado: entrada.mensaje.trim(),
        resultado: "Sin respuesta",
        tagsResultado: [],
        tipoEnvio: entrada.tipoEnvio,
        aprendizaje: entrada.aprendizaje,
      },
      {
        proximoPasoAccion: entrada.proximoPasoAccion ?? "seguir",
        proximoPasoFecha: sumarDiasMs(Date.now(), dias),
        proximoPasoNota: entrada.proximoPasoNota ?? null,
      }
    );
  }

  /** Lo que ME escribieron (o "ya hablamos, respondió"): la pelota pasa a mi lado hasta que conteste. */
  public async registrarRespuestaRecibida(
    entrada: EntradaRegistrarRespuesta
  ): Promise<Resultado<string>> {
    if (!entrada.respuestaTexto.trim()) {
      return Resultado.falla(new ErrorDominio("Pegá lo que te escribió."));
    }
    return this.registrarIntento(
      {
        potencialClienteId: entrada.potencialClienteId,
        canal: entrada.canal,
        resultado: entrada.resultado ?? "Respondió",
        respuestaTexto: entrada.respuestaTexto.trim(),
        tagsResultado: [],
        aprendizaje: entrada.aprendizaje,
      },
      { proximoPasoAccion: null, proximoPasoFecha: null, proximoPasoNota: null }
    );
  }

  /**
   * "Quedamos en algo" (sin necesidad de pegar la conversación): deja
   * anotado qué toca y para cuándo. Pasa a la estación ② cuando llega la
   * fecha. "Esperar que escriba" sin fecha queda solo a la vista.
   */
  public async fijarProximoPaso(entrada: {
    potencialClienteId: string;
    accion: AccionProximoPaso;
    dias?: number;
    nota?: string;
  }): Promise<Resultado<void>> {
    const prospecto = await db.potencial_cliente.get(
      entrada.potencialClienteId
    );
    if (!prospecto) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el prospecto.")
      );
    }
    const ahora = Date.now();
    const fecha =
      entrada.dias !== undefined
        ? sumarDiasMs(ahora, entrada.dias)
        : sumarDiasMs(ahora, entrada.accion === "esperar" ? 7 : 0);
    const cambios = {
      ...(prospecto.estado === "Nuevo"
        ? { estado: "Contactado" as const }
        : {}),
      proximoPasoAccion: entrada.accion,
      proximoPasoFecha: fecha,
      proximoPasoNota: entrada.nota?.trim() || undefined,
      actualizadoEn: ahora,
    };
    try {
      await db.potencial_cliente.update(entrada.potencialClienteId, cambios);
      await QueueService.encolar(
        "potencial_cliente",
        "editar",
        entrada.potencialClienteId,
        {
          id: entrada.potencialClienteId,
          ...(cambios.estado ? { estado: cambios.estado } : {}),
          proximoPasoAccion: entrada.accion,
          proximoPasoFecha: fecha,
          proximoPasoNota: cambios.proximoPasoNota ?? null,
          actualizadoEn: ahora,
        }
      );
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error
            ? err.message
            : "Error al guardar el próximo paso."
        )
      );
    }
  }

  /** "Ya está": el lead pasa a Rechazado, con el motivo que se elija. Es la única forma de que salga de la cinta sin ser cliente. */
  public async descartarLead(
    potencialClienteId: string,
    motivos: string[] = [],
    nota?: string
  ): Promise<Resultado<string>> {
    const ultimo = await db.intento_contacto
      .where("potencialClienteId")
      .equals(potencialClienteId)
      .sortBy("fecha");
    const canal = ultimo[ultimo.length - 1]?.canal ?? "Instagram";
    return this.registrarIntento(
      {
        potencialClienteId,
        canal,
        resultado: "Rechazó",
        respuestaTexto: nota?.trim() || undefined,
        tagsResultado: motivos,
      },
      { proximoPasoAccion: null, proximoPasoFecha: null, proximoPasoNota: null }
    );
  }

  /**
   * El lead aceptó: pasa a "Cliente Cerrado" Y se crea el Cliente en el CRM
   * (con los datos de la ficha y lo aprendido en las conversaciones), ya
   * vinculado — desde ahí se le arma un Proyecto directo. Si ya se había
   * convertido, devuelve el mismo cliente sin duplicarlo.
   */
  public async cerrarComoCliente(
    potencialClienteId: string
  ): Promise<Resultado<string>> {
    const prospecto = await db.potencial_cliente.get(potencialClienteId);
    if (!prospecto) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el prospecto.")
      );
    }
    if (prospecto.clienteId) {
      const existente = await db.clientes.get(prospecto.clienteId);
      if (existente) return Resultado.exito(prospecto.clienteId);
    }
    const ficha = await db.ficha_digital.get(potencialClienteId);
    const intentos = await db.intento_contacto
      .where("potencialClienteId")
      .equals(potencialClienteId)
      .toArray();
    const aprendido = aprendizajeAcumulado(intentos);

    const observaciones = [
      prospecto.rubro ? `Rubro: ${prospecto.rubro}` : "",
      ficha?.dolorTags?.length
        ? `Dolores vistos: ${ficha.dolorTags.join(", ")}`
        : "",
      aprendido.citaDolor ? `Lo que dijo: ${aprendido.citaDolor}` : "",
      aprendido.casoPasado ? `Caso concreto: ${aprendido.casoPasado}` : "",
      aprendido.comoLoResuelve
        ? `Cómo lo resuelve hoy: ${aprendido.comoLoResuelve}`
        : "",
      aprendido.costo ? `Le cuesta: ${aprendido.costo}` : "",
      ficha?.notasExtra ? `Notas: ${ficha.notasExtra}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const clienteId = idUnico("cli");
    const redes = [ficha?.instagram, ficha?.facebook]
      .filter(Boolean)
      .join(" · ");
    const creado = await new CrmUseCase().crearCliente({
      id: clienteId,
      nombre: ficha?.nombreDueño || prospecto.nombre,
      empresa: prospecto.nombre,
      correo: ficha?.email || "",
      whatsapp: ficha?.whatsapp || undefined,
      telefono: ficha?.whatsapp || undefined,
      redes: redes || undefined,
      origenContacto: "Llamado en frío",
      estado: "Cliente Activo",
      observaciones: observaciones || undefined,
    });
    if (!creado.ok) return Resultado.falla(creado.error!);

    const ahora = Date.now();
    try {
      await db.potencial_cliente.update(potencialClienteId, {
        estado: "Cliente Cerrado",
        clienteId,
        proximoPasoAccion: undefined,
        proximoPasoFecha: undefined,
        proximoPasoNota: undefined,
        actualizadoEn: ahora,
      });
      await QueueService.encolar(
        "potencial_cliente",
        "editar",
        potencialClienteId,
        {
          id: potencialClienteId,
          estado: "Cliente Cerrado",
          clienteId,
          proximoPasoAccion: null,
          proximoPasoFecha: null,
          proximoPasoNota: null,
          actualizadoEn: ahora,
        }
      );
      return Resultado.exito(clienteId);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al cerrar el cliente."
        )
      );
    }
  }

  /**
   * Alta en lote de prospectos ya calificados (lo que devuelve el prompt de
   * la estación ④). No duplica: un comercio con el mismo nombre que ya
   * existe se omite; los que no califican también se dejan afuera.
   */
  public async importarProspectos(
    items: ProspectoIA[]
  ): Promise<
    Resultado<{ creados: number; duplicados: number; noCalifican: number }>
  > {
    const existentes = new Set(
      (await db.potencial_cliente.toArray()).map((p) =>
        p.nombre.trim().toLowerCase()
      )
    );
    const catalogoDolor = new Map(
      (
        await db.catalogo_etiquetas.where("categoria").equals("dolor").toArray()
      ).map((e) => [e.etiqueta.trim().toLowerCase(), e.etiqueta])
    );
    let creados = 0;
    let duplicados = 0;
    let noCalifican = 0;
    for (const item of items) {
      if (item.califica === false) {
        noCalifican++;
        continue;
      }
      const clave = item.nombre.trim().toLowerCase();
      if (existentes.has(clave)) {
        duplicados++;
        continue;
      }
      const alta = await this.crearProspecto({
        nombre: item.nombre,
        rubro: item.rubro,
        prioridad: "Media",
      });
      if (!alta.ok) continue;
      existentes.add(clave);
      creados++;
      await this.calificarFichaDigital(alta.valor!, {
        instagram: item.instagram?.replace(/^@/, ""),
        whatsapp: item.whatsapp,
        facebook: item.facebook,
        email: item.email,
        nombreDueño: item.nombreDueño,
        dolorTags: item.dolorTags
          .map((t) => catalogoDolor.get(t.trim().toLowerCase()))
          .filter((t): t is string => !!t),
        tieneWeb: item.tieneWeb,
        usaCatalogoNativoWhatsapp: item.usaCatalogoNativoWhatsapp,
        referenciaPosteo: item.referenciaPosteo,
        notasExtra: item.notasExtra,
      });
    }
    return Resultado.exito({ creados, duplicados, noCalifican });
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
    return this.catalogoEtiquetas.crearEtiqueta(etiqueta, categoria);
  }
}
