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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (portafolio_id, nombre, apellido_paterno, apellido_materno),
  UNIQUE (public_id),
  UNIQUE (numero_cliente)
);

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
