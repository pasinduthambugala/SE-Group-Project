// models/Attendance.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Local date key helper: 'YYYY-MM-DD' in Asia/Colombo
function toDateKeyColombo(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d); // e.g., 2025-09-16
}

const AttendanceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // The *local* (Asia/Colombo) date for this record (unique per user)
    dateKey: { type: String, required: true }, // 'YYYY-MM-DD'

    // Optional times
    checkInAt: { type: Date },
    checkOutAt: { type: Date },

    // Basic status
    status: {
      type: String,
      enum: ['present', 'absent', 'leave', 'half-day'],
      default: 'present',
    },

    minutesWorked: { type: Number, default: 0 },
    note: { type: String },

    // 💰 Salary fields for daily payout
    dailySalary: { type: Number, default: 0 },       // planned/expected salary for the day
    salaryPaid: { type: Boolean, default: false },   // has this day been paid?
    salaryPaidAmount: { type: Number, default: 0 },  // amount paid
    salaryPaidAt: { type: Date },                    // paid timestamp
    salaryNote: { type: String },                    // optional note / reference

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Ensure 1 record per user per local date
AttendanceSchema.index({ user: 1, dateKey: 1 }, { unique: true });

// Auto-calc minutesWorked
AttendanceSchema.pre('save', function (next) {
  if (this.checkInAt && this.checkOutAt) {
    const diffMs = this.checkOutAt.getTime() - this.checkInAt.getTime();
    this.minutesWorked = diffMs > 0 ? Math.round(diffMs / 60000) : 0;
  }
  next();
});

// Helper export for reuse
AttendanceSchema.statics.toDateKeyColombo = toDateKeyColombo;

AttendanceSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
