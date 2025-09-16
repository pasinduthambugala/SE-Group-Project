// controllers/userController.js
const { query, param, body } = require('express-validator');
const {
  listUsers,
  deleteUserById,
  resetPasswordAdmin,
  changePasswordSelf,
} = require('../services/userService');

const listValidators = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('role').optional().isString().trim(),
  query('q').optional().isString().trim(),
];
async function listHandler(req, res) {
  const data = await listUsers(req.query);
  res.json(data);
}

const idParam = [ param('id').isMongoId() ];
async function deleteHandler(req, res) {
  try {
    const result = await deleteUserById(req.params.id, req.user);
    res.json(result);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

const resetValidators = [
  param('id').isMongoId(),
  body('newPassword').isString().isLength({ min: 8 }),
];
async function resetHandler(req, res) {
  try {
    const result = await resetPasswordAdmin(
      { userId: req.params.id, newPassword: req.body.newPassword },
      req.user
    );
    res.json(result);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

const changeSelfValidators = [
  body('currentPassword').isString().notEmpty(),
  body('newPassword').isString().isLength({ min: 8 }),
];
async function changeSelfHandler(req, res) {
  try {
    const result = await changePasswordSelf({
      userId: req.user.id,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
    });
    res.json(result);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

module.exports = {
  listValidators,
  listHandler,
  idParam,
  deleteHandler,
  resetValidators,
  resetHandler,
  changeSelfValidators,
  changeSelfHandler,
};
