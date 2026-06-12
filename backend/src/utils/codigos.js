// Generadores de identificadores legibles para operarios y negocios.
import { randomBytes } from 'crypto';

function slug(s) {
  return (s || 'operario')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20) || 'operario';
}

export function generarPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function generarUsername(nombre) {
  const sufijo = randomBytes(2).toString('hex').slice(0, 3);
  return `${slug(nombre)}-${sufijo}`;
}

export function generarCodigoNegocio() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const a = letras[Math.floor(Math.random() * letras.length)];
  const b = letras[Math.floor(Math.random() * letras.length)];
  const num = String(Math.floor(1000 + Math.random() * 9000));
  return `${a}${b}-${num}`;
}
