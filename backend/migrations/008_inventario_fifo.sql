-- 1. Agregar columna de alerta de stock mínimo al catálogo
ALTER TABLE insumos
  ADD COLUMN IF NOT EXISTS stock_minimo_alerta DECIMAL(18,4) DEFAULT NULL;

-- 2. Tabla de compras de insumos (cada línea de compra = una capa FIFO)
CREATE TABLE IF NOT EXISTS compras_insumo (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id          UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  insumo_id           UUID NOT NULL REFERENCES insumos(id),
  proveedor_id        UUID REFERENCES proveedores(id),
  fecha_compra        DATE NOT NULL,
  cantidad_comprada   DECIMAL(18,4) NOT NULL CHECK (cantidad_comprada > 0),
  cantidad_disponible DECIMAL(18,4) NOT NULL CHECK (cantidad_disponible >= 0),
  precio_unitario     DECIMAL(18,4) NOT NULL CHECK (precio_unitario > 0),
  unidad_id           UUID REFERENCES unidades_medida(id),
  numero_factura      VARCHAR(100),
  notas               TEXT,
  created_at          TIMESTAMP DEFAULT NOW()
);

-- Índice FIFO con desempate por created_at (corrección: evita ambigüedad
-- cuando hay dos compras del mismo insumo en el mismo día)
CREATE INDEX IF NOT EXISTS idx_compras_fifo
  ON compras_insumo(insumo_id, fecha_compra ASC, created_at ASC)
  WHERE cantidad_disponible > 0;

-- 3. Tabla de consumos registrados desde bitácora
CREATE TABLE IF NOT EXISTS consumos_lote (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id      UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  lote_id         UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  insumo_id       UUID NOT NULL REFERENCES insumos(id),
  fecha_consumo   DATE NOT NULL,
  cantidad_total  DECIMAL(18,4) NOT NULL CHECK (cantidad_total > 0),
  costo_total     DECIMAL(18,4) NOT NULL,
  precio_promedio DECIMAL(18,4) NOT NULL,
  detalle_fifo    JSONB NOT NULL DEFAULT '[]',
  notas           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consumos_lote
  ON consumos_lote(lote_id, fecha_consumo DESC);

CREATE INDEX IF NOT EXISTS idx_consumos_insumo
  ON consumos_lote(insumo_id, fecha_consumo DESC);
