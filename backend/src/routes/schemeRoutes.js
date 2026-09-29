const express = require('express');
const router = express.Router();
const schemeController = require('../controllers/schemeController');

router.post('/generate', schemeController.generateScheme);
router.post('/research', schemeController.researchScheme);
router.post('/content', schemeController.generateContent);

module.exports = router;
