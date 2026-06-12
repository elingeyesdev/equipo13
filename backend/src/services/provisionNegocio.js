// Provisión de un negocio recién creado para el modelo RBAC (migración 015):
//   - asigna un `codigo` único (login del operario: código + usuario + PIN)
//   - crea la membresía 'admin' del dueño
// La migración 015 hizo esto como backfill para los negocios existentes; los
// negocios nuevos deben mantener el mismo invariante o el operario no puede
// loguear y el dueño pierde acceso a las rutas requireMembership('admin').
import { generarCodigoNegocio } from '../utils/codigos.js';

// Asigna un codigo único al negocio (reintenta si colisiona) y devuelve el valor.
async function asignarCodigoUnico(client, negocioId) {
  let codigo;
  for (let intentos = 0; intentos < 8; intentos++) {
    codigo = generarCodigoNegocio();
    const { rowCount } = await client.query(
      'UPDATE negocios SET codigo = $1 WHERE id = $2 AND codigo IS NULL',
      [codigo, negocioId]
    );
    if (rowCount) return codigo;
    // colisión de UNIQUE(codigo) o el negocio ya tenía codigo
    const ya = await client.query('SELECT codigo FROM negocios WHERE id = $1', [negocioId]);
    if (ya.rows[0]?.codigo) return ya.rows[0].codigo;
  }
  throw new Error('No se pudo generar un código de negocio único');
}

// Provisiona codigo + membresía admin. Debe llamarse dentro de la transacción
// que crea el negocio (recibe el client).
export async function provisionarNegocioNuevo(client, { userId, negocioId }) {
  await asignarCodigoUnico(client, negocioId);
  await client.query(
    `INSERT INTO membresias (user_id, negocio_id, rol)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (user_id, negocio_id) DO NOTHING`,
    [userId, negocioId]
  );
}
