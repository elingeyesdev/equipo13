const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ─────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Swagger Documentación ───────────────────────────
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ── Rutas ───────────────────────────────────────────
const unitRoutes = require('./routes/unitRoutes');
const materialRoutes = require('./routes/materialRoutes');
const conversionRoutes = require('./routes/conversionRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');

app.use('/api/units', unitRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/conversions', conversionRoutes);
app.use('/api/inventory', inventoryRoutes);

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
  console.log(`📦 API Units:       http://localhost:${PORT}/api/units`);
  console.log(`📦 API Materials:   http://localhost:${PORT}/api/materials`);
  console.log(`📦 API Conversions: http://localhost:${PORT}/api/conversions`);
  console.log(`📦 API Inventory:   http://localhost:${PORT}/api/inventory`);
  console.log(`\n📚 Swagger Docs:    http://localhost:${PORT}/api-docs\n`);
});
