const express = require('express');
const router = express.Router();
const productionStageController = require('../controllers/productionStageController');

// Define API routes for production stages
router.get('/', productionStageController.getAll);
router.put('/reorder', productionStageController.updateOrder); // Specifically positioned before /:id to prevent parameter capture collision
router.get('/:id', productionStageController.getById);
router.post('/', productionStageController.create);
router.put('/:id', productionStageController.update);
router.delete('/:id', productionStageController.remove);

module.exports = router;
