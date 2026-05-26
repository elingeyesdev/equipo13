CREATE TABLE IF NOT EXISTS precios_mercado_cortes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    corte_nombre VARCHAR(255) NOT NULL,
    precio_unitario DECIMAL(18,4) NOT NULL CHECK (precio_unitario > 0),
    canal VARCHAR(20) NOT NULL CHECK (canal IN ('minorista', 'mayorista')),
    fecha_vigencia DATE NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_precios_mercado_negocio_corte_fecha 
ON precios_mercado_cortes (negocio_id, corte_nombre, fecha_vigencia DESC);
