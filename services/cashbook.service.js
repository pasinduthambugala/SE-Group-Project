// services/cashbook.service.js
const DailyCashbook = require("../models/DailyCashbook");

/** safe number */
const N = (v) => (typeof v === "number" && isFinite(v) ? v : 0);

/** Compute all money fields from liters + prices + manual entries. */
function computeTotals({ litersByFuel = {}, pricePerLiterByFuel = {}, manual = {} }) {
  const liters = {
    p92: N(litersByFuel.p92), p95: N(litersByFuel.p95),
    ad:  N(litersByFuel.ad),  sd:  N(litersByFuel.sd),
  };
  const price = {
    p92: N(pricePerLiterByFuel.p92), p95: N(pricePerLiterByFuel.p95),
    ad:  N(pricePerLiterByFuel.ad),  sd:  N(pricePerLiterByFuel.sd),
  };
  const incomeByFuel = {
    p92: liters.p92 * price.p92,
    p95: liters.p95 * price.p95,
    ad:  liters.ad  * price.ad,
    sd:  liters.sd  * price.sd,
  };
  const totalFuelIncome =
    N(incomeByFuel.p92) + N(incomeByFuel.p95) + N(incomeByFuel.ad) + N(incomeByFuel.sd);

  const cardPayment   = N(manual.cardPayment);
  const otherIncome   = N(manual.otherIncome);
  const salary        = N(manual.salary);
  const browserPayment= N(manual.browserPayment);
  const otherPayment  = N(manual.otherPayment);

  // Keep your “without payment” definition (exclude card payment)
  const totalFuelIncomeWithoutPayment = Math.max(0, totalFuelIncome - cardPayment);
  const incomeMain   = totalFuelIncome + cardPayment + otherIncome;
  const expensesMain = salary + browserPayment + otherPayment;
  const profit       = incomeMain - expensesMain;

  return { incomeByFuel, totals: {
    totalFuelIncome,
    totalFuelIncomeWithoutPayment,
    incomeMain,
    expensesMain,
    profit,
  }};
}

/** Create or update (upsert) by unique date. */
async function upsertByDate(date, body) {
  const { litersByFuel, pricePerLiterByFuel, manual } = body;

  const { incomeByFuel, totals } = computeTotals({ litersByFuel, pricePerLiterByFuel, manual });

  const update = {
    date,
    litersByFuel,
    pricePerLiterByFuel,
    incomeByFuel,
    manual,
    totals,
  };

  const doc = await DailyCashbook.findOneAndUpdate(
    { date },
    update,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return doc;
}

async function getByDate(date) {
  return DailyCashbook.findOne({ date });
}

async function list({ from, to, page = 1, limit = 30 }) {
  const q = {};
  if (from) q.date = { ...(q.date || {}), $gte: from };
  if (to)   q.date = { ...(q.date || {}), $lte: to };

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    DailyCashbook.find(q).sort({ date: -1 }).skip(skip).limit(Number(limit)),
    DailyCashbook.countDocuments(q),
  ]);

  return {
    items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.max(1, Math.ceil(total / Number(limit))),
    },
  };
}

async function removeByDate(date) {
  return DailyCashbook.findOneAndDelete({ date });
}

module.exports = { computeTotals, upsertByDate, getByDate, list, removeByDate };
