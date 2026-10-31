ALTER TABLE "reportes" ADD COLUMN "incidente_principal_id" integer;--> statement-breakpoint
CREATE INDEX "reportes_incidente_principal_idx" ON "reportes" USING btree ("incidente_principal_id");