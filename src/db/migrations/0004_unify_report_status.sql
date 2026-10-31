UPDATE reportes SET estado = 'EN_CURSO' WHERE estado IN ('ASIGNADO', 'DESPACHADO');--> statement-breakpoint
UPDATE reportes SET estado = 'FALSA_ALARMA' WHERE estado = 'RECHAZADO';
