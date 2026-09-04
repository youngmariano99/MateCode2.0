ALTER TABLE "task_execution_checkpoints" ADD COLUMN "pr_url" varchar(500);--> statement-breakpoint
ALTER TABLE "task_execution_checkpoints" ADD COLUMN "pr_estado" varchar(20);--> statement-breakpoint
ALTER TABLE "task_execution_checkpoints" ADD COLUMN "pr_error" text;