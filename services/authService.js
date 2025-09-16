// services/authService.js
const User = require('../models/User');
const { signJwt } = require('./tokenService');
const { nicRegex, phoneRegex, normalizePhone } = require('../utils/validators');
const { ALLOWED_ROLES } = require('../utils/roles');

async function register(data) {
  const {
    name, nic, role, address, birthday, email, telephoneNo, password,
  } = data;

  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error('Invalid role');
  }
  if (!nicRegex.test(nic)) {
    throw new Error('Invalid NIC format');
  }
  if (!phoneRegex.test(telephoneNo)) {
    throw new Error('Invalid phone format');
  }

  const tel = normalizePhone(telephoneNo);

  // Ensure unique constraints at app level too
  const exists = await User.findOne({
    $or: [
      { nic: nic.toUpperCase() },
      { email: email.toLowerCase() },
      { telephoneNo: tel },
    ],
  });
  if (exists) {
    throw new Error('User with NIC/email/phone already exists');
  }

  const userDoc = await User.create({
    name,
    nic: nic.toUpperCase(),
    role,
    address,
    birthday: new Date(birthday),
    email: email.toLowerCase(),
    telephoneNo: tel,
    password, // hashed by pre-save
  });

  const token = signJwt({ sub: userDoc.id, role: userDoc.role });

  // strip password before returning
  const user = userDoc.toObject();
  delete user.password;

  return { user, token };
}

async function login({ emailOrNic, password }) {
  const query = emailOrNic.includes('@')
    ? { email: emailOrNic.toLowerCase() }
    : { nic: emailOrNic.toUpperCase() };

  // IMPORTANT: select +password so compare works; DO NOT use .lean()
  const userDoc = await User.findOne(query).select('+password');
  if (!userDoc) throw new Error('Invalid credentials');

  const match = await userDoc.comparePassword(password);
  if (!match) throw new Error('Invalid credentials');

  const token = signJwt({ sub: userDoc.id, role: userDoc.role });

  const user = userDoc.toObject();
  delete user.password;

  return { user, token };
}

module.exports = { register, login };
