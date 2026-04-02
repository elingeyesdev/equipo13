const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unitController');

// ════════════════════════════════════════════
// Endpoints: Módulo de Unidades de Medida
// Base: /api/units
// ════════════════════════════════════════════

router.get('/',     unitController.getAll);    // GET    /api/units          → Listar todas (soporta ?category=Industrial)
router.get('/:id',  unitController.getById);   // GET    /api/units/kg       → Obtener una por ID
router.post('/',    unitController.create);     // POST   /api/units          → Crear nueva unidad
router.put('/:id',  unitController.update);     // PUT    /api/units/kg       → Actualizar unidad existente
router.delete('/:id', unitController.delete);   // DELETE /api/units/kg       → Eliminar unidad

module.exports = router;
