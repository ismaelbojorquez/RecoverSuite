-- Balance field configuration per portfolio.
-- Requires the portfolios table.
CREATE TABLE IF NOT EXISTS campos_saldo (
  id BIGSERIAL PRIMARY KEY,
  portafolio_id BIGINT NOT NULL REFERENCES portfolios(id),
  nombre_campo TEXT NOT NULL,
  etiqueta_visual TEXT NOT NULL,
  tipo_dato TEXT NOT NULL CHECK (tipo_dato IN ('number', 'currency')),
  orden INTEGER NOT NULL DEFAULT 0,
  es_principal BOOLEAN NOT NULL DEFAULT FALSE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campos_saldo_portafolio_id
  ON campos_saldo (portafolio_id);
