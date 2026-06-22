export async function seedCatalogoCortesPorcino(negocioId, db) {
  const cortes = [
    { nombre: 'Pierna', rendimiento: 24, tipo: 'primario', producto: 'Jamón', aliases: ['pierna', 'pernil'] },
    { nombre: 'Paleta', rendimiento: 16, tipo: 'primario', producto: 'Chorizo', aliases: ['paleta', 'brazuelo'] },
    { nombre: 'Lomo', rendimiento: 12, tipo: 'primario', producto: 'Lomo fresco', aliases: ['lomo'] },
    { nombre: 'Costilla', rendimiento: 10, tipo: 'primario', producto: 'Costillar', aliases: ['costilla', 'costillar'] },
    { nombre: 'Panceta', rendimiento: 9, tipo: 'primario', producto: 'Tocino', aliases: ['panceta', 'tocino'] },
    { nombre: 'Chuleta', rendimiento: 8, tipo: 'primario', producto: 'Chuleta fresca', aliases: ['chuleta'] },
    { nombre: 'Hueso/Carnaza', rendimiento: 5, tipo: 'subproducto', producto: null, aliases: ['hueso', 'carnaza'] },
    { nombre: 'Bondiola', rendimiento: 4, tipo: 'primario', producto: 'Bondiola curada', aliases: ['bondiola', 'cabeza de lomo'] },
    { nombre: 'Grasa', rendimiento: 4, tipo: 'subproducto', producto: 'Manteca', aliases: ['grasa', 'manteca'] },
    { nombre: 'Cuero', rendimiento: 3, tipo: 'subproducto', producto: 'Chicharrón', aliases: ['cuero', 'corteza'] },
    { nombre: 'Recortes', rendimiento: 3, tipo: 'recorte', producto: 'Chorizo', aliases: ['recorte', 'recortes'] },
    { nombre: 'Patas', rendimiento: 2, tipo: 'subproducto', producto: 'Patitas', aliases: ['pata', 'manita', 'patita'] },
  ];

  let orden = 10;
  for (const c of cortes) {
    await db.query(
      `INSERT INTO catalogo_cortes (
        negocio_id, nombre, rendimiento_pct, tipo, producto_sugerido, aliases, orden
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (negocio_id, nombre) DO NOTHING`,
      [negocioId, c.nombre, c.rendimiento, c.tipo, c.producto, c.aliases, orden]
    );
    orden += 10;
  }
}
