// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { ALLOWED_ROLES } = require('../utils/roles');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nic: { type: String, required: true, uppercase: true },
    role: { type: String, enum: ALLOWED_ROLES, required: true },
    address: { type: String, required: true },
    birthday: { type: Date, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    telephoneNo: { type: String, required: true }, // store normalized (+94...)
    // Hide by default; we will explicitly select when needed
    password: { type: String, required: true, minlength: 8, select: false },
  },
  { timestamps: true }
);

// Hash password on create/update
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to compare passwords
UserSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Partial unique indexes (ignore docs where field missing/null)
UserSchema.index(
  { nic: 1 },
  { unique: true, partialFilterExpression: { nic: { $exists: true, $ne: null } } }
);
UserSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $exists: true, $ne: null } } }
);
UserSchema.index(
  { telephoneNo: 1 },
  { unique: true, partialFilterExpression: { telephoneNo: { $exists: true, $ne: null } } }
);

// Hide sensitive fields in JSON
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', UserSchema);
