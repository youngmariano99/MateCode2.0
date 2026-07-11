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
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  clienteId: uuid("cliente_id")
    .references(() => clientes.id)
    .notNull(),
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
  proyectoId: uuid("proyecto_id")
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
  proyectoId: uuid("proyecto_id")
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
  proyectoId: uuid("proyecto_id").references(() => proyectos.id),
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
  proyectoId: uuid("proyecto_id").references(() => proyectos.id),
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

// ==========================================
// 6. Comercial y Prospección
// ==========================================

export const contactosFrio = pgTable("contactos_frio", {
  id: uuid("id").primaryKey().defaultRandom(),
  agenciaId: uuid("agencia_id")
    .references(() => agencias.id)
    .notNull(),
  nombreEmpresa: varchar("nombre_empresa", { length: 255 }).notNull(),
  contactoNombre: varchar("contacto_nombre", { length: 255 }),
  telefono: varchar("telefono", { length: 100 }),
  email: varchar("email", { length: 255 }),
  estado: varchar("estado", { length: 50 }).default("frio").notNull(),
  ...columnasAuditoria,
});

export const seguimientos = pgTable("seguimientos", {
  id: uuid("id").primaryKey().defaultRandom(),
  clienteId: uuid("cliente_id").references(() => clientes.id),
  contactoFrioId: uuid("contacto_frio_id").references(() => contactosFrio.id),
  descripcion: text("descripcion").notNull(),
  fechaSeguimiento: timestamp("fecha_seguimiento").notNull(),
  estado: varchar("estado", { length: 50 }).default("pendiente").notNull(),
  ...columnasAuditoria,
});

export const llamadas = pgTable("llamadas", {
  id: uuid("id").primaryKey().defaultRandom(),
  clienteId: uuid("cliente_id")
    .references(() => clientes.id)
    .notNull(),
  descripcion: text("descripcion").notNull(),
  duracionSegundos: integer("duracion_segundos").notNull(),
  ...columnasAuditoria,
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
