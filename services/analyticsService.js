// services/analyticsService.js
const ScannedText = require('../models/ScannedText');

// ----- helpers -----
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function toNextDayInclusive(dateStr) {
  const d = new Date(dateStr);
  return new Date(d.getTime() + 24 * 60 * 60 * 1000); // exclusive upper bound
}
// canonical key to merge tiny variations like trailing commas / case
function canonFuel(s = '') {
  return String(s).toLowerCase().replace(/[\s,]+$/g, '').trim();
}

// Build a tolerant regex that matches “ft” ignoring case and optional trailing comma/extra spaces
function fuelQueryRegex(ft = '') {
  const core = escapeRegExp(ft).replace(/\s+/g, '\\s+');
  return new RegExp(`^\\s*${core}\\s*,?\\s*$`, 'i');
}

async function getTankLevels({ from, to, fuelTypes = [] }) {
  const tz = '+05:30';
  const fromDate = new Date(from);
  const toDateExclusive = toNextDayInclusive(to);

  // ----- MATCH inside window -----
  const match = { createdAt: { $gte: fromDate, $lt: toDateExclusive } };
  if (fuelTypes.length) {
    match.$or = fuelTypes.map(ft => ({ fuelType: fuelQueryRegex(ft) }));
  }

  // We extract the numeric part of scannedText inside the pipeline:
  // 1) trim ends (remove trailing commas/spaces)
  // 2) remove inner commas (1,500 -> 1500)
  // 3) convert to double with onError:null
  const numericStages = [
    { $sort: { createdAt: 1 } },
    {
      $addFields: {
        _cleanScan: {
          $trim: { input: '$scannedText', chars: ' ,\n\r\t' },
        },
      },
    },
    {
      $addFields: {
        _cleanScan: { $replaceAll: { input: '$_cleanScan', find: ',', replacement: '' } },
      },
    },
    {
      $addFields: {
        numericLevel: {
          $convert: { input: '$_cleanScan', to: 'double', onError: null, onNull: null },
        },
      },
    },
  ];

  // 1) Aggregate last reading per day in the window
  const rows = await ScannedText.aggregate([
    { $match: match },
    ...numericStages,
    {
      $group: {
        _id: {
          fuelType: '$fuelType',
          day: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz },
          },
        },
        lastLevel: { $last: '$numericLevel' },
        lastAt: { $last: '$createdAt' },
      },
    },
    {
      $project: {
        _id: 0,
        fuelType: '$_id.fuelType',
        day: '$_id.day',
        level: '$lastLevel',
        at: '$lastAt',
      },
    },
    { $sort: { fuelType: 1, day: 1 } },
  ]);

  // 2) Pre-seed: last reading before 'from' for each fuel
  const preMatch = { createdAt: { $lt: fromDate } };
  if (fuelTypes.length) preMatch.$or = fuelTypes.map(ft => ({ fuelType: fuelQueryRegex(ft) }));

  const seeds = await ScannedText.aggregate([
    { $match: preMatch },
    ...numericStages,
    {
      $group: {
        _id: '$fuelType',
        lastLevel: { $last: '$numericLevel' },
        lastAt: { $last: '$createdAt' },
      },
    },
    { $project: { _id: 0, fuelType: '$_id', level: '$lastLevel', at: '$lastAt' } },
  ]);

  // 3) Map by canonical fuel keys, keep a pretty label
  const byFuel = {};          // { canonKey: { 'YYYY-MM-DD': level } }
  const seedByFuel = {};      // { canonKey: level }
  const prettyLabel = {};     // { canonKey: firstSeenOriginal }

  for (const r of rows) {
    const k = canonFuel(r.fuelType);
    if (!byFuel[k]) byFuel[k] = {};
    byFuel[k][r.day] = r.level;
    if (!prettyLabel[k]) prettyLabel[k] = r.fuelType;
  }
  for (const s of seeds) {
    const k = canonFuel(s.fuelType);
    seedByFuel[k] = s.level;
    if (!prettyLabel[k]) prettyLabel[k] = s.fuelType;
  }

  // 4) Build date axis (daily)
  const days = [];
  for (let d = new Date(fromDate); d < toDateExclusive; d.setDate(d.getDate() + 1)) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    days.push(`${yyyy}-${mm}-${dd}`);
  }

  // 5) Decide which fuels to output (requested → canonical)
  const requestedKeys = fuelTypes.map(canonFuel);
  const keys = fuelTypes.length ? requestedKeys : Array.from(new Set([...Object.keys(byFuel), ...Object.keys(seedByFuel)]));

  // 6) Forward-fill per fuel
  const series = [];
  for (const key of keys) {
    const levelByDay = byFuel[key] || {};
    let lastKnown = seedByFuel[key] ?? null;

    const points = [];
    for (const day of days) {
      if (day in levelByDay && levelByDay[day] != null) lastKnown = levelByDay[day];
      points.push({ date: day, level: lastKnown });
    }

    const label = fuelTypes.length
      ? fuelTypes[requestedKeys.indexOf(key)] // echo exactly what user requested
      : (prettyLabel[key] || key);

    series.push({ fuelType: label, points });
  }

  return { granularity: 'day', from: fromDate, to: new Date(to), series };
}

module.exports = { getTankLevels };
