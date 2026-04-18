const express = require('express');
const router = express.Router();
const bomController = require('../controllers/bomController');

router.get('/', bomController.getAll);
router.post('/', bomController.create);
router.get('/:id', bomController.getById);
router.put('/:id', bomController.update);
router.delete('/:id', bomController.remove);

router.post('/:id/items', bomController.addItem);
router.put('/:id/items/:itemId', bomController.updateItem);
router.delete('/:id/items/:itemId', bomController.removeItem);

module.exports = router;
