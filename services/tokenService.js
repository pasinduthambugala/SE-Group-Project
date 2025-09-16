// services/tokenService.js
const jwt = require('jsonwebtoken');

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set (check your .env and server startup).');
  return s;
}

function signJwt(payload, options = {}) {
  return jwt.sign(payload, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES || '12h',
    ...options,
  });
}

function verifyJwt(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { signJwt, verifyJwt };
