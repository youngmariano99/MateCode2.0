CREATE TABLE "actividad" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"descripcion" text NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "agencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre_comercial" varchar(255) NOT NULL,
	"tipo_agencia" varchar(100) NOT NULL,
	"nombre_legal" varchar(255),
	"descripcion" text,
	"sitio_web" varchar(255),
	"email_principal" varchar(255),
	"telefono" varchar(100),
	"estado" varchar(50) DEFAULT 'activo' NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "archivos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proyecto_id" uuid NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"url" varchar(500) NOT NULL,
	"tipo" varchar(100) NOT NULL,
	"peso" integer NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "automatizaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"disparador" varchar(100) NOT NULL,
	"accion" varchar(100) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "branding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"logo_url" varchar(500),
	"color_principal" varchar(20),
	"color_secundario" varchar(20),
	"firma_responsable" text,
	"pie_correo" text,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "cliente_etiquetas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"etiqueta_id" uuid NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"nombre_comercial" varchar(255) NOT NULL,
	"razon_social" varchar(255),
	"cuit" varchar(50),
	"sitio_web" varchar(255),
	"estado" varchar(50) DEFAULT 'lead' NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "comentarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proyecto_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"contenido" text NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "configuracion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"idioma" varchar(10) DEFAULT 'es' NOT NULL,
	"zona_horaria" varchar(100) DEFAULT 'UTC' NOT NULL,
	"formato_fecha" varchar(50) DEFAULT 'YYYY-MM-DD' NOT NULL,
	"formato_moneda" varchar(50) DEFAULT 'ARS' NOT NULL,
	"moneda" varchar(10) DEFAULT 'ARS' NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "contactos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"cargo" varchar(100),
	"observaciones" text,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "contactos_frio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"nombre_empresa" varchar(255) NOT NULL,
	"contacto_nombre" varchar(255),
	"telefono" varchar(100),
	"email" varchar(255),
	"estado" varchar(50) DEFAULT 'frio' NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "contratos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"proyecto_id" uuid,
	"titulo" varchar(255) NOT NULL,
	"contenido" text NOT NULL,
	"estado" varchar(50) DEFAULT 'borrador' NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "conversaciones_ia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "correos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contacto_id" uuid NOT NULL,
	"direccion" varchar(255) NOT NULL,
	"tipo" varchar(50) DEFAULT 'trabajo' NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "cuotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pago_id" uuid NOT NULL,
	"numero_cuota" integer NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"fecha_vencimiento" timestamp NOT NULL,
	"estado" varchar(50) DEFAULT 'pendiente' NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "direcciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"calle" varchar(255) NOT NULL,
	"numero" varchar(50),
	"ciudad" varchar(100) NOT NULL,
	"provincia" varchar(100) NOT NULL,
	"pais" varchar(100) NOT NULL,
	"codigo_postal" varchar(50),
	"latitud" double precision,
	"longitud" double precision,
	"tipo" varchar(50) DEFAULT 'fiscal' NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "estados_cliente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"color" varchar(20) NOT NULL,
	"orden" integer NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "etiquetas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"color" varchar(20) NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "facturas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pago_id" uuid NOT NULL,
	"numero_factura" varchar(100) NOT NULL,
	"url" varchar(500) NOT NULL,
	"estado" varchar(50) DEFAULT 'emitida' NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "firmas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contrato_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"fecha_firma" timestamp DEFAULT now() NOT NULL,
	"ip_direccion" varchar(100),
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "formas_pago" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "historial" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"entidad_tipo" varchar(100) NOT NULL,
	"entidad_id" uuid NOT NULL,
	"accion" varchar(100) NOT NULL,
	"descripcion" text,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "llamadas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"descripcion" text NOT NULL,
	"duracion_segundos" integer NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"nivel" varchar(50) NOT NULL,
	"mensaje" text NOT NULL,
	"error_stack" text,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "notificaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"mensaje" text NOT NULL,
	"leido" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "pagos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"proyecto_id" uuid,
	"monto" numeric(12, 2) NOT NULL,
	"moneda" varchar(10) DEFAULT 'ARS' NOT NULL,
	"estado" varchar(50) DEFAULT 'pendiente' NOT NULL,
	"fecha_vencimiento" timestamp NOT NULL,
	"fecha_pago" timestamp,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "permisos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "plantillas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"contenido" text NOT NULL,
	"variables" text,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversacion_id" uuid NOT NULL,
	"contenido" text NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "propuestas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"url" varchar(500),
	"estado" varchar(50) DEFAULT 'enviada' NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "proyectos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"descripcion" text,
	"tipo" varchar(100) NOT NULL,
	"estado" varchar(50) DEFAULT 'pendiente' NOT NULL,
	"fecha_inicio" timestamp,
	"fecha_entrega" timestamp,
	"responsable_id" uuid,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "redes_sociales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contacto_id" uuid NOT NULL,
	"plataforma" varchar(100) NOT NULL,
	"url" varchar(500) NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "respuestas_ia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_id" uuid NOT NULL,
	"contenido" text NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "rubros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "seguimientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid,
	"contacto_frio_id" uuid,
	"descripcion" text NOT NULL,
	"fecha_seguimiento" timestamp NOT NULL,
	"estado" varchar(50) DEFAULT 'pendiente' NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "sesiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expiracion" timestamp NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "telefonos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contacto_id" uuid NOT NULL,
	"numero" varchar(100) NOT NULL,
	"tipo" varchar(50) DEFAULT 'movil' NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "tipos_software" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agencia_id" uuid NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"correo" varchar(255) NOT NULL,
	"rol_id" uuid NOT NULL,
	"estado" varchar(50) DEFAULT 'activo' NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "visitas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"direccion_id" uuid NOT NULL,
	"descripcion" text NOT NULL,
	"fecha_visita" timestamp NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
ALTER TABLE "actividad" ADD CONSTRAINT "actividad_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad" ADD CONSTRAINT "actividad_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automatizaciones" ADD CONSTRAINT "automatizaciones_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branding" ADD CONSTRAINT "branding_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente_etiquetas" ADD CONSTRAINT "cliente_etiquetas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente_etiquetas" ADD CONSTRAINT "cliente_etiquetas_etiqueta_id_etiquetas_id_fk" FOREIGN KEY ("etiqueta_id") REFERENCES "public"."etiquetas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuracion" ADD CONSTRAINT "configuracion_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contactos" ADD CONSTRAINT "contactos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contactos_frio" ADD CONSTRAINT "contactos_frio_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversaciones_ia" ADD CONSTRAINT "conversaciones_ia_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversaciones_ia" ADD CONSTRAINT "conversaciones_ia_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correos" ADD CONSTRAINT "correos_contacto_id_contactos_id_fk" FOREIGN KEY ("contacto_id") REFERENCES "public"."contactos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_pago_id_pagos_id_fk" FOREIGN KEY ("pago_id") REFERENCES "public"."pagos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direcciones" ADD CONSTRAINT "direcciones_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estados_cliente" ADD CONSTRAINT "estados_cliente_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etiquetas" ADD CONSTRAINT "etiquetas_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_pago_id_pagos_id_fk" FOREIGN KEY ("pago_id") REFERENCES "public"."pagos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firmas" ADD CONSTRAINT "firmas_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firmas" ADD CONSTRAINT "firmas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial" ADD CONSTRAINT "historial_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llamadas" ADD CONSTRAINT "llamadas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permisos" ADD CONSTRAINT "permisos_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantillas" ADD CONSTRAINT "plantillas_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_conversacion_id_conversaciones_ia_id_fk" FOREIGN KEY ("conversacion_id") REFERENCES "public"."conversaciones_ia"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propuestas" ADD CONSTRAINT "propuestas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_responsable_id_usuarios_id_fk" FOREIGN KEY ("responsable_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redes_sociales" ADD CONSTRAINT "redes_sociales_contacto_id_contactos_id_fk" FOREIGN KEY ("contacto_id") REFERENCES "public"."contactos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respuestas_ia" ADD CONSTRAINT "respuestas_ia_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seguimientos" ADD CONSTRAINT "seguimientos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seguimientos" ADD CONSTRAINT "seguimientos_contacto_frio_id_contactos_frio_id_fk" FOREIGN KEY ("contacto_frio_id") REFERENCES "public"."contactos_frio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telefonos" ADD CONSTRAINT "telefonos_contacto_id_contactos_id_fk" FOREIGN KEY ("contacto_id") REFERENCES "public"."contactos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_agencia_id_agencias_id_fk" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_direccion_id_direcciones_id_fk" FOREIGN KEY ("direccion_id") REFERENCES "public"."direcciones"("id") ON DELETE no action ON UPDATE no action;