-- Migración 013 — Sistema Transaccional de Mermas (4 Nodos)
-- Convención: DECIMAL(18,4) para todo, soft delete con activo=false
-- Los 4 nodos de merma: AYUNO, FRIO, DESPOSTE, HORNO

-- Tipo de merma como dominio de texto con CHECK (equivalente a ENUM en Postgres)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'tipo_merma'
  ) THEN
    CREATE TYPE tipo_merma AS ENUM ('AYUNO', 'FRIO', 'DESPOSTE', 'HORNO');
  END IF;
END
$$;

-- Tabla principal de registro de mermas
CREATE TABLE IF NOT EXISTS registro_mermas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id          UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  lote_id             UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,

  -- Nodo de merma
  tipo                tipo_merma NOT NULL,

  -- Pesajes capturados en el nodo
  peso_inicial        DECIMAL(18,4) NOT NULL CHECK (peso_inicial > 0),
  peso_final          DECIMAL(18,4) NOT NULL CHECK (peso_final >= 0),

  -- Calculados automáticamente por el backend (DB trigger o lógica de negocio)
  kg_merma            DECIMAL(18,4) GENERATED ALWAYS AS (peso_inicial - peso_final) STORED,
  porcentaje_merma    DECIMAL(18,4) GENERATED ALWAYS AS (
                        CASE
                          WHEN peso_inicial = 0 THEN 0
                          ELSE ROUND(((peso_inicial - peso_final) / peso_inicial) * 100, 4)
                        END
                      ) STORED,

  -- Metadata operativa
  fecha               DATE NOT NULL DEFAULT CURRENT_DATE,
  operario            VARCHAR(150),
  notas               TEXT,

  -- Soft delete
  activo              BOOLEAN DEFAULT TRUE,

  created_at          TIMESTAMP DEFAULT NOW()
);

-- Índice para consultas frecuentes por lote y tipo
CREATE INDEX IF NOT EXISTS idx_mermas_lote_tipo
  ON registro_mermas(lote_id, tipo, fecha DESC)
  WHERE activo = TRUE;

-- Índice para consultas por negocio
CREATE INDEX IF NOT EXISTS idx_mermas_negocio
  ON registro_mermas(negocio_id, fecha DESC)
  WHERE activo = TRUE;
