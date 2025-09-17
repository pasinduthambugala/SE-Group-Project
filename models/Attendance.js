const mongoose = require('mongoose');

// Normalize to Colombo date key (YYYY-MM-DD)
function toDateKeyColombo(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(date); // e.g. "2025-09-17"
}

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    nic: { type: String, required: true, index: true },

    dateKey: { type: String, required: true }, // 'YYYY-MM-DD' (Asia/Colombo)

    // Your NIC-based marking uses this boolean:
    present: { type: Boolean, required: true }, // true = present, false = absent

    // Keep a status string for other methods (adminMark/listAttendance filters)
    status: {
      type: String,
      enum: ['present', 'absent', 'leave', 'half-day'],
      default: 'present',
    },

    // Times & notes (used by check-in/out & adminMark)
    checkInAt: { type: Date },
    checkOutAt: { type: Date },
    note: { type: String },

    // Salary fields
    dailySalary: { type: Number, default: null },
    salaryPaid: { type: Boolean, default: false },
    salaryPaidAmount: { type: Number, default: 0 },
    salaryPaidAt: { type: Date },
    salaryNote: { type: String },

    // Audit
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who marked it (NIC flow)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Unique attendance per user per day
attendanceSchema.index({ user: 1, dateKey: 1 }, { unique: true });

// helper
attendanceSchema.statics.toDateKeyColombo = toDateKeyColombo;

module.exports = mongoose.model('Attendance', attendanceSchema);
