import { test } from 'node:test';
import assert from 'node:assert/strict';

// Smoke test de arranque: importa cada módulo de rutas. Los tests unitarios
// importan controllers sueltos y NO detectan imports rotos en los archivos de
// rutas (p. ej. un import a un controller inexistente), que sí tumban el server
// al iniciar. Este test falla si cualquier ruta no resuelve sus imports.
const rutas = [
  '../src/routes/operario.js',
  '../src/routes/negocio.js',
  '../src/routes/negocios.js',
  '../src/routes/auth.js',
  '../src/routes/onboarding.js',
];

for (const ruta of rutas) {
  test(`las rutas ${ruta} cargan sin imports rotos`, async () => {
    const mod = await import(ruta);
    assert.ok(mod.default, `${ruta} debe exportar un router por default`);
  });
}
