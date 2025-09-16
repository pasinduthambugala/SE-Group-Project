// models/TankReading.js
const mongoose = require('mongoose');

const tankReadingSchema = new mongoose.Schema(
  {
    tankId: { type: String },               // optional (if you have multiple tanks per fuel)
    fuelType: { type: String, required: true }, // e.g., Diesel | Petrol92 | Petrol95 | Kerosene
    level: { type: Number, required: true },    // store liters (recommended) or percentage
  },
  { timestamps: true } // createdAt will be your reading time
);

module.exports = mongoose.model('TankReading', tankReadingSchema);
