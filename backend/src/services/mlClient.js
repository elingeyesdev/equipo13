// Cliente server-to-server hacia el microservicio Python de inteligencia de ventas.
const BASE = () => process.env.ML_SERVICE_URL || 'http://localhost:8001';
const TOKEN = () => process.env.ML_SERVICE_TOKEN || '';

export async function mlPost(path, body) {
  const res = await fetch(`${BASE()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN()}` },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || data.error || 'Error en el servicio de ML');
    err.statusCode = res.status;
    throw err;
  }
  return data;
}
