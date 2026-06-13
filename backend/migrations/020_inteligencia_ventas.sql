-- Migración 020 — Inteligencia de ventas: scraping + recomendaciones ML

CREATE TABLE IF NOT EXISTS fuentes_scraping (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre      VARCHAR(255) NOT NULL,
  url         TEXT NOT NULL,
  tipo        VARCHAR(20) NOT NULL CHECK (tipo IN ('static','json_api','js','pdf')),
  config      JSONB NOT NULL DEFAULT '{}'::jsonb,
  canal       VARCHAR(20) NOT NULL DEFAULT 'minorista' CHECK (canal IN ('minorista','mayorista')),
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS corte_alias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id      UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  alias_texto     VARCHAR(255) NOT NULL,
  corte_canonico  VARCHAR(255) NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_corte_alias UNIQUE (negocio_id, alias_texto)
);

CREATE TABLE IF NOT EXISTS precio_mercado_historico (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id      UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  fuente_id       UUID REFERENCES fuentes_scraping(id) ON DELETE SET NULL,
  corte_canonico  VARCHAR(255) NOT NULL,
  canal           VARCHAR(20) NOT NULL CHECK (canal IN ('minorista','mayorista')),
  precio_kg       DECIMAL(18,4) NOT NULL CHECK (precio_kg > 0),
  fecha           DATE NOT NULL,
  scraped_at      TIMESTAMP DEFAULT NOW(),
  raw             JSONB,
  CONSTRAINT uq_precio_hist UNIQUE (negocio_id, fuente_id, corte_canonico, canal, fecha)
);
CREATE INDEX IF NOT EXISTS idx_precio_hist_serie
  ON precio_mercado_historico (negocio_id, corte_canonico, canal, fecha);

CREATE TABLE IF NOT EXISTS scrape_run (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id       UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  fuente_id        UUID REFERENCES fuentes_scraping(id) ON DELETE SET NULL,
  estado           VARCHAR(20) NOT NULL CHECK (estado IN ('ok','error','parcial')),
  filas_insertadas INT NOT NULL DEFAULT 0,
  mensaje          TEXT,
  started_at       TIMESTAMP DEFAULT NOW(),
  finished_at      TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scrape_run ON scrape_run (negocio_id, started_at DESC);

CREATE TABLE IF NOT EXISTS recomendacion_venta (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id    UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  generada_en   TIMESTAMP DEFAULT NOW(),
  horizonte_dias INT NOT NULL DEFAULT 7,
  modo          VARCHAR(20) NOT NULL CHECK (modo IN ('heuristico','forecast')),
  resumen       JSONB
);
CREATE INDEX IF NOT EXISTS idx_recomendacion ON recomendacion_venta (negocio_id, generada_en DESC);

CREATE TABLE IF NOT EXISTS recomendacion_item (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recomendacion_id    UUID NOT NULL REFERENCES recomendacion_venta(id) ON DELETE CASCADE,
  corte_canonico      VARCHAR(255) NOT NULL,
  canal_sugerido      VARCHAR(20),
  precio_referencia   DECIMAL(18,4),
  costo_kg            DECIMAL(18,4),
  margen_kg           DECIMAL(18,4),
  kg_disponibles      DECIMAL(18,4),
  ingreso_estimado    DECIMAL(18,4),
  tendencia           VARCHAR(20),
  precio_pronosticado DECIMAL(18,4),
  accion              VARCHAR(20),
  confianza           DECIMAL(5,4)
);

CREATE TABLE IF NOT EXISTS modelo_forecast_meta (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id      UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  corte_canonico  VARCHAR(255) NOT NULL,
  canal           VARCHAR(20) NOT NULL,
  modelo          VARCHAR(50),
  metricas        JSONB,
  n_puntos        INT,
  entrenado_en    TIMESTAMP DEFAULT NOW()
);
