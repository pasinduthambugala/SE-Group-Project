const express = require('express');
const router = express.Router();
const browserDetailsController = require('../controllers/browserDetailsController');

// POST route to save browser details
router.post('/', browserDetailsController.createBrowserDetails);

// GET route to fetch all browser details
router.get('/', browserDetailsController.fetchBrowserDetails);

module.exports = router;