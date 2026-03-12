-- Balance values per credit and balance field.
-- Requires credits and campos_saldo tables.
CREATE TABLE IF NOT EXISTS saldos (
  id BIGSERIAL PRIMARY KEY,
  credito_id BIGINT NOT NULL REFERENCES credits(id),
  campo_saldo_id BIGINT NOT NULL REFERENCES campos_saldo(id),
  valor NUMERIC(18,4) NOT NULL,
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (credito_id, campo_saldo_id)
);

CREATE INDEX IF NOT EXISTS idx_saldos_credito_id ON saldos (credito_id);
CREATE INDEX IF NOT EXISTS idx_saldos_campo_saldo_id ON saldos (campo_saldo_id);
