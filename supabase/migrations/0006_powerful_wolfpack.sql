CREATE TABLE "catalogo_errores" (
	"codigo" varchar(100) PRIMARY KEY NOT NULL,
	"categoria" varchar(100) NOT NULL,
	"severidad" varchar(20) NOT NULL,
	"es_recuperable" boolean DEFAULT true NOT NULL,
	"accion_sugerida" text,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proyecto_config_automatizacion" ADD COLUMN "test_unit_cmd" varchar(500);--> statement-breakpoint
ALTER TABLE "proyecto_config_automatizacion" ADD COLUMN "test_integration_cmd" varchar(500);--> statement-breakpoint
ALTER TABLE "proyecto_config_automatizacion" ADD COLUMN "test_e2e_cmd" varchar(500);--> statement-breakpoint
ALTER TABLE "proyecto_config_automatizacion" ADD COLUMN "max_lineas_por_archivo" integer DEFAULT 300 NOT NULL;--> statement-breakpoint
ALTER TABLE "proyecto_config_automatizacion" ADD COLUMN "allowed_tools" text;--> statement-breakpoint
ALTER TABLE "proyecto_config_automatizacion" ADD COLUMN "denied_paths" text;--> statement-breakpoint
ALTER TABLE "task_execution_checkpoints" ADD COLUMN "tokens_input" integer;--> statement-breakpoint
ALTER TABLE "task_execution_checkpoints" ADD COLUMN "tokens_output" integer;--> statement-breakpoint
ALTER TABLE "task_execution_checkpoints" ADD COLUMN "costo_usd" double precision;--> statement-breakpoint
ALTER TABLE "task_execution_checkpoints" ADD COLUMN "tiempo_inicio" timestamp;--> statement-breakpoint
ALTER TABLE "task_execution_checkpoints" ADD COLUMN "tiempo_fin" timestamp;--> statement-breakpoint
ALTER TABLE "task_execution_checkpoints" ADD COLUMN "claude_session_id" varchar(255);--> statement-breakpoint
ALTER TABLE "task_execution_checkpoints" ADD COLUMN "codigo_error" varchar(100);--> statement-breakpoint
ALTER TABLE "task_execution_checkpoints" ADD COLUMN "acciones_manuales_moderadas" text;--> statement-breakpoint
ALTER TABLE "task_execution_checkpoints" ADD COLUMN "acciones_manuales_criticas" text;--> statement-breakpoint
ALTER TABLE "task_execution_checkpoints" ADD COLUMN "resumen_negocio" text;--> statement-breakpoint
ALTER TABLE "task_execution_checkpoints" ADD COLUMN "guia_pruebas_manual" text;--> statement-breakpoint
ALTER TABLE "task_execution_checkpoints" ADD CONSTRAINT "task_execution_checkpoints_codigo_error_catalogo_errores_codigo_fk" FOREIGN KEY ("codigo_error") REFERENCES "public"."catalogo_errores"("codigo") ON DELETE no action ON UPDATE no action;