// controllers/analyticsController.js
const { getTankLevels } = require('../services/analyticsService');

async function getTankLevelsController(req, res, next) {
  try {
    const { from, to, fuelTypes } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "Query params 'from' and 'to' are required (YYYY-MM-DD or ISO).",
      });
    }

    const fuels = fuelTypes
      ? fuelTypes.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const data = await getTankLevels({ from, to, fuelTypes: fuels });

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getTankLevelsController };
