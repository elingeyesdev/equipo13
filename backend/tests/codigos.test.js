import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarPin, generarUsername, generarCodigoNegocio } from '../src/utils/codigos.js';

test('generarPin: 4 dígitos numéricos', () => {
  const pin = generarPin();
  assert.match(pin, /^\d{4}$/);
});

test('generarUsername: deriva de un nombre, en minúsculas y con sufijo', () => {
  const u = generarUsername('Juan Pérez');
  assert.match(u, /^juanperez-[a-z0-9]{3}$/);
});

test('generarCodigoNegocio: formato AA-NNNN', () => {
  const c = generarCodigoNegocio();
  assert.match(c, /^[A-Z]{2}-\d{4}$/);
});
