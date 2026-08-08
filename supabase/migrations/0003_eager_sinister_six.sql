CREATE TABLE "proyecto_config_automatizacion" (
	"proyecto_id" varchar(255) PRIMARY KEY NOT NULL,
	"build_cmd" varchar(500) DEFAULT 'npm run build' NOT NULL,
	"lint_cmd" varchar(500) DEFAULT 'npm run lint' NOT NULL,
	"test_cmd" varchar(500) DEFAULT 'npm run test' NOT NULL,
	"max_retries_linter" integer DEFAULT 3 NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_execution_checkpoints" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"task_execution_id" varchar(255) NOT NULL,
	"actividad_id" varchar(255) NOT NULL,
	"proyecto_id" varchar(255) NOT NULL,
	"estado_checkpoint" varchar(50) NOT NULL,
	"ultimo_error_logs" text,
	"ultimo_prompt_refinamiento" text,
	"reintentos_fallidos" integer DEFAULT 0 NOT NULL,
	"commit_sha_base" varchar(100),
	"commit_sha_error" varchar(100),
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
