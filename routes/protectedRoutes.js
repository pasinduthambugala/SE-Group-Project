const router = require('express').Router();
const { auth, requireRoles } = require('../middleware/auth');
const { ROLES } = require('../utils/roles');

// Anyone with a valid token
router.get('/profile', auth, (req, res) => {
  res.json({ message: 'Your protected profile data', user: req.user });
});

// Only super admin & manager
router.get('/admin', auth, requireRoles(ROLES.SUPER_ADMIN, ROLES.MANAGER), (_req, res) => {
  res.json({ message: 'Admin-only data' });
});

// Only pumper
router.get('/pumper', auth, requireRoles(ROLES.PUMPER), (_req, res) => {
  res.json({ message: 'Pumper-only area' });
});

// Accountant + Head officer + Area manager example
router.get('/finance', auth, requireRoles(ROLES.ACCOUNTANT, ROLES.HEAD_OFFICER, ROLES.AREA_MANAGER), (_req, res) => {
  res.json({ message: 'Finance/report area' });
});



module.exports = router;
