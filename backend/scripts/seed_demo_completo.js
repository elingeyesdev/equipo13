// Seed orquestador de la DEMO COMPLETA.
//
// Corre automáticamente en el arranque del contenedor (docker-entrypoint.sh)
// cuando SEED_DEMO=true, DESPUÉS de las migraciones. Idempotente: si el usuario
// demo ya existe, no hace nada. Todo se siembra dentro de UNA transacción
// (atómico: o queda todo o no queda nada), así un `docker compose down -v &&
// up --build` deja la app lista para exponer:
//   - cuenta admin lista (gerardo@demo.com / demo1234)
//   - negocio agro "Granja Olmos" con catálogos, insumos e inventario FIFO
//   - 2 lotes de engorde con 30 días de registros + bitácora + pesajes
//   - catálogo de 12 cortes porcinos (+ corte_alias para el scraping)
//   - histórico de precios de mercado (Prophet en Pierna/Lomo, Holt-Winters en el resto)
//   - un lote faenado con despiece (para que el ML tenga cortes que recomendar)
//   - topes de canal
//   - 2 operarios (PIN), una rutina diaria y tareas pendientes
//
// Si algo falla, hace ROLLBACK y deja pasar el arranque igual (no bloquea el boot).

import bcrypt from 'bcryptjs';
import { pool } from '../src/config/database.js';
import { seedEngordePorcino } from '../seeds/engorde_porcino.js';

const DEMO_EMAIL = 'gerardo@demo.com';
const DEMO_PASS = 'demo1234';
const DEMO_NEGOCIO = 'Granja Olmos';

// Cortes porcinos con precio base minorista (Bs/kg) y rendimiento (% del canal).
// Alineados con backend/seeds/catalogoCortesPorcino.js y ml_service/seed_demo.py.
const CUTS = [
  { nombre: 'Pierna',        base: 25, rend: 24 },
  { nombre: 'Paleta',        base: 23, rend: 16 },
  { nombre: 'Lomo',          base: 36, rend: 12 },
  { nombre: 'Costilla',      base: 33, rend: 10 },
  { nombre: 'Panceta',       base: 30, rend: 9  },
  { nombre: 'Chuleta',       base: 32, rend: 8  },
  { nombre: 'Hueso/Carnaza', base: 15, rend: 5  },
  { nombre: 'Bondiola',      base: 35, rend: 4  },
  { nombre: 'Grasa',         base: 8,  rend: 4  },
  { nombre: 'Cuero',         base: 10, rend: 3  },
  { nombre: 'Recortes',      base: 18, rend: 3  },
  { nombre: 'Patas',         base: 15, rend: 2  },
];
const PROPHET = new Set(['Pierna', 'Lomo']); // >=365 días → dispara Prophet
const DIAS_PROPHET = 420;
const DIAS_DEFAULT = 90;
const FACTOR_MAYORISTA = 0.82;

// RNG determinista (semilla 42) para que la demo sea reproducible entre arranques.
let _seed = 42;
const rnd = () => { _seed = (_seed * 1103515245 + 12345) & 0x7fffffff; return _seed / 0x7fffffff; };

function* serie(base, dias) {
  const hoy = new Date();
  for (let i = dias; i >= 0; i--) {
    const f = new Date(hoy); f.setDate(hoy.getDate() - i);
    const t = dias - i;
    const tendencia = base * 0.0003 * t;
    const estacional = base * 0.06 * Math.sin((2 * Math.PI * t) / 365);
    const semanal = base * 0.02 * Math.sin((2 * Math.PI * t) / 7);
    const ruido = (rnd() * 2 - 1) * base * 0.015;
    const precio = Math.max(base * 0.5, base + tendencia + estacional + semanal + ruido);
    yield [f.toISOString().slice(0, 10), Math.round(precio * 100) / 100];
  }
}

async function insertarSerie(db, negocioId, corte, canal, base, dias) {
  const puntos = [...serie(base, dias)];
  const values = [];
  const params = [];
  let i = 1;
  for (const [fecha, precio] of puntos) {
    values.push(`($${i++}, NULL, $${i++}, $${i++}, $${i++}, $${i++})`);
    params.push(negocioId, corte, canal, precio, fecha);
  }
  await db.query(
    `INSERT INTO precio_mercado_historico (negocio_id, fuente_id, corte_canonico, canal, precio_kg, fecha)
     VALUES ${values.join(',')}`,
    params,
  );
}

async function seedMercadoYDespiece(db, negocioId) {
  // Fuentes de scraping REALES (Shopify /products.json) para el botón "Actualizar
  // mercado". El adaptador json_api lee products_path/title_key/price_path/grams_path
  // y normaliza el título a un corte canónico vía corte_alias (ya sembrado por el catálogo).
  const cfgJsonApi = {
    products_path: 'products',
    title_key: 'title',
    price_path: 'variants.0.price',
    grams_path: 'variants.0.grams',
  };
  const fuentes = [
    { nombre: 'Don Cerdo Bolivia', url: 'https://doncerdobolivia.com/collections/cortes/products.json', canal: 'minorista' },
    { nombre: 'Amarket',           url: 'https://amarket.com.bo/collections/cerdo/products.json',        canal: 'mayorista' },
  ];
  for (const f of fuentes) {
    await db.query(
      `INSERT INTO fuentes_scraping (negocio_id, nombre, url, tipo, config, canal, activo)
       VALUES ($1, $2, $3, 'json_api', $4, $5, true)`,
      [negocioId, f.nombre, f.url, cfgJsonApi, f.canal],
    );
  }

  // Histórico de precios por (corte, canal)
  for (const c of CUTS) {
    const dias = PROPHET.has(c.nombre) ? DIAS_PROPHET : DIAS_DEFAULT;
    await insertarSerie(db, negocioId, c.nombre, 'minorista', c.base, dias);
    await insertarSerie(db, negocioId, c.nombre, 'mayorista', c.base * FACTOR_MAYORISTA, dias);
  }

  // Topes de capacidad por canal (semana)
  await db.query(
    `INSERT INTO tope_canal (negocio_id, canal, kg_max_semana)
     VALUES ($1,'minorista',150),($1,'mayorista',500)
     ON CONFLICT (negocio_id, canal) DO NOTHING`,
    [negocioId],
  );

  // Lote faenado con despiece real (el ML lee despiece_cortes para recomendar).
  const cabezas = 20, pesoPie = 95, rendCanal = 0.78;
  const canalTotal = cabezas * pesoPie * rendCanal; // 1425 kg
  const { rows: [lote] } = await db.query(
    `INSERT INTO lotes (negocio_id, identificador, tipo_animal, cabezas_inicio, cabezas_activas,
                        peso_inicial_prom, peso_actual_prom, costo_adquisicion, activo, fecha_entrada)
     VALUES ($1, 'LOTE-FAENA-001', 'Cerdo', $2, $2, 25, $3, $4, false, CURRENT_DATE - 120) RETURNING id`,
    [negocioId, cabezas, pesoPie, 24000],
  );
  for (const c of CUTS) {
    const peso = Math.round(canalTotal * (c.rend / 100) * 100) / 100;
    const costo = Math.round(c.base * 0.6 * 100) / 100;
    await db.query(
      `INSERT INTO despiece_cortes (lote_id, nombre, peso_kg, porcentaje_canal, costo_kg_derivado)
       VALUES ($1, $2, $3, $4, $5)`,
      [lote.id, c.nombre, peso, c.rend, costo],
    );
  }
}

async function seedOperariosRutinasTareas(db, negocioId, adminId, loteIds) {
  const loteMain = loteIds['LOTE-CERD-001'];
  const loteNuevo = loteIds['LOTE-CERD-003'];

  // 2 operarios con login por PIN
  const ops = [
    { nombre: 'Juan Pérez',  username: 'juan',  pin: '1234' },
    { nombre: 'María López', username: 'maria', pin: '5678' },
  ];
  const opIds = [];
  for (const o of ops) {
    const pinHash = await bcrypt.hash(o.pin, 10);
    const { rows: [u] } = await db.query(
      `INSERT INTO users (nombre, username, pin_hash, tipo) VALUES ($1, $2, $3, 'pin') RETURNING id`,
      [o.nombre, o.username, pinHash],
    );
    await db.query(
      `INSERT INTO membresias (user_id, negocio_id, rol) VALUES ($1, $2, 'operario')`,
      [u.id, negocioId],
    );
    if (loteMain) {
      await db.query(
        `INSERT INTO operario_lote (operario_user_id, lote_id, negocio_id) VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [u.id, loteMain, negocioId],
      );
    }
    if (loteNuevo && o.username === 'juan') {
      await db.query(
        `INSERT INTO operario_lote (operario_user_id, lote_id, negocio_id) VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [u.id, loteNuevo, negocioId],
      );
    }
    opIds.push(u.id);
  }

  // Rutina diaria (plantilla de checklist recurrente)
  const { rows: [pl] } = await db.query(
    `INSERT INTO tarea_plantilla (negocio_id, nombre) VALUES ($1, $2) RETURNING id`,
    [negocioId, 'Rutina diaria de galpón'],
  );
  const items = [
    'Revisar comederos y bebederos',
    'Control de temperatura del galpón',
    'Registrar mortalidad del día',
    'Limpieza de pasillos y retiro de purín',
  ];
  let orden = 0;
  for (const it of items) {
    await db.query(
      `INSERT INTO tarea_plantilla_item (plantilla_id, titulo, orden) VALUES ($1, $2, $3)`,
      [pl.id, it, orden++],
    );
  }
  if (loteMain && opIds[0]) {
    await db.query(
      `INSERT INTO tarea_plantilla_asignacion (plantilla_id, lote_id, operario_user_id)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [pl.id, loteMain, opIds[0]],
    );
  }

  // Tareas puntuales pendientes
  const tareas = [
    { titulo: 'Aplicar refuerzo de vacuna Mycoplasma', desc: 'Segunda dosis al lote principal', dias: 2, op: 0, loteId: loteMain, estado: 'pendiente' },
    { titulo: 'Pesar muestra de 10 animales',          desc: 'Muestreo de pesos semanal',        dias: 1, op: 1, loteId: loteMain, estado: 'pendiente' },
    { titulo: 'Reparar bebedero del galpón 2',         desc: 'Fuga reportada por el turno noche', dias: 0, op: 0, loteId: loteMain, estado: 'pendiente' },
    { titulo: 'Pesar muestra de 3 animales',           desc: 'Muestreo de pesos',               dias: -1, op: 0, loteId: loteNuevo, estado: 'completada' },
    { titulo: 'Limpieza del galpón',                   desc: 'Limpieza de rutina',              dias: 1, op: 0, loteId: loteNuevo, estado: 'pendiente' },
  ];
  for (const t of tareas) {
    if (!t.loteId) continue;
    await db.query(
      `INSERT INTO tareas (negocio_id, lote_id, titulo, descripcion, fecha_objetivo, asignado_a, estado, created_by, completada_en)
       VALUES ($1, $2, $3, $4, CURRENT_DATE + ($5)::int, $6, $7, $8, $9)`,
      [negocioId, t.loteId, t.titulo, t.desc, t.dias, opIds[t.op], t.estado, adminId, t.estado === 'completada' ? new Date() : null],
    );
  }

  // Eventos de operario y mermas para LOTE-CERD-003
  if (loteNuevo && opIds[0]) {
    await db.query(
      `INSERT INTO eventos_operario (negocio_id, lote_id, operario_user_id, tipo, estado, payload)
       VALUES 
       ($1, $2, $3, 'pesaje', 'aplicado', '{}'::jsonb),
       ($1, $2, $3, 'incidente', 'aplicado', '{"descripcion": "Bebedero atascado en el corral"}'::jsonb),
       ($1, $2, $3, 'stock_bajo', 'aplicado', '{"insumo": "Balanceado", "mensaje": "Queda poco balanceado"}'::jsonb),
       ($1, $2, $3, 'baja', 'pendiente', '{"causa": "Síndrome respiratorio", "cantidad": 1}'::jsonb)`,
      [negocioId, loteNuevo, opIds[0]]
    );

    await db.query(
      `INSERT INTO registro_mermas (negocio_id, lote_id, tipo, peso_inicial, peso_final, fecha, operario)
       VALUES ($1, $2, 'AYUNO', 18.5, 18.0, CURRENT_DATE, 'Juan Pérez')`,
      [negocioId, loteNuevo]
    );
  }
}

async function main() {
  // Idempotencia: si la cuenta demo ya existe, no sembramos.
  const yaExiste = await pool.query('SELECT id FROM users WHERE email = $1', [DEMO_EMAIL]);
  if (yaExiste.rows.length) {
    console.log('[seed-demo] La cuenta demo ya existe — nada que sembrar.');
    await pool.end();
    return;
  }

  console.log('[seed-demo] Sembrando demo completa...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Cuenta admin lista para usar
    const passHash = await bcrypt.hash(DEMO_PASS, 10);
    const { rows: [admin] } = await client.query(
      `INSERT INTO users (email, password_hash, nombre, onboarding_completado, tipo)
       VALUES ($1, $2, $3, true, 'email') RETURNING id`,
      [DEMO_EMAIL, passHash, 'Gerardo (Demo)'],
    );

    // 2. Negocio agro
    const { rows: [negocio] } = await client.query(
      `INSERT INTO negocios (user_id, nombre, rubro, sub_rubro, plantilla, codigo, pesaje_intervalo_dias)
       VALUES ($1, $2, 'agro_ganadero', 'porcino', 'engorde_porcino', 'GRANJA', 15) RETURNING id`,
      [admin.id, DEMO_NEGOCIO],
    );
    const negocioId = negocio.id;

    // 3. Membresía admin
    await client.query(
      `INSERT INTO membresias (user_id, negocio_id, rol) VALUES ($1, $2, 'admin')`,
      [admin.id, negocioId],
    );

    // 4. Catálogos + insumos + inventario + 2 lotes + registros + catálogo de cortes
    await seedEngordePorcino(negocioId, client);

    // 5. Mercado (precios históricos) + despiece para el ML
    await seedMercadoYDespiece(client, negocioId);

    // 6. Operarios + rutinas + tareas
    const { rows: loteRows } = await client.query(
      'SELECT id, identificador FROM lotes WHERE negocio_id = $1',
      [negocioId],
    );
    const loteIds = Object.fromEntries(loteRows.map((r) => [r.identificador, r.id]));
    await seedOperariosRutinasTareas(client, negocioId, admin.id, loteIds);

    await client.query('COMMIT');
    console.log(`[seed-demo] Demo lista. Login: ${DEMO_EMAIL} / ${DEMO_PASS} (negocio: ${DEMO_NEGOCIO})`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed-demo] Falló el sembrado, ROLLBACK aplicado:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(async (e) => {
  console.error('[seed-demo] Error fatal:', e.message);
  try { await pool.end(); } catch { /* noop */ }
  // Salimos con 0 para no bloquear el arranque del contenedor.
  process.exit(0);
});
