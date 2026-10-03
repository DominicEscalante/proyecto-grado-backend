CREATE TABLE "permisos" (
	"permiso_id" serial PRIMARY KEY NOT NULL,
	"codigo" varchar(50) NOT NULL,
	"descripcion" varchar(200) NOT NULL,
	CONSTRAINT "permisos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "permisos_roles" (
	"permisos_rol_id" serial PRIMARY KEY NOT NULL,
	"permiso_id" integer NOT NULL,
	"rol_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"rol_id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(50) NOT NULL,
	"descripcion" varchar(500) NOT NULL,
	CONSTRAINT "roles_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" serial NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ci" varchar(15) NOT NULL,
	"complemento" varchar(5),
	"nombres" varchar(100) NOT NULL,
	"apellidos" varchar(100) NOT NULL,
	"telefono" varchar(15) NOT NULL,
	"institucion" varchar(20),
	"rango" varchar(50),
	"identidad_verificada" boolean DEFAULT false NOT NULL,
	"estado_cuenta" boolean DEFAULT true NOT NULL,
	"rol_id" integer NOT NULL,
	CONSTRAINT "usuarios_usuario_id_unique" UNIQUE("usuario_id"),
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"password" text,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passkey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"publicKey" text NOT NULL,
	"userId" text NOT NULL,
	"credentialID" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"deviceType" text DEFAULT 'singleDevice' NOT NULL,
	"backedUp" boolean DEFAULT false NOT NULL,
	"transports" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"userId" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tipos_emergencias" (
	"tipo_emergencia_id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "tipos_emergencias_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "adjuntos_multimedia" (
	"adjunto_id" serial PRIMARY KEY NOT NULL,
	"tipo_archivo" varchar(50) NOT NULL,
	"url_archivo" text NOT NULL,
	"fecha_carga" timestamp DEFAULT now() NOT NULL,
	"reporte_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reportes" (
	"reporte_id" serial PRIMARY KEY NOT NULL,
	"codigo_ticket" varchar(20) NOT NULL,
	"descripcion" text NOT NULL,
	"latitud" numeric(10, 7) NOT NULL,
	"longitud" numeric(10, 7) NOT NULL,
	"altitud" numeric(7, 2) DEFAULT '0' NOT NULL,
	"geom" geometry(point) NOT NULL,
	"referencia_direccion" text NOT NULL,
	"estado" varchar(25) DEFAULT 'PENDIENTE' NOT NULL,
	"fecha_generacion_local" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"tipo_emergencia_id" integer NOT NULL,
	"resultado_atencion" varchar(20),
	"motivo_no_atencion" text,
	"fecha_atencion" timestamp,
	"ciudadano_id" text NOT NULL,
	"operador_id" text,
	CONSTRAINT "reportes_codigo_ticket_unique" UNIQUE("codigo_ticket")
);
--> statement-breakpoint
CREATE TABLE "registros_auditoria" (
	"registro_audit_id" serial PRIMARY KEY NOT NULL,
	"accion" varchar(100) NOT NULL,
	"modulo" varchar(50) NOT NULL,
	"ip_origen" varchar(45) NOT NULL,
	"detalles" jsonb NOT NULL,
	"fecha_hora" timestamp DEFAULT now() NOT NULL,
	"usuario_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "permisos_roles" ADD CONSTRAINT "permisos_roles_permiso_id_permisos_permiso_id_fk" FOREIGN KEY ("permiso_id") REFERENCES "public"."permisos"("permiso_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permisos_roles" ADD CONSTRAINT "permisos_roles_rol_id_roles_rol_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("rol_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_roles_rol_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("rol_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_usuarios_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_userId_usuarios_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_usuarios_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjuntos_multimedia" ADD CONSTRAINT "adjuntos_multimedia_reporte_id_reportes_reporte_id_fk" FOREIGN KEY ("reporte_id") REFERENCES "public"."reportes"("reporte_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_tipo_emergencia_id_tipos_emergencias_tipo_emergencia_id_fk" FOREIGN KEY ("tipo_emergencia_id") REFERENCES "public"."tipos_emergencias"("tipo_emergencia_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_ciudadano_id_usuarios_id_fk" FOREIGN KEY ("ciudadano_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_operador_id_usuarios_id_fk" FOREIGN KEY ("operador_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_auditoria" ADD CONSTRAINT "registros_auditoria_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usuarios_ci_idx" ON "usuarios" USING btree ("ci");--> statement-breakpoint
CREATE INDEX "usuarios_rol_idx" ON "usuarios" USING btree ("rol_id");--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "passkey_user_idx" ON "passkey" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "passkey_credential_idx" ON "passkey" USING btree ("credentialID");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "adjuntos_reporte_idx" ON "adjuntos_multimedia" USING btree ("reporte_id");--> statement-breakpoint
CREATE INDEX "reportes_geom_gist" ON "reportes" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "reportes_estado_fecha_idx" ON "reportes" USING btree ("estado","fecha_generacion_local");--> statement-breakpoint
CREATE INDEX "reportes_ciudadano_idx" ON "reportes" USING btree ("ciudadano_id");--> statement-breakpoint
CREATE INDEX "reportes_operador_idx" ON "reportes" USING btree ("operador_id");--> statement-breakpoint
CREATE INDEX "reportes_tipo_emergencia_idx" ON "reportes" USING btree ("tipo_emergencia_id");--> statement-breakpoint
CREATE INDEX "audit_fecha_idx" ON "registros_auditoria" USING btree ("fecha_hora");--> statement-breakpoint
CREATE INDEX "audit_usuario_idx" ON "registros_auditoria" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "audit_modulo_idx" ON "registros_auditoria" USING btree ("modulo");