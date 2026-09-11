import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  integer,
  boolean,
  numeric,
  doublePrecision,
  jsonb,
} from "drizzle-orm/pg-core";

// --- Columnas de Auditoría y Tenant ---
export const columnasAuditoria = {
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
  eliminadoEn: timestamp("eliminado_en"),
  creadoPor: uuid("creado_por"),
  actualizadoPor: uuid("actualizado_por"),
  eliminadoPor: uuid("eliminado_por"),
};

// ==========================================
// 1. Núcleo y Seguridad
// ==========================================

export const agencias = pgTable("agencias", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombreComercial: varchar("nombre_comercial", { length: 255 }).notNull(),
  tipoAgencia: varchar("tipo_agencia", { length: 100 }).notNull(),
  nombreLegal: varchar("nombre_legal", { length: 255 }),
  descripcion: text("descripcion"),
  sitioWeb: varchar("sitio_web", { length: 255 }),
  emailPrincipal: varchar("email_principal", { length: 255 }),
  telefono: varchar("telefono", { length: 100 }),
  estado: varchar("estado", { length: 50 }).default("activo").notNull(),
  ...columnasAuditoria,
});

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  ...columnasAuditoria,
});

export const permisos = pgTable("permisos", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  ...columnasAuditoria,
});

export const rolesPermisos = pgTable("roles_permisos", {
  id: uuid("id").primaryKey().defaultRandom(),
  rolId: uuid("rol_id")
    .references(() => roles.id)
    .notNull(),
  permisoId: uuid("permiso_id")
    .references(() => permisos.id)
    .notNull(),
  ...columnasAuditoria,
});

export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  correo: varchar("correo", { length: 255 }).notNull(),
  rolId: uuid("rol_id")
    .references(() => roles.id)
    .notNull(),
  estado: varchar("estado", { length: 50 }).default("activo").notNull(),
  ...columnasAuditoria,
});

export const sesiones = pgTable("sesiones", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  usuarioId: uuid("usuario_id")
    .references(() => usuarios.id)
    .notNull(),
  token: text("token").notNull(),
  expiracion: timestamp("expiracion").notNull(),
  ...columnasAuditoria,
});

export const branding = pgTable("branding", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  colorPrincipal: varchar("color_principal", { length: 20 }),
  colorSecundario: varchar("color_secundario", { length: 20 }),
  firmaResponsable: text("firma_responsable"),
  pieCorreo: text("pie_correo"),
  ...columnasAuditoria,
});

export const configuracion = pgTable("configuracion", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  idioma: varchar("idioma", { length: 10 }).default("es").notNull(),
  zonaHoraria: varchar("zona_horaria", { length: 100 })
    .default("UTC")
    .notNull(),
  formatoFecha: varchar("formato_fecha", { length: 50 })
    .default("YYYY-MM-DD")
    .notNull(),
  formatoMoneda: varchar("formato_moneda", { length: 50 })
    .default("ARS")
    .notNull(),
  moneda: varchar("moneda", { length: 10 }).default("ARS").notNull(),
  ...columnasAuditoria,
});

export const historial = pgTable("historial", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  entidadTipo: varchar("entidad_tipo", { length: 100 }).notNull(),
  entidadId: uuid("entidad_id").notNull(),
  accion: varchar("accion", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  ...columnasAuditoria,
});

export const actividad = pgTable("actividad", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  usuarioId: uuid("usuario_id")
    .references(() => usuarios.id)
    .notNull(),
  descripcion: text("descripcion").notNull(),
  ...columnasAuditoria,
});

export const logs = pgTable("logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  nivel: varchar("nivel", { length: 50 }).notNull(),
  mensaje: text("mensaje").notNull(),
  errorStack: text("error_stack"),
  ...columnasAuditoria,
});

export const notificaciones = pgTable("notificaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  usuarioId: uuid("usuario_id")
    .references(() => usuarios.id)
    .notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  mensaje: text("mensaje").notNull(),
  leido: boolean("leido").default(false).notNull(),
  ...columnasAuditoria,
});

// ==========================================
// 2. Clientes y CRM
// ==========================================

export const rubros = pgTable("rubros", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  ...columnasAuditoria,
});

export const tiposSoftware = pgTable("tipos_software", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  ...columnasAuditoria,
});

export const clientes = pgTable("clientes", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  nombreComercial: varchar("nombre_comercial", { length: 255 }).notNull(),
  razonSocial: varchar("razon_social", { length: 255 }),
  cuit: varchar("cuit", { length: 50 }),
  sitioWeb: varchar("sitio_web", { length: 255 }),
  estado: varchar("estado", { length: 50 }).default("lead").notNull(),
  ...columnasAuditoria,
});

export const contactos = pgTable("contactos", {
  id: uuid("id").primaryKey().defaultRandom(),
  clienteId: uuid("cliente_id")
    .references(() => clientes.id)
    .notNull(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  cargo: varchar("cargo", { length: 100 }),
  observaciones: text("observaciones"),
  ...columnasAuditoria,
});

export const telefonos = pgTable("telefonos", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactoId: uuid("contacto_id")
    .references(() => contactos.id)
    .notNull(),
  numero: varchar("numero", { length: 100 }).notNull(),
  tipo: varchar("tipo", { length: 50 }).default("movil").notNull(),
  ...columnasAuditoria,
});

export const correos = pgTable("correos", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactoId: uuid("contacto_id")
    .references(() => contactos.id)
    .notNull(),
  direccion: varchar("direccion", { length: 255 }).notNull(),
  tipo: varchar("tipo", { length: 50 }).default("trabajo").notNull(),
  ...columnasAuditoria,
});

export const redesSociales = pgTable("redes_sociales", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactoId: uuid("contacto_id")
    .references(() => contactos.id)
    .notNull(),
  plataforma: varchar("plataforma", { length: 100 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  ...columnasAuditoria,
});

export const direcciones = pgTable("direcciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  clienteId: uuid("cliente_id")
    .references(() => clientes.id)
    .notNull(),
  calle: varchar("calle", { length: 255 }).notNull(),
  numero: varchar("numero", { length: 50 }),
  ciudad: varchar("ciudad", { length: 100 }).notNull(),
  provincia: varchar("provincia", { length: 100 }).notNull(),
  pais: varchar("pais", { length: 100 }).notNull(),
  codigoPostal: varchar("codigo_postal", { length: 50 }),
  latitud: doublePrecision("latitud"),
  longitud: doublePrecision("longitud"),
  tipo: varchar("tipo", { length: 50 }).default("fiscal").notNull(),
  ...columnasAuditoria,
});

export const etiquetas = pgTable("etiquetas", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).notNull(),
  ...columnasAuditoria,
});

export const clienteEtiquetas = pgTable("cliente_etiquetas", {
  id: uuid("id").primaryKey().defaultRandom(),
  clienteId: uuid("cliente_id")
    .references(() => clientes.id)
    .notNull(),
  etiquetaId: uuid("etiqueta_id")
    .references(() => etiquetas.id)
    .notNull(),
  ...columnasAuditoria,
});

export const estadosCliente = pgTable("estados_cliente", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).notNull(),
  orden: integer("orden").notNull(),
  ...columnasAuditoria,
});

// ==========================================
// 3. Proyectos
// ==========================================

export const proyectos = pgTable("proyectos", {
  id: varchar("id", { length: 255 }).primaryKey(),
  agenciaId: uuid("agencia_id").references(() => agencias.id),
  clienteId: uuid("cliente_id").references(() => clientes.id),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  descripcion: text("descripcion"),
  tipo: varchar("tipo", { length: 100 }).notNull(),
  estado: varchar("estado", { length: 50 }).default("pendiente").notNull(),
  fechaInicio: timestamp("fecha_inicio"),
  fechaEntrega: timestamp("fecha_entrega"),
  responsableId: uuid("responsable_id").references(() => usuarios.id),
  ...columnasAuditoria,
});

export const comentarios = pgTable("comentarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  proyectoId: varchar("proyecto_id", { length: 255 })
    .references(() => proyectos.id)
    .notNull(),
  usuarioId: uuid("usuario_id")
    .references(() => usuarios.id)
    .notNull(),
  contenido: text("contenido").notNull(),
  ...columnasAuditoria,
});

export const archivos = pgTable("archivos", {
  id: uuid("id").primaryKey().defaultRandom(),
  proyectoId: varchar("proyecto_id", { length: 255 })
    .references(() => proyectos.id)
    .notNull(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  tipo: varchar("tipo", { length: 100 }).notNull(),
  peso: integer("peso").notNull(),
  ...columnasAuditoria,
});

// ==========================================
// 4. Pagos
// ==========================================

export const formasPago = pgTable("formas_pago", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  ...columnasAuditoria,
});

export const pagos = pgTable("pagos", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  clienteId: uuid("cliente_id")
    .references(() => clientes.id)
    .notNull(),
  proyectoId: varchar("proyecto_id", { length: 255 }).references(
    () => proyectos.id
  ),
  monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
  moneda: varchar("moneda", { length: 10 }).default("ARS").notNull(),
  estado: varchar("estado", { length: 50 }).default("pendiente").notNull(),
  fechaVencimiento: timestamp("fecha_vencimiento").notNull(),
  fechaPago: timestamp("fecha_pago"),
  ...columnasAuditoria,
});

export const cuotas = pgTable("cuotas", {
  id: uuid("id").primaryKey().defaultRandom(),
  pagoId: uuid("pago_id")
    .references(() => pagos.id)
    .notNull(),
  numeroCuota: integer("numero_cuota").notNull(),
  monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
  fechaVencimiento: timestamp("fecha_vencimiento").notNull(),
  estado: varchar("estado", { length: 50 }).default("pendiente").notNull(),
  ...columnasAuditoria,
});

export const facturas = pgTable("facturas", {
  id: uuid("id").primaryKey().defaultRandom(),
  pagoId: uuid("pago_id")
    .references(() => pagos.id)
    .notNull(),
  numeroFactura: varchar("numero_factura", { length: 100 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  estado: varchar("estado", { length: 50 }).default("emitida").notNull(),
  ...columnasAuditoria,
});

// ==========================================
// 5. Contratos
// ==========================================

export const contratos = pgTable("contratos", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  clienteId: uuid("cliente_id")
    .references(() => clientes.id)
    .notNull(),
  proyectoId: varchar("proyecto_id", { length: 255 }).references(
    () => proyectos.id
  ),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  contenido: text("contenido").notNull(),
  estado: varchar("estado", { length: 50 }).default("borrador").notNull(),
  ...columnasAuditoria,
});

export const plantillas = pgTable("plantillas", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  contenido: text("contenido").notNull(),
  variables: text("variables"), // Guardado como lista o JSON en string
  ...columnasAuditoria,
});

export const firmas = pgTable("firmas", {
  id: uuid("id").primaryKey().defaultRandom(),
  contratoId: uuid("contrato_id")
    .references(() => contratos.id)
    .notNull(),
  usuarioId: uuid("usuario_id")
    .references(() => usuarios.id)
    .notNull(),
  fechaFirma: timestamp("fecha_firma").defaultNow().notNull(),
  ipDireccion: varchar("ip_direccion", { length: 100 }),
  ...columnasAuditoria,
});

// "Documentos inteligentes" (contratos/presupuestos/propuestas con
// versionado) — id varchar generado en cliente, mismo patrón que
// potencial_cliente. Faltaba esta tabla: el use-case ya encolaba eventos
// "documentos" hacia /sync desde que se creó la función, pero al no existir
// ni la tabla ni la entrada en tableMapper, todo evento quedaba agotando
// reintentos en la cola para siempre — el documento nunca salía del navegador.
export const documentos = pgTable("documentos", {
  id: varchar("id", { length: 255 }).primaryKey(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  tipo: varchar("tipo", { length: 100 }).notNull(),
  clienteId: varchar("cliente_id", { length: 255 }),
  proyectoId: varchar("proyecto_id", { length: 255 }),
  monto: varchar("monto", { length: 100 }),
  formaPago: varchar("forma_pago", { length: 100 }),
  contenido: text("contenido").notNull(),
  versiones: jsonb("versiones"),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

// ==========================================
// 6. Comercial y Prospección
// ==========================================

// Contacto en frío — rediseño (Fase 4.2). Reemplaza los antiguos
// contactos_frio/seguimientos/llamadas, que nunca tuvieron código real que
// los usara (la lógica vivía enteramente en Dexie, en potenciales_clientes).
// IDs varchar generados en cliente (no uuid defaultRandom) para respetar el
// patrón offline-first del resto del sistema: el id se crea sin roundtrip al
// servidor y viaja tal cual por la cola de sync.
export const potencialCliente = pgTable("potencial_cliente", {
  id: varchar("id", { length: 255 }).primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  rubro: varchar("rubro", { length: 255 }),
  prioridad: varchar("prioridad", { length: 20 }).default("Media").notNull(),
  estado: varchar("estado", { length: 30 }).default("Nuevo").notNull(),
  fechaUltimoContacto: timestamp("fecha_ultimo_contacto"),
  esHistoricoLegacy: boolean("es_historico_legacy").default(false).notNull(),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
});

export const fichaDigital = pgTable("ficha_digital", {
  potencialClienteId: varchar("potencial_cliente_id", { length: 255 })
    .primaryKey()
    .references(() => potencialCliente.id),
  instagram: varchar("instagram", { length: 255 }),
  whatsapp: varchar("whatsapp", { length: 100 }),
  email: varchar("email", { length: 255 }),
  facebook: varchar("facebook", { length: 255 }),
  nombreDueño: varchar("nombre_dueno", { length: 255 }),
  dolorTags: jsonb("dolor_tags"), // string[]
  tieneWeb: varchar("tiene_web", { length: 30 }).default("no").notNull(),
  usaCatalogoNativoWhatsapp: boolean("usa_catalogo_nativo_whatsapp")
    .default(false)
    .notNull(),
  notasExtra: text("notas_extra"),
  referenciaPosteo: text("referencia_posteo"),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
});

export const fichaFisica = pgTable("ficha_fisica", {
  potencialClienteId: varchar("potencial_cliente_id", { length: 255 })
    .primaryKey()
    .references(() => potencialCliente.id),
  direccionCalle: varchar("direccion_calle", { length: 500 }),
  direccionCiudad: varchar("direccion_ciudad", { length: 255 }),
  direccionProvincia: varchar("direccion_provincia", { length: 255 }),
  latitud: doublePrecision("latitud"),
  longitud: doublePrecision("longitud"),
  visitado: boolean("visitado").default(false).notNull(),
  motivoNoVisita: text("motivo_no_visita"),
  volverFecha: timestamp("volver_fecha"),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
});

export const intentoContacto = pgTable("intento_contacto", {
  id: varchar("id", { length: 255 }).primaryKey(),
  potencialClienteId: varchar("potencial_cliente_id", { length: 255 })
    .references(() => potencialCliente.id)
    .notNull(),
  fecha: timestamp("fecha").defaultNow().notNull(),
  canal: varchar("canal", { length: 30 }).notNull(),
  mensajeEnviado: text("mensaje_enviado"),
  resultado: varchar("resultado", { length: 30 }).notNull(),
  respuestaTexto: text("respuesta_texto"),
  tagsResultado: jsonb("tags_resultado"), // string[]
  proximoSeguimientoFecha: timestamp("proximo_seguimiento_fecha"),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
});

export const catalogoEtiquetas = pgTable("catalogo_etiquetas", {
  id: varchar("id", { length: 255 }).primaryKey(),
  etiqueta: varchar("etiqueta", { length: 255 }).notNull(),
  categoria: varchar("categoria", { length: 30 }).notNull(),
  esDelUsuario: boolean("es_del_usuario").default(false).notNull(),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
});

// Planificador de Contenido — rediseño (Fase 5.1). IDs varchar generados en
// cliente, mismo patrón offline-first que contacto en frío. `secciones`,
// `guion`, `metricas` y `tareas_pendientes` son JSONB — estructura flexible
// sin comprometer la normalización (ver NODEXA_MASTER_MANUAL.md, 7.4).
export const cicloSemanal = pgTable("ciclo_semanal", {
  id: varchar("id", { length: 255 }).primaryKey(),
  fechaInicio: timestamp("fecha_inicio").notNull(),
  objetivoVideos: integer("objetivo_videos").default(6).notNull(),
  estado: varchar("estado", { length: 20 }).default("activo").notNull(),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

export const ideaContenido = pgTable("idea_contenido", {
  id: varchar("id", { length: 255 }).primaryKey(),
  texto: text("texto").notNull(),
  dolorSemana: varchar("dolor_semana", { length: 255 }),
  estado: varchar("estado", { length: 20 }).default("Backlog").notNull(),
  cicloId: varchar("ciclo_id", { length: 255 }),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

export const plantillaGuion = pgTable("plantilla_guion", {
  id: varchar("id", { length: 255 }).primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  secciones: jsonb("secciones").notNull(),
  activa: boolean("activa").default(false).notNull(),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

export const contenido = pgTable("contenido", {
  id: varchar("id", { length: 255 }).primaryKey(),
  ideaId: varchar("idea_id", { length: 255 }),
  cicloId: varchar("ciclo_id", { length: 255 }),
  titulo: varchar("titulo", { length: 500 }).notNull(),
  tipoContenido: varchar("tipo_contenido", { length: 20 }).notNull(),
  canales: jsonb("canales"), // string[]
  estado: varchar("estado", { length: 20 }).default("Guion").notNull(),
  guion: jsonb("guion").notNull(),
  plantillaGuionId: varchar("plantilla_guion_id", { length: 255 }),
  diaEstimado: varchar("dia_estimado", { length: 100 }),
  tareasPendientes: jsonb("tareas_pendientes"),
  fechaPublicacion: timestamp("fecha_publicacion"),
  metricas: jsonb("metricas"),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

export const catalogoKpiContenido = pgTable("catalogo_kpi_contenido", {
  id: varchar("id", { length: 255 }).primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  descripcion: text("descripcion"),
  meta: doublePrecision("meta"),
  unidad: varchar("unidad", { length: 50 }),
  esDelUsuario: boolean("es_del_usuario").default(false).notNull(),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

export const visitas = pgTable("visitas", {
  id: uuid("id").primaryKey().defaultRandom(),
  clienteId: uuid("cliente_id")
    .references(() => clientes.id)
    .notNull(),
  direccionId: uuid("direccion_id")
    .references(() => direcciones.id)
    .notNull(),
  descripcion: text("descripcion").notNull(),
  fechaVisita: timestamp("fecha_visita").notNull(),
  ...columnasAuditoria,
});

export const propuestas = pgTable("propuestas", {
  id: uuid("id").primaryKey().defaultRandom(),
  clienteId: uuid("cliente_id")
    .references(() => clientes.id)
    .notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
  url: varchar("url", { length: 500 }),
  estado: varchar("estado", { length: 50 }).default("enviada").notNull(),
  ...columnasAuditoria,
});

// ==========================================
// 7. Inteligencia Artificial
// ==========================================

export const conversacionesIa = pgTable("conversaciones_ia", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  usuarioId: uuid("usuario_id")
    .references(() => usuarios.id)
    .notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  ...columnasAuditoria,
});

export const prompts = pgTable("prompts", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversacionId: uuid("conversacion_id")
    .references(() => conversacionesIa.id)
    .notNull(),
  contenido: text("contenido").notNull(),
  ...columnasAuditoria,
});

export const respuestasIa = pgTable("respuestas_ia", {
  id: uuid("id").primaryKey().defaultRandom(),
  promptId: uuid("prompt_id")
    .references(() => prompts.id)
    .notNull(),
  contenido: text("contenido").notNull(),
  ...columnasAuditoria,
});

export const automatizaciones = pgTable("automatizaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  disparador: varchar("disparador", { length: 100 }).notNull(),
  accion: varchar("accion", { length: 100 }).notNull(),
  activo: boolean("activo").default(true).notNull(),
  ...columnasAuditoria,
});

// ==========================================
// 8. Ingeniería de Desarrollo (Sprints & Kanban)
// ==========================================

export const epicas = pgTable("epicas", {
  id: varchar("id", { length: 255 }).primaryKey(),
  proyectoId: varchar("proyecto_id", { length: 255 })
    .references(() => proyectos.id)
    .notNull(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  descripcion: text("descripcion"),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  eliminado: boolean("eliminado").default(false).notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

export const sprints = pgTable("sprints", {
  id: varchar("id", { length: 255 }).primaryKey(),
  proyectoId: varchar("proyecto_id", { length: 255 })
    .references(() => proyectos.id)
    .notNull(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  duracionSemanas: integer("duracion_semanas").default(2).notNull(),
  fechaInicio: timestamp("fecha_inicio"),
  fechaFin: timestamp("fecha_fin"),
  objetivo: text("objetivo"),
  descripcion: text("descripcion"),
  capacidad: integer("capacidad").default(10).notNull(),
  miembros: jsonb("miembros"), // string[]
  estado: varchar("estado", { length: 50 }).default("planificado").notNull(),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
  finalizadoEn: timestamp("finalizado_en"),
  eliminado: boolean("eliminado").default(false).notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

export const historias = pgTable("historias", {
  id: varchar("id", { length: 255 }).primaryKey(),
  proyectoId: varchar("proyecto_id", { length: 255 })
    .references(() => proyectos.id)
    .notNull(),
  epicaId: varchar("epica_id", { length: 255 }).references(() => epicas.id),
  sprintId: varchar("sprint_id", { length: 255 }).references(() => sprints.id),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descripcion: text("descripcion"),
  prioridad: varchar("prioridad", { length: 50 }).default("Media").notNull(),
  estimacion: integer("estimacion").default(1).notNull(),
  estado: varchar("estado", { length: 50 }).default("backlog").notNull(),
  completada: boolean("completada").default(false).notNull(),
  dependencias: jsonb("dependencias"), // string[]
  etiquetas: jsonb("etiquetas"), // string[]
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
  eliminado: boolean("eliminado").default(false).notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

export const tareas = pgTable("tareas", {
  id: varchar("id", { length: 255 }).primaryKey(),
  proyectoId: varchar("proyecto_id", { length: 255 })
    .references(() => proyectos.id)
    .notNull(),
  historiaId: varchar("historia_id", { length: 255 }).references(
    () => historias.id
  ),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descripcion: text("descripcion"),
  estado: varchar("estado", { length: 50 }).default("todo").notNull(),
  rol: varchar("rol", { length: 100 }),
  componente: varchar("componente", { length: 255 }),
  ruta: varchar("ruta", { length: 255 }),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
  eliminado: boolean("eliminado").default(false).notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

export const taskExecutions = pgTable("task_executions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  // FK aplicada como NOT VALID en la base: hay 9 filas históricas de
  // proyectos ya eliminados de antes de que el borrado pasara a ser lógico
  // (ver PLAN_AUDITORIA_MATECODE.md). Valida hacia adelante, no exige
  // limpiar ese handful de filas viejas.
  proyectoId: varchar("proyecto_id", { length: 255 })
    .references(() => proyectos.id)
    .notNull(),
  templateId: varchar("template_id", { length: 255 }),
  titulo: varchar("titulo", { length: 500 }),
  estado: varchar("estado", { length: 50 }).notNull(),
  usuarioAsignadoId: varchar("usuario_asignado_id", { length: 255 }),
  metadata: text("metadata"), // JSON conteniendo handoffs y logs de ejecución
  fechaInicio: timestamp("fecha_inicio"),
  fechaFin: timestamp("fecha_fin"),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
  eliminado: boolean("eliminado").default(false).notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

export const proyectoContexto = pgTable("proyecto_contexto", {
  proyectoId: varchar("proyecto_id", { length: 255 }).primaryKey(),
  doloresCliente: text("dolores_cliente"),
  reglasNegocio: text("reglas_negocio"),
  publicoObjetivo: text("publico_objetivo"),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
});

export const proyectoDesignSystem = pgTable("proyecto_design_system", {
  proyectoId: varchar("proyecto_id", { length: 255 }).primaryKey(),
  arquetipo: varchar("arquetipo", { length: 255 }),
  metafora: text("metafora"),
  radioBordes: varchar("radio_bordes", { length: 50 }),
  sombras: varchar("sombras", { length: 50 }),
  directrizNegacion: text("directriz_negacion"),
  parejaTipografica: varchar("pareja_tipografica", { length: 255 }),
  escalaEspaciado: varchar("escala_espaciado", { length: 50 }),
  reglaColor: text("regla_color"),
  estiloAnimaciones: varchar("estilo_animaciones", { length: 255 }),
  estadoHover: varchar("estado_hover", { length: 255 }),
  logoUrl: varchar("logo_url", { length: 500 }),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
});

export const proyectoEstadoTecnico = pgTable("proyecto_estado_tecnico", {
  proyectoId: varchar("proyecto_id", { length: 255 }).primaryKey(),
  dependencias: jsonb("dependencias"), // array de deps
  esquemaDb: jsonb("esquema_db"), // objeto de esquema
  activeActivityFocusId: varchar("active_activity_focus_id", { length: 255 }),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
});

export const proyectoConfigAutomatizacion = pgTable(
  "proyecto_config_automatizacion",
  {
    proyectoId: varchar("proyecto_id", { length: 255 }).primaryKey(),
    buildCmd: varchar("build_cmd", { length: 500 })
      .default("npm run build")
      .notNull(),
    lintCmd: varchar("lint_cmd", { length: 500 })
      .default("npm run lint")
      .notNull(),
    testCmd: varchar("test_cmd", { length: 500 })
      .default("npm run test")
      .notNull(),
    // Comandos desagregados por tipo de verificación (Fase 1 — estandarización
    // de "qué" se verifica en cada capa, independiente de la herramienta del proyecto).
    testUnitCmd: varchar("test_unit_cmd", { length: 500 }),
    testIntegrationCmd: varchar("test_integration_cmd", { length: 500 }),
    testE2eCmd: varchar("test_e2e_cmd", { length: 500 }),
    maxRetriesLinter: integer("max_retries_linter").default(3).notNull(),
    // Estándar de economía de tokens: tamaño máximo sugerido por archivo.
    maxLineasPorArchivo: integer("max_lineas_por_archivo")
      .default(300)
      .notNull(),
    // Corralito de seguridad del runner (Claude Code): listas en JSON.
    allowedTools: text("allowed_tools"),
    deniedPaths: text("denied_paths"),
    // Fase 4.2: estandarización de modelos por rol de ticket. Sin valor =
    // se usa el default de la CLI de Claude Code (comportamiento actual, sin
    // cambios) hasta que el usuario decida bajar algún rol puntual.
    modeloPorDefecto: varchar("modelo_por_defecto", { length: 100 }),
    modelosPorRol: text("modelos_por_rol"), // JSON: { "Documentación": "claude-haiku-4-5-20251001" }
    creadoEn: timestamp("creado_en").defaultNow().notNull(),
    actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
  }
);

// Catálogo de errores compartido entre el sistema y el agente de IA: mismo
// "idioma" para clasificar cualquier fallo del runner, en vez de texto libre.
export const catalogoErrores = pgTable("catalogo_errores", {
  codigo: varchar("codigo", { length: 100 }).primaryKey(),
  categoria: varchar("categoria", { length: 100 }).notNull(),
  severidad: varchar("severidad", { length: 20 }).notNull(), // "baja" | "media" | "alta" | "critica"
  esRecuperable: boolean("es_recuperable").default(true).notNull(),
  accionSugerida: text("accion_sugerida"),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
});

export const taskExecutionCheckpoints = pgTable("task_execution_checkpoints", {
  id: varchar("id", { length: 255 }).primaryKey(),
  taskExecutionId: varchar("task_execution_id", { length: 255 }).notNull(),
  actividadId: varchar("actividad_id", { length: 255 }).notNull(),
  proyectoId: varchar("proyecto_id", { length: 255 }).notNull(),
  estadoCheckpoint: varchar("estado_checkpoint", { length: 50 }).notNull(),
  motorIA: varchar("motor_ia", { length: 20 }),
  ultimoErrorLogs: text("ultimo_error_logs"),
  ultimoPromptRefinamiento: text("ultimo_prompt_refinamiento"),
  reintentosFallidos: integer("reintentos_fallidos").default(0).notNull(),
  commitShaBase: varchar("commit_sha_base", { length: 100 }),
  commitShaError: varchar("commit_sha_error", { length: 100 }),
  // Métricas de eficiencia (Fase 1, punto 3 del roadmap): tiempo y tokens reales
  // por intento, para poder medir después si el proceso es eficiente o no.
  tokensInput: integer("tokens_input"),
  tokensOutput: integer("tokens_output"),
  costoUsd: doublePrecision("costo_usd"),
  tiempoInicio: timestamp("tiempo_inicio"),
  tiempoFin: timestamp("tiempo_fin"),
  // Sesión resumible de Claude Code: permite continuar sin reconstruir contexto
  // (ni tokens) tras un corte de créditos/conexión (Fase 0/1, punto 7).
  claudeSessionId: varchar("claude_session_id", { length: 255 }),
  // Catálogo de errores compartido (punto 1) — código, no texto libre.
  codigoError: varchar("codigo_error", { length: 100 }).references(
    () => catalogoErrores.codigo
  ),
  // Acciones fuera del alcance de la IA (punto 9), clasificadas en 2 niveles
  // (punto extra del usuario): moderadas no bloquean, críticas sí.
  accionesManualesModeradas: text("acciones_manuales_moderadas"), // JSON[]
  accionesManualesCriticas: text("acciones_manuales_criticas"), // JSON[]
  // Doble resumen del handoff (punto 2): técnico ya vive en task_executions.metadata,
  // este es el resumen en lenguaje de Product Owner para lectura no técnica.
  resumenNegocio: text("resumen_negocio"),
  // Guía de pruebas manuales estandarizada (punto 6): pasos, datos de prueba,
  // resultado esperado.
  guiaPruebasManual: text("guia_pruebas_manual"), // JSON
  // Fase 4: commit + push + PR automático al terminar el ticket.
  prUrl: varchar("pr_url", { length: 500 }),
  prEstado: varchar("pr_estado", { length: 20 }), // "creado" | "fallido" | null (no se intentó)
  prError: text("pr_error"),
  // Fase 4.1: desvíos del plan, archivo de pruebas, gate de CI post-PR.
  desviosDelPlan: text("desvios_del_plan"), // JSON[]
  archivoPruebaPath: varchar("archivo_prueba_path", { length: 500 }),
  ciEstado: varchar("ci_estado", { length: 20 }), // "paso" | "fallo" | "sin_ci"
  ciDetalle: text("ci_detalle"),
  // Fase 4.2: prompt real enviado a la IA para esta actividad, para poder
  // comparar "lo que se pidió" vs "lo que devolvió" (handoff) en la auditoría
  // de fin de sprint.
  promptEnviado: text("prompt_enviado"),
  // Log acotado de los últimos pasos en vivo del ticket en curso — ver
  // MAX_PASOS_LOG/agregarPasoLog en automatizacion-ia.entity.ts.
  pasosLog: text("pasos_log"), // JSON PasoLog[]
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
});

// ==========================================
// Segundo Cerebro (área Personal) — Bloque A
// ==========================================

export const inboxItem = pgTable("inbox_item", {
  id: varchar("id", { length: 255 }).primaryKey(),
  texto: text("texto").notNull(),
  estado: varchar("estado", { length: 20 }).notNull(), // pendiente | promovido | descartado
  promovidoATipo: varchar("promovido_a_tipo", { length: 30 }),
  promovidoAId: varchar("promovido_a_id", { length: 255 }),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

export const tareaDiaria = pgTable("tarea_diaria", {
  id: varchar("id", { length: 255 }).primaryKey(),
  // "diaTarea" y no "fecha": la ruta de sync trata cualquier campo llamado
  // "fecha" como timestamp automáticamente (dateFields) — acá es un string
  // YYYY-MM-DD plano.
  diaTarea: varchar("dia_tarea", { length: 10 }).notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // enfoque | mantenimiento
  descripcion: text("descripcion").notNull(),
  estado: varchar("estado", { length: 20 }).notNull(), // pendiente | completada | migrada | cancelada
  fechaMigradaDesde: varchar("fecha_migrada_desde", { length: 10 }),
  origenInboxId: varchar("origen_inbox_id", { length: 255 }),
  origenPendienteId: varchar("origen_pendiente_id", { length: 255 }),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

export const tareaPendiente = pgTable("tarea_pendiente", {
  id: varchar("id", { length: 255 }).primaryKey(),
  descripcion: text("descripcion").notNull(),
  prioridad: varchar("prioridad", { length: 20 }).notNull(), // urgente | importante | puede_esperar
  area: varchar("area", { length: 20 }).notNull(), // profesional | personal | ambas
  estado: varchar("estado", { length: 20 }).notNull(), // pendiente | promovida | completada | descartada
  origenInboxId: varchar("origen_inbox_id", { length: 255 }),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

export const habitoDefinicion = pgTable("habito_definicion", {
  id: varchar("id", { length: 255 }).primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  descripcionMin: text("descripcion_min").notNull(),
  descripcionMed: text("descripcion_med").notNull(),
  descripcionMax: text("descripcion_max").notNull(),
  area: varchar("area", { length: 20 }).notNull(), // profesional | personal | ambas
  activo: boolean("activo").default(true).notNull(),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

export const habitoRegistro = pgTable("habito_registro", {
  id: varchar("id", { length: 255 }).primaryKey(), // determinístico: habitoId_diaTarea
  habitoId: varchar("habito_id", { length: 255 }).notNull(),
  // "diaTarea" y no "fecha": ver nota en tarea_diaria — evita que la ruta
  // de sync lo trate como timestamp automáticamente.
  diaTarea: varchar("dia_tarea", { length: 10 }).notNull(),
  nivelEjecutado: varchar("nivel_ejecutado", { length: 10 }).notNull(), // MIN | MED | MAX
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

export const catalogoEjercicio = pgTable("catalogo_ejercicio", {
  id: varchar("id", { length: 255 }).primaryKey(),
  patron: varchar("patron", { length: 50 }).notNull(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  tipoConteo: varchar("tipo_conteo", { length: 20 }).notNull(),
  modoConteo: varchar("modo_conteo", { length: 20 }).notNull(),
  equipamiento: jsonb("equipamiento").notNull(), // string[]
  esPausaActiva: boolean("es_pausa_activa").default(false).notNull(),
  esNeat: boolean("es_neat").default(false).notNull(),
  permiteCarga: boolean("permite_carga").default(false).notNull(),
  niveles: jsonb("niveles").notNull(), // NivelEjercicio[]
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

export const plantillaRutina = pgTable("plantilla_rutina", {
  id: varchar("id", { length: 255 }).primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  formato: varchar("formato", { length: 30 }).notNull(),
  tipoEstructura: varchar("tipo_estructura", { length: 20 }).notNull(),
  estructura: jsonb("estructura").notNull(),
  eliminado: boolean("eliminado").default(false).notNull(),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
});

export const bloqueEntrenamiento = pgTable("bloque_entrenamiento", {
  id: varchar("id", { length: 255 }).primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  // "diaInicio"/"diaFin" y no "fechaInicio"/"fechaFin": ver nota en
  // tarea_diaria — evita que la ruta de sync los trate como timestamp.
  diaInicio: varchar("dia_inicio", { length: 10 }).notNull(),
  diaFin: varchar("dia_fin", { length: 10 }).notNull(),
  ejeProgresionDefault: varchar("eje_progresion_default", {
    length: 20,
  }).notNull(),
  estado: varchar("estado", { length: 20 }).notNull(), // activo | cerrado
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

export const registroActividad = pgTable("registro_actividad", {
  id: varchar("id", { length: 255 }).primaryKey(),
  plantillaId: varchar("plantilla_id", { length: 255 }).notNull(),
  bloqueId: varchar("bloque_id", { length: 255 }),
  diaTarea: varchar("dia_tarea", { length: 10 }).notNull(),
  comoPlanificado: boolean("como_planificado").notNull(),
  resultados: jsonb("resultados").notNull(), // ResultadoEjercicio[]
  notas: text("notas"),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});

export const objetivoCuantificable = pgTable("objetivo_cuantificable", {
  id: varchar("id", { length: 255 }).primaryKey(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  unidad: varchar("unidad", { length: 50 }).notNull(),
  cantidadObjetivo: doublePrecision("cantidad_objetivo").notNull(),
  progresoActual: doublePrecision("progreso_actual").default(0).notNull(),
  // "diaInicio"/"diaLimite" y no "fechaInicio"/"fechaLimite": la ruta de
  // sync trata "fechaInicio" como timestamp automáticamente (dateFields) —
  // acá son strings YYYY-MM-DD planos.
  diaInicio: varchar("dia_inicio", { length: 10 }).notNull(),
  diaLimite: varchar("dia_limite", { length: 10 }).notNull(),
  area: varchar("area", { length: 20 }).notNull(), // profesional | personal | ambas
  estado: varchar("estado", { length: 20 }).notNull(), // activo | cumplido | vencido | archivado
  origenModulo: varchar("origen_modulo", { length: 50 }),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
  eliminadoEn: timestamp("eliminado_en"),
});
