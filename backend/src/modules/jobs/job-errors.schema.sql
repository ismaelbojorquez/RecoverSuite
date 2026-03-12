-- Row-level errors for background jobs.
CREATE TABLE IF NOT EXISTS job_errors (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  fila INTEGER NOT NULL,
  campo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_errors_job_id ON job_errors (job_id);
CREATE INDEX IF NOT EXISTS idx_job_errors_job_fila ON job_errors (job_id, fila);
