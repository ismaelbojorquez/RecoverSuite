-- Audit log for write actions.
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  usuario_id TEXT,
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id BIGINT,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip TEXT,
  usuario_grupos TEXT[],
  permisos TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_fecha ON audit_logs (fecha);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entidad ON audit_logs (entidad);

-- Audit log for bulk imports (ISO 27001 / 9001 evidence).
CREATE TABLE IF NOT EXISTS audit_bulk_imports (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT UNIQUE REFERENCES jobs(id) ON DELETE SET NULL,
  usuario_id BIGINT REFERENCES users(id),
  tipo_carga TEXT NOT NULL,
  archivo TEXT,
  resultado TEXT NOT NULL CHECK (resultado IN ('exitoso', 'parcial', 'error')),
  volumen_procesado INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_audit_bulk_imports_fecha ON audit_bulk_imports (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_bulk_imports_usuario ON audit_bulk_imports (usuario_id);
