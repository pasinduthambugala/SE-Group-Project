// routes/userRoutes.js
const router = require('express').Router();
const { auth, requireRoles } = require('../middleware/auth');
const { ROLES } = require('../utils/roles');
const { handleValidation } = require('../middleware/validate');
const c = require('../controllers/userController');

// List users (SA + Manager)
router.get(
  '/',
  auth,
  requireRoles(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  c.listValidators,
  handleValidation,
  c.listHandler
);

// Delete user (SA + Manager)
router.delete(
  '/:id',
  auth,
  requireRoles(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  c.idParam,
  handleValidation,
  c.deleteHandler
);

// Admin reset user password (SA + Manager; service blocks non-SA on SA)
router.post(
  '/:id/reset-password',
  auth,
  requireRoles(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  c.resetValidators,
  handleValidation,
  c.resetHandler
);

// Self password change (any logged-in user)
router.post(
  '/me/change-password',
  auth,
  c.changeSelfValidators,
  handleValidation,
  c.changeSelfHandler
);

module.exports = router;
