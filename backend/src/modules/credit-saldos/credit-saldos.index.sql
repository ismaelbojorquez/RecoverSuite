CREATE INDEX IF NOT EXISTS idx_credit_saldos_credit_field
  ON credit_saldos (credit_id, saldo_field_id);
