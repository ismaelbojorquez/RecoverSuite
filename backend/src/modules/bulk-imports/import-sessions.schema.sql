-- Import sessions to support wizarded bulk imports.
-- Captures file metadata, mapping decisions, counters, and job linkage.
CREATE TABLE IF NOT EXISTS import_sessions (
  id BIGSERIAL PRIMARY KEY,
  portfolio_id BIGINT NOT NULL REFERENCES portfolios(id),
  created_by BIGINT REFERENCES users(id),
  filename TEXT,
  file_hash TEXT,
  file_path TEXT,
  file_meta JSONB,
  detected_headers TEXT[],
  mapping JSONB,
  strategy TEXT CHECK (strategy IN ('ONLY_NEW','ONLY_UPDATE','UPSERT')),
  status TEXT NOT NULL CHECK (status IN ('PENDING','MAPPING','VALIDATING','VALIDATED','RUNNING','COMPLETED','FAILED','CANCELED')),
  total_rows INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  valid_rows INTEGER NOT NULL DEFAULT 0 CHECK (valid_rows >= 0),
  invalid_rows INTEGER NOT NULL DEFAULT 0 CHECK (invalid_rows >= 0),
  inserted INTEGER NOT NULL DEFAULT 0 CHECK (inserted >= 0),
  updated INTEGER NOT NULL DEFAULT 0 CHECK (updated >= 0),
  skipped INTEGER NOT NULL DEFAULT 0 CHECK (skipped >= 0),
  error_report_path TEXT,
  error_report JSONB,
  saldo_fields_snapshot JSONB,
  job_id BIGINT REFERENCES jobs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure status constraint stays aligned on existing databases.
ALTER TABLE import_sessions
  DROP CONSTRAINT IF EXISTS import_sessions_status_check;

ALTER TABLE import_sessions
  ADD CONSTRAINT import_sessions_status_check
  CHECK (status IN ('PENDING','MAPPING','VALIDATING','VALIDATED','RUNNING','COMPLETED','FAILED','CANCELED'));

CREATE INDEX IF NOT EXISTS idx_import_sessions_portfolio
  ON import_sessions (portfolio_id);

CREATE INDEX IF NOT EXISTS idx_import_sessions_status
  ON import_sessions (status);

CREATE UNIQUE INDEX IF NOT EXISTS uid_import_sessions_portfolio_file_hash
  ON import_sessions (portfolio_id, file_hash)
  WHERE file_hash IS NOT NULL AND status <> 'CANCELED';
