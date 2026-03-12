-- Credits belong to a client and a portfolio.
-- Requires the clients and portfolios tables.
CREATE TABLE IF NOT EXISTS credits (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES clients(id),
  portafolio_id BIGINT NOT NULL REFERENCES portfolios(id),
  numero_credito TEXT NOT NULL,
  numero_credito_externo TEXT NOT NULL DEFAULT concat('CRD-', lpad(nextval('credits_id_seq')::text, 6, '0')),
  producto TEXT NOT NULL,
  estado TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (numero_credito, portafolio_id),
  UNIQUE (numero_credito_externo)
);

CREATE INDEX IF NOT EXISTS idx_credits_numero_credito ON credits (numero_credito);
CREATE INDEX IF NOT EXISTS idx_credits_numero_credito_externo ON credits (numero_credito_externo);
CREATE INDEX IF NOT EXISTS idx_credits_cliente_portafolio
  ON credits (cliente_id, portafolio_id);
CREATE INDEX IF NOT EXISTS idx_credits_portafolio_numero_search
  ON credits (portafolio_id, lower(numero_credito) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_credits_portafolio_numero_externo_search
  ON credits (portafolio_id, lower(numero_credito_externo) text_pattern_ops);
