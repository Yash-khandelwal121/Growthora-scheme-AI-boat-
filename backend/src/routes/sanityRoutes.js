const express = require('express');
const router = express.Router();
const sanityController = require('../controllers/sanityController');

router.get('/status', sanityController.getStatus);
router.get('/categories', sanityController.getCategories);
router.post('/preview', sanityController.preview);
router.post('/draft', sanityController.draft);

module.exports = router;
