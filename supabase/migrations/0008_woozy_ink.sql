ALTER TABLE "task_execution_checkpoints" ADD COLUMN "desvios_del_plan" text;--> statement-breakpoint
ALTER TABLE "task_execution_checkpoints" ADD COLUMN "archivo_prueba_path" varchar(500);--> statement-breakpoint
ALTER TABLE "task_execution_checkpoints" ADD COLUMN "ci_estado" varchar(20);--> statement-breakpoint
ALTER TABLE "task_execution_checkpoints" ADD COLUMN "ci_detalle" text;