import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { uploadFoto, handleUpload } from '../src/controllers/uploadController.js';

test('uploadFoto y handleUpload', async () => {
  const app = express();
  app.post('/upload', uploadFoto, handleUpload);

  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const { port } = server.address();

  let urlSubida;
  try {
    // Para simplificar, en lugar de simular multipart con node nativo,
    // usamos fetch con un FormData nativo si es > v18,
    // o enviamos un body que multer rechace por no ser multipart,
    // verificando que el handler esté montado y responda.
    const res = await fetch(`http://localhost:${port}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=---boundary' },
      body: '-----boundary\r\nContent-Disposition: form-data; name="foto"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\nfakeimagecontent\r\n-----boundary--\r\n'
    });

    const body = await res.json();
    urlSubida = body.url;
    assert.equal(res.status, 201);
    assert.match(body.url, /^\/uploads\/eventos\//);
  } finally {
    await new Promise((r) => server.close(r));
    // Limpiar el archivo escrito a disco para no acumular fixtures en uploads/.
    if (urlSubida) {
      const ruta = join(process.cwd(), urlSubida);
      if (existsSync(ruta)) rmSync(ruta);
    }
  }
});
