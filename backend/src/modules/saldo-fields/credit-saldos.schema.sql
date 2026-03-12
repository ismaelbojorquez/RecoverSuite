-- Valores de saldo por crédito usando los campos configurables de saldo_fields.
-- Requiere tablas credits y saldo_fields.
CREATE TABLE IF NOT EXISTS credit_saldos (
  id BIGSERIAL PRIMARY KEY,
  credit_id BIGINT NOT NULL REFERENCES credits(id),
  saldo_field_id BIGINT NOT NULL REFERENCES saldo_fields(id),
  value_text TEXT,
  value_number NUMERIC(18,4),
  value_date DATE,
  value_time TIME,
  value_datetime TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (credit_id, saldo_field_id)
);

CREATE INDEX IF NOT EXISTS idx_credit_saldos_credit_id
  ON credit_saldos (credit_id);

CREATE INDEX IF NOT EXISTS idx_credit_saldos_field_id
  ON credit_saldos (saldo_field_id);
