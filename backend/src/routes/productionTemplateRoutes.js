const express = require('express');
const router = express.Router();
const productionTemplateController = require('../controllers/productionTemplateController');

router.get('/', productionTemplateController.getAll);
router.get('/:id', productionTemplateController.getById);
router.post('/', productionTemplateController.create);
router.put('/:id', productionTemplateController.update);
router.delete('/:id', productionTemplateController.remove);

module.exports = router;
