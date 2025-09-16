const mongoose = require('mongoose');

const browserDetailsSchema = new mongoose.Schema({
  date: { type: String, required: true },
  invoiceNo: { type: String, required: true },
  browserNo: { type: String, required: true },
  product: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  sealNo: { type: String, required: true },
  driverCheck: { type: String, enum: ['Pending', 'Checked'], default: 'Pending' },
  dealerCheck: { type: String, enum: ['Pending', 'Checked'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BrowserDetails', browserDetailsSchema);