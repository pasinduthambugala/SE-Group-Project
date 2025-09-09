const mongoose = require('mongoose');

const scannedTextSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  scannedText: { type: String, required: true },
  fuelType: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('ScannedText', scannedTextSchema);
