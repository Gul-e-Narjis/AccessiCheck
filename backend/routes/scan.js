const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, scanController.scanURL);
router.post('/save', authMiddleware, scanController.saveResults);
router.get('/history', authMiddleware, scanController.getHistory);
router.get('/:id', authMiddleware, scanController.getScanById);

module.exports = router;