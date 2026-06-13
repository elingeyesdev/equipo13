import test from 'node:test';
import assert from 'node:assert';

test('getRecomendaciones devuelve items del mlService', async () => {
    // We mock fetch or simulate the controller logic to verify it calls mlPost
    // Instead of setting up full mock server, we mock global.fetch
    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
        if (url.includes('/recomendaciones/generar')) {
            return {
                ok: true,
                json: async () => ({ id: 'rec1', modo: 'heuristico', items: [{ canal_sugerido: 'minorista' }] })
            };
        }
        return { ok: false };
    };

    try {
        // Dynamic import to use the mocked fetch
        const { getRecomendaciones } = await import('../src/controllers/ventasMlController.js');
        const req = { params: { negocioId: '123' }, query: { horizonte: '7' } };
        let jsonResponse = null;
        const res = {
            json: (data) => { jsonResponse = data; }
        };

        await getRecomendaciones(req, res);
        
        assert.ok(jsonResponse, 'Debería responder con json');
        assert.strictEqual(jsonResponse.id, 'rec1');
        assert.strictEqual(jsonResponse.items[0].canal_sugerido, 'minorista');
    } finally {
        global.fetch = originalFetch;
    }
});
