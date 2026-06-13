CREATE TABLE IF NOT EXISTS alerta_precio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    corte_canonico VARCHAR(200) NOT NULL,
    canal VARCHAR(100) NOT NULL,
    precio_nuevo NUMERIC(10,4) NOT NULL,
    precio_promedio NUMERIC(10,4) NOT NULL,
    variacion_pct NUMERIC(8,4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
