// services/cashbook.service.js
const DailyCashbook = require("../models/DailyCashbook");

// node-fetch (ESM) shim for CommonJS
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

/** safe number */
const N = (v) => (typeof v === "number" && isFinite(v) ? v : 0);

// ---------- string & date helpers ----------
const normalize = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/%20/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const matchFuel = (name, wanted) => {
  const a = normalize(name);
  const b = normalize(wanted);
  if (a === b) return true;
  if (b.includes("petrol 92")) return a.includes("petrol") && (a.includes("92") || a.includes("octane 92"));
  if (b.includes("petrol 95")) return a.includes("petrol") && (a.includes("95") || a.includes("octane 95"));
  if (b.includes("auto diesel")) return a.includes("diesel") && a.includes("auto");
  if (b.includes("super diesel")) return a.includes("super diesel");
  return false;
};

const yyyymmdd = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(d);

const dayBefore = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return yyyymmdd(d);
};

// Keep one canonical list of fuels
const FUELS = [
  { key: "p92", name: "Lanka Petrol 92 Octane" },
  { key: "p95", name: "Lanka Petrol 95 Octane" },
  { key: "ad",  name: "Lanka Auto Diesel" },
  { key: "sd",  name: "Lanka Super Diesel" },
];

function pickLatestScanForDate(rows, fuelName, dateStr) {
  const sameDay = rows
    .filter((r) => r && r.createdAt && matchFuel(r.fuelType || "", fuelName))
    .filter((r) => yyyymmdd(new Date(r.createdAt)) === dateStr)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const n = Number(sameDay[0]?.scannedText);
  return Number.isFinite(n) ? n : null;
}

/**
 * Compute liters for a given date using:
 * 1) /analytics/tank-levels
 * 2) /api/scanned-text
 * 3) /api/browser-details
 * Returns { p92, p95, ad, sd }
 */
async function computeLitersForDate({ baseUrl, date }) {
  const from = dayBefore(date);
  const to = date;

  // fetch inputs in parallel
  const [scanRes, bowserRes] = await Promise.all([
    fetch(`${baseUrl}/api/scanned-text/`).then((r) => r.json()).catch(() => ({})),
    fetch(`${baseUrl}/api/browser-details/`).then((r) => r.json()).catch(() => ({})),
  ]);

  const scanRows = Array.isArray(scanRes) ? scanRes : (scanRes?.data || []);
  const bowserRows = Array.isArray(bowserRes?.data) ? bowserRes.data : [];

  const litersMap = {};

  for (const f of FUELS) {
    let yVal = null,
      tVal = null;

    // try analytics first
    try {
      const url = `${baseUrl}/analytics/tank-levels?from=${from}&to=${to}&fuelTypes=${encodeURIComponent(f.name)}`;
      const r = await fetch(url);
      if (r.ok) {
        const j = await r.json();
        const series = j?.data?.series ?? [];
        const s =
          series.find((s) => s.fuelType === f.name) ||
          series.find((s) => normalize(s.fuelType).includes(normalize(f.name).split(" ").slice(-2).join(" ")));
        const map = Object.fromEntries((s?.points ?? []).map((p) => [p.date, p.level]));
        yVal = typeof map[from] === "number" ? map[from] : null;
        tVal = typeof map[to] === "number" ? map[to] : null;
      }
    } catch {
      /* ignore */
    }

    // fallback to OCR scans
    if (yVal === null) yVal = pickLatestScanForDate(scanRows, f.name, from);
    if (tVal === null) tVal = pickLatestScanForDate(scanRows, f.name, to);

    // add recorded refills from bowser rows
    const dayDeliveries = bowserRows.filter((b) => b && b.date === date && matchFuel(b.product || "", f.name));
    const recordedRefill = dayDeliveries.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

    let liters = 0;
    if (typeof yVal === "number" && typeof tVal === "number") {
      const netChange = tVal - yVal;
      const deltaRefill = Math.max(netChange, 0);
      const effectiveRefill = Math.max(recordedRefill, deltaRefill);
      const usage = yVal + effectiveRefill - tVal;
      liters = usage >= 0 ? usage : 0;
    }
    litersMap[f.key] = liters;
  }

  return litersMap;
}

/** Compute all money fields from liters + prices + manual entries. */
function computeTotals({ litersByFuel = {}, pricePerLiterByFuel = {}, manual = {} }) {
  const liters = {
    p92: N(litersByFuel.p92),
    p95: N(litersByFuel.p95),
    ad: N(litersByFuel.ad),
    sd: N(litersByFuel.sd),
  };
  const price = {
    p92: N(pricePerLiterByFuel.p92),
    p95: N(pricePerLiterByFuel.p95),
    ad: N(pricePerLiterByFuel.ad),
    sd: N(pricePerLiterByFuel.sd),
  };
  const incomeByFuel = {
    p92: liters.p92 * price.p92,
    p95: liters.p95 * price.p95,
    ad: liters.ad * price.ad,
    sd: liters.sd * price.sd,
  };
  const totalFuelIncome = N(incomeByFuel.p92) + N(incomeByFuel.p95) + N(incomeByFuel.ad) + N(incomeByFuel.sd);

  const cardPayment = N(manual.cardPayment);
  const otherIncome = N(manual.otherIncome);
  const salary = N(manual.salary);
  const browserPayment = N(manual.browserPayment);
  const otherPayment = N(manual.otherPayment);

  const totalFuelIncomeWithoutPayment = Math.max(0, totalFuelIncome - cardPayment);
  const incomeMain = totalFuelIncome + cardPayment + otherIncome;
  const expensesMain = salary + browserPayment + otherPayment;
  const profit = incomeMain - expensesMain;

  return {
    incomeByFuel,
    totals: { totalFuelIncome, totalFuelIncomeWithoutPayment, incomeMain, expensesMain, profit },
  };
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

  const doc = await DailyCashbook.findOneAndUpdate({ date }, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });
  return doc;
}

async function getByDate(date) {
  return DailyCashbook.findOne({ date });
}

async function list({ from, to, page = 1, limit = 30 }) {
  const q = {};
  if (from) q.date = { ...(q.date || {}), $gte: from };
  if (to) q.date = { ...(q.date || {}), $lte: to };

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

module.exports = {
  // public API
  computeTotals,
  upsertByDate,
  getByDate,
  list,
  removeByDate,

  // new helper exported for controller fallback
  computeLitersForDate,
  // also export N if controllers want it
  N,
};
