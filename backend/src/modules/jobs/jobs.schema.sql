-- Jobs table for background processing.
-- Audit logs should use entidad = 'jobs' and entidad_id = jobs.id.
CREATE TABLE IF NOT EXISTS jobs (
  id BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('pendiente', 'procesando', 'terminado', 'error')),
  progreso INTEGER NOT NULL DEFAULT 0 CHECK (progreso >= 0 AND progreso <= 100),
  usuario_id BIGINT REFERENCES users(id),
  portafolio_id BIGINT REFERENCES portfolios(id),
  payload_resumen TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_estado ON jobs (estado);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs (created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_portafolio_id ON jobs (portafolio_id);
