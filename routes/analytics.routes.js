// routes/analytics.routes.js
const express = require('express');
const { getTankLevelsController } = require('../controllers/analyticsController');

const router = express.Router();

// Example:
// GET /analytics/tank-levels?from=2025-09-08&to=2025-09-13&fuelTypes=Lanka%20Auto%20Diesel,Lanka%20Petrol%2095%20Octane
router.get('/tank-levels', getTankLevelsController);

module.exports = router;
