ALTER TABLE "archivos" ALTER COLUMN "proyecto_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "comentarios" ALTER COLUMN "proyecto_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "contratos" ALTER COLUMN "proyecto_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "pagos" ALTER COLUMN "proyecto_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "proyectos" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "proyectos" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "proyectos" ALTER COLUMN "agencia_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "proyectos" ALTER COLUMN "cliente_id" DROP NOT NULL;