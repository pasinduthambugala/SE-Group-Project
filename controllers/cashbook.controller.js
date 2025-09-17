// controllers/cashbook.controller.js
const svc = require("../services/cashbook.service");

function isYYYYMMDD(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s));
}

// tiny safe-number (kept here to avoid circular imports)
const N = (v) => (typeof v === "number" && isFinite(v) ? v : 0);

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

    // Backward-compatible behavior by default
    const wantFill = req.query.fill === "1" || req.query.fill === "auto";
    const wantPersist = req.query.persist === "1";

    if (!wantFill) {
      return res.json({ success: true, data: doc });
    }

    // Only auto-fill if liters look empty
    const L = doc.litersByFuel || {};
    const litersSum = N(L.p92) + N(L.p95) + N(L.ad) + N(L.sd);
    if (litersSum > 0) {
      return res.json({ success: true, data: doc, meta: { filled: false } });
    }

    // Build base URL from request (no hard-coded host)
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // Compute liters from analytics/scans/bowser
    const computedLiters = await svc.computeLitersForDate({ baseUrl, date });

    // Recompute money fields using saved prices & manual inputs
    const { incomeByFuel, totals } = svc.computeTotals({
      litersByFuel: computedLiters,
      pricePerLiterByFuel: doc.pricePerLiterByFuel || {},
      manual: doc.manual || {},
    });

    // Preview (no persistence unless asked)
    if (!wantPersist) {
      const preview = {
        ...doc.toObject(),
        litersByFuel: computedLiters,
        incomeByFuel,
        totals,
      };
      return res.json({ success: true, data: preview, meta: { filled: true, persisted: false } });
    }

    // Persist recomputed values
    const saved = await svc.upsertByDate(date, {
      litersByFuel: computedLiters,
      pricePerLiterByFuel: doc.pricePerLiterByFuel || {},
      manual: doc.manual || {},
    });

    return res.json({ success: true, data: saved, meta: { filled: true, persisted: true } });
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
