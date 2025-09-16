// controllers/cashbook.controller.js
const svc = require("../services/cashbook.service");

function isYYYYMMDD(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s));
}

exports.createOrUpdate = async (req, res, next) => {
  try {
    const { date, litersByFuel, pricePerLiterByFuel, manual } = req.body || {};
    if (!isYYYYMMDD(date)) return res.status(400).json({ message: "Invalid or missing `date` (YYYY-MM-DD)." });

    const doc = await svc.upsertByDate(date, {
      litersByFuel: litersByFuel || {},
      pricePerLiterByFuel: pricePerLiterByFuel || {},
      manual: manual || {},
    });

    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const { date } = req.params;
    if (!isYYYYMMDD(date)) return res.status(400).json({ message: "Invalid `date`." });

    const doc = await svc.getByDate(date);
    if (!doc) return res.status(404).json({ message: "Not found" });

    return res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { from, to, page = 1, limit = 30 } = req.query;
    const out = await svc.list({ from, to, page, limit });
    return res.json({ success: true, ...out });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { date } = req.params;
    if (!isYYYYMMDD(date)) return res.status(400).json({ message: "Invalid `date`." });

    const doc = await svc.removeByDate(date);
    if (!doc) return res.status(404).json({ message: "Not found" });
    return res.json({ success: true, message: "Deleted", data: doc });
  } catch (err) {
    next(err);
  }
};
