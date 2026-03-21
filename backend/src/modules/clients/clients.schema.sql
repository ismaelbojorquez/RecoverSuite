-- Clients belonging to a portfolio.
-- Requires the portfolios table.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS clients (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  portafolio_id BIGINT NOT NULL REFERENCES portfolios(id),
  nombre TEXT NOT NULL,
  apellido_paterno TEXT NOT NULL,
  apellido_materno TEXT NOT NULL,
  numero_cliente TEXT NOT NULL DEFAULT concat('CLI-', lpad(nextval('clients_id_seq')::text, 6, '0')),
  rfc TEXT,
  curp TEXT,
  scoring_global NUMERIC(5,2),
  scoring_llamada NUMERIC(5,2),
  scoring_whatsapp NUMERIC(5,2),
  scoring_sms NUMERIC(5,2),
  scoring_email NUMERIC(5,2),
  scoring_visita NUMERIC(5,2),
  scoring_riesgo_nivel TEXT,
  scoring_permitir_contacto BOOLEAN,
  scoring_bloquear_cliente BOOLEAN,
  scoring_recomendar_reintento BOOLEAN,
  scoring_actualizado_at TIMESTAMPTZ,
  strategy_next_best_action TEXT,
  strategy_recommended_channel TEXT,
  strategy_should_stop_contact BOOLEAN,
  strategy_should_escalate_visit BOOLEAN,
  strategy_visit_eligible BOOLEAN,
  strategy_sequence_step INTEGER,
  strategy_reason_codes JSONB,
  strategy_contact_plan JSONB,
  strategy_actualizado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (portafolio_id, nombre, apellido_paterno, apellido_materno),
  UNIQUE (public_id),
  UNIQUE (numero_cliente)
);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS scoring_global NUMERIC(5,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS scoring_llamada NUMERIC(5,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS scoring_whatsapp NUMERIC(5,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS scoring_sms NUMERIC(5,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS scoring_email NUMERIC(5,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS scoring_visita NUMERIC(5,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS scoring_riesgo_nivel TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS scoring_permitir_contacto BOOLEAN;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS scoring_bloquear_cliente BOOLEAN;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS scoring_recomendar_reintento BOOLEAN;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS scoring_actualizado_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS strategy_next_best_action TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS strategy_recommended_channel TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS strategy_should_stop_contact BOOLEAN;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS strategy_should_escalate_visit BOOLEAN;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS strategy_visit_eligible BOOLEAN;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS strategy_sequence_step INTEGER;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS strategy_reason_codes JSONB;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS strategy_contact_plan JSONB;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS strategy_actualizado_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_clients_scoring_scores'
  ) THEN
    ALTER TABLE clients
      ADD CONSTRAINT chk_clients_scoring_scores
      CHECK (
        (scoring_global IS NULL OR (scoring_global >= 0 AND scoring_global <= 100))
        AND (scoring_llamada IS NULL OR (scoring_llamada >= 0 AND scoring_llamada <= 100))
        AND (scoring_whatsapp IS NULL OR (scoring_whatsapp >= 0 AND scoring_whatsapp <= 100))
        AND (scoring_sms IS NULL OR (scoring_sms >= 0 AND scoring_sms <= 100))
        AND (scoring_email IS NULL OR (scoring_email >= 0 AND scoring_email <= 100))
        AND (scoring_visita IS NULL OR (scoring_visita >= 0 AND scoring_visita <= 100))
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_clients_scoring_riesgo_nivel'
  ) THEN
    ALTER TABLE clients
      ADD CONSTRAINT chk_clients_scoring_riesgo_nivel
      CHECK (
        scoring_riesgo_nivel IS NULL
        OR scoring_riesgo_nivel IN ('BAJO', 'MEDIO', 'ALTO')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_clients_strategy_recommended_channel'
  ) THEN
    ALTER TABLE clients
      ADD CONSTRAINT chk_clients_strategy_recommended_channel
      CHECK (
        strategy_recommended_channel IS NULL
        OR strategy_recommended_channel IN ('LLAMADA', 'WHATSAPP', 'SMS', 'EMAIL', 'VISITA')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_portafolio_id ON clients (portafolio_id);
CREATE INDEX IF NOT EXISTS idx_clients_public_id ON clients (public_id);
CREATE INDEX IF NOT EXISTS idx_clients_numero_cliente ON clients (numero_cliente);
CREATE INDEX IF NOT EXISTS idx_clients_full_name
  ON clients (nombre, apellido_paterno, apellido_materno);
CREATE INDEX IF NOT EXISTS idx_clients_portafolio_full_name_search
  ON clients (portafolio_id, lower(nombre || ' ' || apellido_paterno || ' ' || apellido_materno) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_clients_portafolio_rfc_search
  ON clients (portafolio_id, lower(rfc) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_clients_portafolio_curp_search
  ON clients (portafolio_id, lower(curp) text_pattern_ops);
