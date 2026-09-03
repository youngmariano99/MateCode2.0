ALTER TABLE "epicas" ADD COLUMN "eliminado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "epicas" ADD COLUMN "eliminado_en" timestamp;--> statement-breakpoint
ALTER TABLE "historias" ADD COLUMN "completada" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "historias" ADD COLUMN "actualizado_en" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "historias" ADD COLUMN "eliminado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "historias" ADD COLUMN "eliminado_en" timestamp;--> statement-breakpoint
ALTER TABLE "sprints" ADD COLUMN "actualizado_en" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sprints" ADD COLUMN "eliminado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sprints" ADD COLUMN "eliminado_en" timestamp;--> statement-breakpoint
ALTER TABLE "tareas" ADD COLUMN "eliminado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tareas" ADD COLUMN "eliminado_en" timestamp;--> statement-breakpoint
ALTER TABLE "task_executions" ADD COLUMN "titulo" varchar(500);--> statement-breakpoint
ALTER TABLE "task_executions" ADD COLUMN "fecha_inicio" timestamp;--> statement-breakpoint
ALTER TABLE "task_executions" ADD COLUMN "fecha_fin" timestamp;--> statement-breakpoint
ALTER TABLE "task_executions" ADD COLUMN "eliminado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "task_executions" ADD COLUMN "eliminado_en" timestamp;