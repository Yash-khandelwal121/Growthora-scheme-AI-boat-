const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');

router.post('/docx', exportController.exportDocx);

module.exports = router;
