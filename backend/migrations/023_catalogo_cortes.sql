CREATE TABLE IF NOT EXISTS catalogo_cortes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    especie TEXT NOT NULL DEFAULT 'porcino',
    nombre TEXT NOT NULL,
    rendimiento_pct NUMERIC(6,3) NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('primario', 'subproducto', 'recorte', 'descarte')),
    producto_sugerido TEXT,
    aliases TEXT[] NOT NULL DEFAULT '{}',
    color TEXT NOT NULL DEFAULT '#CBD5E1',
    orden INT NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (negocio_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_catalogo_cortes_negocio_id ON catalogo_cortes(negocio_id);
