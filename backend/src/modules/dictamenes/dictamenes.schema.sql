CREATE TABLE IF NOT EXISTS dictamenes (
  id BIGSERIAL PRIMARY KEY,
  portafolio_id BIGINT NOT NULL REFERENCES portfolios(id),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo_contacto TEXT NOT NULL DEFAULT 'NO_CONTACTADO' CHECK (tipo_contacto IN ('CONTACTADO', 'NO_CONTACTADO', 'INVALIDO', 'RECHAZO')),
  score_global NUMERIC(5,2) NOT NULL CHECK (score_global >= 0 AND score_global <= 100),
  score_llamada NUMERIC(5,2) NOT NULL CHECK (score_llamada >= 0 AND score_llamada <= 100),
  score_whatsapp NUMERIC(5,2) NOT NULL CHECK (score_whatsapp >= 0 AND score_whatsapp <= 100),
  score_sms NUMERIC(5,2) NOT NULL CHECK (score_sms >= 0 AND score_sms <= 100),
  score_email NUMERIC(5,2) NOT NULL CHECK (score_email >= 0 AND score_email <= 100),
  score_visita NUMERIC(5,2) NOT NULL CHECK (score_visita >= 0 AND score_visita <= 100),
  nivel_riesgo TEXT NOT NULL CHECK (nivel_riesgo IN ('BAJO', 'MEDIO', 'ALTO')),
  permitir_contacto BOOLEAN NOT NULL DEFAULT TRUE,
  bloquear_cliente BOOLEAN NOT NULL DEFAULT FALSE,
  recomendar_reintento BOOLEAN NOT NULL DEFAULT FALSE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE dictamenes ADD COLUMN IF NOT EXISTS tipo_contacto TEXT;
ALTER TABLE dictamenes ADD COLUMN IF NOT EXISTS score_email NUMERIC(5,2);

UPDATE dictamenes
SET
  tipo_contacto = COALESCE(tipo_contacto, 'NO_CONTACTADO'),
  score_email = COALESCE(score_email, score_global)
WHERE tipo_contacto IS NULL OR score_email IS NULL;

ALTER TABLE dictamenes ALTER COLUMN tipo_contacto SET DEFAULT 'NO_CONTACTADO';
ALTER TABLE dictamenes ALTER COLUMN score_email SET DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_dictamenes_tipo_contacto'
  ) THEN
    ALTER TABLE dictamenes
      ADD CONSTRAINT chk_dictamenes_tipo_contacto
      CHECK (tipo_contacto IN ('CONTACTADO', 'NO_CONTACTADO', 'INVALIDO', 'RECHAZO'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_dictamenes_score_email'
  ) THEN
    ALTER TABLE dictamenes
      ADD CONSTRAINT chk_dictamenes_score_email
      CHECK (score_email >= 0 AND score_email <= 100);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dictamenes_portafolio_id ON dictamenes (portafolio_id);
CREATE INDEX IF NOT EXISTS idx_dictamenes_activo ON dictamenes (activo);
CREATE INDEX IF NOT EXISTS idx_dictamenes_riesgo ON dictamenes (nivel_riesgo);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dictamenes_portafolio_nombre
  ON dictamenes (portafolio_id, lower(nombre));
