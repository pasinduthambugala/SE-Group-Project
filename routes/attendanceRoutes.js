// routes/attendanceRoutes.js
const router = require('express').Router();
const { auth, requireRoles } = require('../middleware/auth');
const { ROLES } = require('../utils/roles');
const { handleValidation } = require('../middleware/validate');
const C = require('../controllers/attendanceController');

// List attendance — SA, Manager, Accountant, Head Officer, Area Manager
router.get(
  '/',
  auth,
  requireRoles(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.HEAD_OFFICER, ROLES.AREA_MANAGER),
  C.listValidators, handleValidation, C.listHandler
);

// Employee self check-in/out
router.post('/check-in', auth, C.checkInValidators, handleValidation, C.checkInHandler);
router.post('/check-out', auth, C.checkOutValidators, handleValidation, C.checkOutHandler);

// Admin mark/update any user's attendance — SA + Manager
router.post('/mark',
  auth,
  requireRoles(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  C.adminMarkValidators, handleValidation,
  C.adminMarkHandler
);

// Pay a specific attendance record — SA + Manager
router.post(
  '/:id/pay',
  auth,
  requireRoles(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  C.payValidators, handleValidation,
  C.payHandler
);

// Delete a record — SA + Manager
router.delete(
  '/:id',
  auth,
  requireRoles(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  C.deleteValidators, handleValidation,
  C.deleteHandler
);

// My logs
router.get('/me/list', auth, C.listMyValidators, handleValidation, C.listMyHandler);

module.exports = router;
