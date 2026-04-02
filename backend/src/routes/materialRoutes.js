const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');

// ════════════════════════════════════════════
// Endpoints: Gestión de Insumos y Materia Prima
// Base: /api/materials
// ════════════════════════════════════════════

router.get('/',     materialController.getAll);    
router.get('/:id',  materialController.getById);   
router.post('/',    materialController.create);     
router.put('/:id',  materialController.update);     
router.delete('/:id', materialController.delete);   

module.exports = router;
