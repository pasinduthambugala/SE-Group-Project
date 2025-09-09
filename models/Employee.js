const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  jobRole: { type: String, required: true },
});

module.exports = mongoose.model('Employee', employeeSchema);
