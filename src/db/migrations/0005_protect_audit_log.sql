CREATE FUNCTION prevent_audit_log_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La bitácora de auditoría solo admite inserciones';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER prevent_audit_log_mutation
BEFORE UPDATE OR DELETE OR TRUNCATE ON registros_auditoria
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_log_mutation();
