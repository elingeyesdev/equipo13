-- 1. Agregar edad promedio al lote
ALTER TABLE lotes
  ADD COLUMN IF NOT EXISTS edad_promedio_dias INT DEFAULT 0;

-- 2. Catálogo de servicios (futuro, crear ya para FK)
CREATE TABLE IF NOT EXISTS catalogo_servicios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre      VARCHAR(255) NOT NULL,
  descripcion TEXT,
  costo_base  DECIMAL(18,4),
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 3. Registro diario del lote
CREATE TABLE IF NOT EXISTS registro_diario_lote (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id      UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  lote_id         UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL,
  confirmado      BOOLEAN NOT NULL DEFAULT FALSE,
  confirmado_en   TIMESTAMP,
  notas_del_dia   TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_registro_lote_fecha UNIQUE (lote_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_registro_diario_lote
  ON registro_diario_lote(lote_id, fecha DESC);

-- 4. Items del registro diario
CREATE TABLE IF NOT EXISTS registro_diario_item (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_diario_id  UUID NOT NULL REFERENCES registro_diario_lote(id) ON DELETE CASCADE,
  tipo                VARCHAR(20) NOT NULL CHECK (tipo IN ('insumo', 'servicio')),
  insumo_id           UUID REFERENCES insumos(id),
  cantidad            DECIMAL(18,4),
  unidad_id           UUID REFERENCES unidades_medida(id),
  costo_real          DECIMAL(18,4),
  detalle_fifo        JSONB,
  servicio_id         UUID REFERENCES catalogo_servicios(id),
  servicio_nombre     VARCHAR(255),
  costo_servicio      DECIMAL(18,4),
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registro_diario_item
  ON registro_diario_item(registro_diario_id);
