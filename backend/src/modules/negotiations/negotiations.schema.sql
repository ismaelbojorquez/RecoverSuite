-- Configuracion de niveles de descuento para negociaciones.
CREATE TABLE IF NOT EXISTS discount_levels (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  porcentaje_descuento NUMERIC(5,2) NOT NULL CHECK (porcentaje_descuento >= 0 AND porcentaje_descuento <= 100),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_discount_levels_nombre_ci
  ON discount_levels ((lower(nombre)));

CREATE INDEX IF NOT EXISTS idx_discount_levels_activo
  ON discount_levels (activo);

-- Relacion de niveles de descuento autorizados por grupo.
CREATE TABLE IF NOT EXISTS discount_level_groups (
  discount_level_id BIGINT NOT NULL REFERENCES discount_levels(id) ON DELETE CASCADE,
  group_id BIGINT NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (discount_level_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_discount_level_groups_group_id
  ON discount_level_groups (group_id);

-- Negociacion activa/historica por cliente.
CREATE TABLE IF NOT EXISTS negotiations (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id),
  portfolio_id BIGINT NOT NULL REFERENCES portfolios(id),
  discount_level_id BIGINT NOT NULL REFERENCES discount_levels(id),
  usuario_id BIGINT NOT NULL REFERENCES users(id),
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'cerrada', 'cancelada')),
  referencia TEXT,
  observaciones TEXT,
  fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_cierre TIMESTAMPTZ,
  porcentaje_descuento NUMERIC(5,2) NOT NULL CHECK (porcentaje_descuento >= 0 AND porcentaje_descuento <= 100),
  monto_base_total NUMERIC(18,2) CHECK (monto_base_total IS NULL OR monto_base_total >= 0),
  monto_negociado_total NUMERIC(18,2) CHECK (monto_negociado_total IS NULL OR monto_negociado_total >= 0),
  monto_descuento_total NUMERIC(18,2) CHECK (monto_descuento_total IS NULL OR monto_descuento_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    monto_base_total IS NULL
    OR monto_negociado_total IS NULL
    OR monto_negociado_total <= monto_base_total
  ),
  CHECK (
    (estado = 'activa' AND fecha_cierre IS NULL)
    OR (estado <> 'activa')
  )
);

-- Regla critica: solo una negociacion activa por cliente.
CREATE UNIQUE INDEX IF NOT EXISTS uq_negotiations_active_client
  ON negotiations (client_id)
  WHERE estado = 'activa';

CREATE INDEX IF NOT EXISTS idx_negotiations_portfolio_client
  ON negotiations (portfolio_id, client_id);

CREATE INDEX IF NOT EXISTS idx_negotiations_estado
  ON negotiations (estado);

-- Creditos incluidos en cada negociacion.
CREATE TABLE IF NOT EXISTS negotiation_credits (
  negotiation_id BIGINT NOT NULL REFERENCES negotiations(id) ON DELETE CASCADE,
  credit_id BIGINT NOT NULL REFERENCES credits(id),
  monto_base NUMERIC(18,2) CHECK (monto_base IS NULL OR monto_base >= 0),
  monto_negociado NUMERIC(18,2) CHECK (monto_negociado IS NULL OR monto_negociado >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (negotiation_id, credit_id)
);

CREATE INDEX IF NOT EXISTS idx_negotiation_credits_credit
  ON negotiation_credits (credit_id);

-- Eventos de trazabilidad de negociacion.
CREATE TABLE IF NOT EXISTS negotiation_events (
  id BIGSERIAL PRIMARY KEY,
  negotiation_id BIGINT NOT NULL REFERENCES negotiations(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('creada', 'cerrada', 'cancelada', 'actualizada')),
  detalle TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  usuario_id BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_negotiation_events_negotiation_id
  ON negotiation_events (negotiation_id);

