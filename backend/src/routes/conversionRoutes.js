const express = require('express');
const router = express.Router();
const conversionController = require('../controllers/conversionController');

// ════════════════════════════════════════════
// Endpoints: Equivalencias y Conversiones
// Base: /api/conversions
// ════════════════════════════════════════════

router.get('/',     conversionController.getAll);    
router.get('/:id',  conversionController.getById);   
router.post('/',    conversionController.create);     
router.put('/:id',  conversionController.update);     
router.delete('/:id', conversionController.delete);   

module.exports = router;
