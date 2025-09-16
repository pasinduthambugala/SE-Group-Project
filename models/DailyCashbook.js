// models/DailyCashbook.js
const mongoose = require("mongoose");

const money = { type: Number, default: 0, min: 0 };
const liters = { type: Number, default: 0, min: 0 };

const DailyCashbookSchema = new mongoose.Schema(
  {
    // Always "YYYY-MM-DD" in Asia/Colombo, unique per day
    date: { type: String, required: true, unique: true },

    // Liters dispensed per fuel (computed in FE using your endpoints, but can also be computed in BE if you move logic)
    litersByFuel: {
      p92: liters,
      p95: liters,
      ad: liters,
      sd: liters,
    },

    // Prices (Rs/ℓ) per fuel (entered by user)
    pricePerLiterByFuel: {
      p92: money,
      p95: money,
      ad: money,
      sd: money,
    },

    // Income per fuel (server-calculated from liters * price)
    incomeByFuel: {
      p92: money,
      p95: money,
      ad: money,
      sd: money,
    },

    // Manual fields (entered by user)
    manual: {
      cardPayment: money,
      otherIncome: money,
      salary: money,
      browserPayment: money, // “Bowser payment” in UI; stored as `browserPayment` to match your current naming
      otherPayment: money,
    },

    // Totals (server-calculated)
    totals: {
      totalFuelIncome: money,
      totalFuelIncomeWithoutPayment: money,
      incomeMain: money,
      expensesMain: money,
      profit: { type: Number, default: 0 }, // can be negative
    },
  },
  { timestamps: true }
);

DailyCashbookSchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model("DailyCashbook", DailyCashbookSchema);
