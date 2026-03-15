-- Campos de saldo configurables por portafolio (nueva estructura flexible).
-- Requiere tabla portfolios.
CREATE TABLE IF NOT EXISTS saldo_fields (
  id BIGSERIAL PRIMARY KEY,
  portfolio_id BIGINT NOT NULL REFERENCES portfolios(id),
  key TEXT NOT NULL CHECK (key !~ '\s'),
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text','number','currency','date','time','datetime','boolean')),
  value_type TEXT NOT NULL CHECK (value_type IN ('dynamic','calculated')),
  required BOOLEAN NOT NULL DEFAULT FALSE,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  calc_expression TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (portfolio_id, key),
  CHECK (value_type <> 'calculated' OR calc_expression IS NOT NULL)
);

ALTER TABLE saldo_fields DROP COLUMN IF EXISTS format_config;

CREATE INDEX IF NOT EXISTS idx_saldo_fields_portfolio_id
  ON saldo_fields (portfolio_id);

ALTER TABLE portfolios
  ADD COLUMN IF NOT EXISTS debt_total_saldo_field_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_portfolios_debt_total_saldo_field'
  ) THEN
    ALTER TABLE portfolios
      ADD CONSTRAINT fk_portfolios_debt_total_saldo_field
      FOREIGN KEY (debt_total_saldo_field_id)
      REFERENCES saldo_fields(id)
      ON DELETE SET NULL;
  END IF;
END $$;
