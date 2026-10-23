ALTER TABLE "tipos_emergencias" ADD COLUMN "institucion" varchar(20) DEFAULT 'POLICIA' NOT NULL;--> statement-breakpoint
ALTER TABLE "reportes" ADD COLUMN "institucion_destino" varchar(20) DEFAULT 'POLICIA' NOT NULL;--> statement-breakpoint
ALTER TABLE "reportes" ADD COLUMN "fuera_jurisdiccion" boolean DEFAULT false NOT NULL;