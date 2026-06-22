export async function seedCatalogoCortesPorcino(negocioId, db) {
  const cortes = [
    { nombre: 'Pierna', rendimiento: 24, tipo: 'primario', producto: 'Jamón', aliases: ['pierna', 'pernil'], color: '#ef4444' },
    { nombre: 'Paleta', rendimiento: 16, tipo: 'primario', producto: 'Chorizo', aliases: ['paleta', 'brazuelo'], color: '#f97316' },
    { nombre: 'Lomo', rendimiento: 12, tipo: 'primario', producto: 'Lomo fresco', aliases: ['lomo'], color: '#eab308' },
    { nombre: 'Costilla', rendimiento: 10, tipo: 'primario', producto: 'Costillar', aliases: ['costilla', 'costillar'], color: '#84cc16' },
    { nombre: 'Panceta', rendimiento: 9, tipo: 'primario', producto: 'Tocino', aliases: ['panceta', 'tocino'], color: '#10b981' },
    { nombre: 'Chuleta', rendimiento: 8, tipo: 'primario', producto: 'Chuleta fresca', aliases: ['chuleta'], color: '#06b6d4' },
    { nombre: 'Hueso/Carnaza', rendimiento: 5, tipo: 'subproducto', producto: null, aliases: ['hueso', 'carnaza'], color: '#3b82f6' },
    { nombre: 'Bondiola', rendimiento: 4, tipo: 'primario', producto: 'Bondiola curada', aliases: ['bondiola', 'cabeza de lomo'], color: '#8b5cf6' },
    { nombre: 'Grasa', rendimiento: 4, tipo: 'subproducto', producto: 'Manteca', aliases: ['grasa', 'manteca'], color: '#d946ef' },
    { nombre: 'Cuero', rendimiento: 3, tipo: 'subproducto', producto: 'Chicharrón', aliases: ['cuero', 'corteza'], color: '#f43f5e' },
    { nombre: 'Recortes', rendimiento: 3, tipo: 'recorte', producto: 'Chorizo', aliases: ['recorte', 'recortes'], color: '#a8a29e' },
    { nombre: 'Patas', rendimiento: 2, tipo: 'subproducto', producto: 'Patitas', aliases: ['pata', 'manita', 'patita'], color: '#64748b' },
  ];

  let orden = 10;
  for (const c of cortes) {
    await db.query(
      `INSERT INTO catalogo_cortes (
        negocio_id, nombre, rendimiento_pct, tipo, producto_sugerido, aliases, color, orden
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (negocio_id, nombre) DO UPDATE SET color = EXCLUDED.color`,
      [negocioId, c.nombre, c.rendimiento, c.tipo, c.producto, c.aliases, c.color, orden]
    );

    // Sincronizar corte_alias para que el scraping del ML normalice los productos
    // scrapeados a estos cortes canónicos. Sin esto, "Actualizar mercado" corre pero
    // inserta 0 filas en silencio (cargar_alias() devuelve {} y no matchea nada).
    for (const alias of c.aliases) {
      const aliasTexto = String(alias).toLowerCase().trim();
      if (!aliasTexto) continue;
      await db.query(
        `INSERT INTO corte_alias (negocio_id, alias_texto, corte_canonico)
         VALUES ($1, $2, $3)
         ON CONFLICT (negocio_id, alias_texto) DO UPDATE SET corte_canonico = EXCLUDED.corte_canonico`,
        [negocioId, aliasTexto, c.nombre]
      );
    }

    orden += 10;
  }
}
