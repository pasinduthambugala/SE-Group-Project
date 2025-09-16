const { body } = require('express-validator');
const { register, login } = require('../services/authService');
const { ALLOWED_ROLES } = require('../utils/roles');

const registerValidators = [
  body('name').isString().trim().notEmpty(),
  body('nic').isString().trim().notEmpty(),
  body('role').isString().trim().isIn(ALLOWED_ROLES),
  body('address').isString().trim().notEmpty(),
  body('birthday').isISO8601().toDate(),
  body('email').isEmail().normalizeEmail(),
  body('telephoneNo').isString().trim().notEmpty(),
  body('password').isString().isLength({ min: 8 }),
];

const loginValidators = [
  body('emailOrNic').isString().trim().notEmpty(),
  body('password').isString().notEmpty(),
];

async function registerHandler(req, res) {
  try {
    const { user, token } = await register(req.body);
    res.status(201).json({ user, token });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

async function loginHandler(req, res) {
  try {
    const { user, token } = await login(req.body);
    res.json({ user, token });
  } catch (e) {
    res.status(401).json({ message: e.message });
  }
}

async function meHandler(req, res) {
  // req.user is set by auth middleware
  res.json({ userId: req.user.id, role: req.user.role });
}

module.exports = {
  registerValidators,
  loginValidators,
  registerHandler,
  loginHandler,
  meHandler,
};
