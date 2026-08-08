CREATE TABLE "epicas" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"proyecto_id" varchar(255) NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"descripcion" text,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historias" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"proyecto_id" varchar(255) NOT NULL,
	"epica_id" varchar(255),
	"sprint_id" varchar(255),
	"titulo" varchar(255) NOT NULL,
	"descripcion" text,
	"prioridad" varchar(50) DEFAULT 'Media' NOT NULL,
	"estimacion" integer DEFAULT 1 NOT NULL,
	"estado" varchar(50) DEFAULT 'backlog' NOT NULL,
	"dependencias" text,
	"etiquetas" text,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proyecto_contexto" (
	"proyecto_id" varchar(255) PRIMARY KEY NOT NULL,
	"dolores_cliente" text,
	"reglas_negocio" text,
	"publico_objetivo" text,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proyecto_design_system" (
	"proyecto_id" varchar(255) PRIMARY KEY NOT NULL,
	"arquetipo" varchar(255),
	"metafora" text,
	"radio_bordes" varchar(50),
	"sombras" varchar(50),
	"directriz_negacion" text,
	"pareja_tipografica" varchar(255),
	"escala_espaciado" varchar(50),
	"regla_color" text,
	"estilo_animaciones" varchar(255),
	"estado_hover" varchar(255),
	"logo_url" varchar(500),
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proyecto_estado_tecnico" (
	"proyecto_id" varchar(255) PRIMARY KEY NOT NULL,
	"dependencias" text,
	"esquema_db" text,
	"active_activity_focus_id" varchar(255),
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sprints" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"proyecto_id" varchar(255) NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"duracion_semanas" integer DEFAULT 2 NOT NULL,
	"fecha_inicio" timestamp,
	"fecha_fin" timestamp,
	"objetivo" text,
	"descripcion" text,
	"capacidad" integer DEFAULT 10 NOT NULL,
	"miembros" text,
	"estado" varchar(50) DEFAULT 'planificado' NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"finalizado_en" timestamp
);
--> statement-breakpoint
CREATE TABLE "tareas" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"proyecto_id" varchar(255) NOT NULL,
	"historia_id" varchar(255),
	"titulo" varchar(255) NOT NULL,
	"descripcion" text,
	"estado" varchar(50) DEFAULT 'todo' NOT NULL,
	"rol" varchar(100),
	"componente" varchar(255),
	"ruta" varchar(255),
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_executions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"proyecto_id" varchar(255) NOT NULL,
	"template_id" varchar(255),
	"estado" varchar(50) NOT NULL,
	"usuario_asignado_id" varchar(255),
	"metadata" text,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
