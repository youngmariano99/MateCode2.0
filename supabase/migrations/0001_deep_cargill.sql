CREATE TABLE "roles_permisos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rol_id" uuid NOT NULL,
	"permiso_id" uuid NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"eliminado_en" timestamp,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"eliminado_por" uuid
);
--> statement-breakpoint
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_rol_id_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_permiso_id_permisos_id_fk" FOREIGN KEY ("permiso_id") REFERENCES "public"."permisos"("id") ON DELETE no action ON UPDATE no action;