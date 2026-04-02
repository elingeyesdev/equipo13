const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// ════════════════════════════════════════════
// Endpoints: Carga Masiva e Inventario Físico
// Base: /api/inventory
// ════════════════════════════════════════════

router.get('/',     inventoryController.getAll);    
router.get('/:id',  inventoryController.getById);   
router.post('/bulk', inventoryController.createBulk); // Carga Masiva (debe ir antes del :id)
router.post('/',    inventoryController.create);     
router.put('/:id',  inventoryController.update);     
router.delete('/:id', inventoryController.delete);   

module.exports = router;
