-- Recomendado para importaciones masivas
CREATE INDEX IF NOT EXISTS idx_credits_portafolio_numero_lower
  ON credits (portafolio_id, lower(numero_credito));
