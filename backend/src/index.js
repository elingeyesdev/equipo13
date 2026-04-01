const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ─────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Rutas ───────────────────────────────────────────
const unitRoutes = require('./routes/unitRoutes');
app.use('/api/units', unitRoutes);

// ── Ruta de health check ────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'UPC System Backend',
    timestamp: new Date().toISOString() 
  });
});

// ── Iniciar servidor ────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 UPC System Backend corriendo en http://localhost:${PORT}`);
  console.log(`📦 API Units:  http://localhost:${PORT}/api/units`);
  console.log(`💚 Health:     http://localhost:${PORT}/api/health\n`);
});
