const express = require('express');
const router = express.Router();
const providerController = require('../controllers/providerController');

router.get('/status', providerController.getProviderStatus);
router.get('/groq-test', providerController.testGroq);

module.exports = router;
