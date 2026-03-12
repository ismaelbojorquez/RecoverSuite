-- Portfolios belong to a client (prestador de credito).
-- Requires a clients table with primary key `id`.
CREATE TABLE IF NOT EXISTS portfolios (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolios_name ON portfolios (name);
CREATE INDEX IF NOT EXISTS idx_portfolios_is_active ON portfolios (is_active);
