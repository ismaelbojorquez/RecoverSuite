-- Catalogo de resultados de gestion por portafolio.
CREATE TABLE IF NOT EXISTS resultados_gestion (
  id BIGSERIAL PRIMARY KEY,
  portafolio_id BIGINT NOT NULL REFERENCES portfolios(id),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  requiere_promesa BOOLEAN NOT NULL DEFAULT FALSE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resultados_gestion_portafolio_id
  ON resultados_gestion (portafolio_id);
CREATE INDEX IF NOT EXISTS idx_resultados_gestion_activo
  ON resultados_gestion (activo);
CREATE INDEX IF NOT EXISTS idx_resultados_gestion_tipo
  ON resultados_gestion (tipo);
CREATE UNIQUE INDEX IF NOT EXISTS idx_resultados_gestion_portafolio_nombre
  ON resultados_gestion (portafolio_id, lower(nombre));
