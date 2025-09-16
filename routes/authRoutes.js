const router = require('express').Router();
const { handleValidation } = require('../middleware/validate');


const {
  registerValidators, loginValidators,
  registerHandler, loginHandler, meHandler,
} = require('../controllers/authController');
const { auth , requireRoles} = require('../middleware/auth');
const { ROLES } = require('../utils/roles');

router.post('/signup',auth,
  requireRoles(ROLES.SUPER_ADMIN, ROLES.MANAGER), registerValidators, handleValidation, registerHandler);
router.post('/login',  loginValidators, handleValidation, loginHandler);
router.get('/me', auth, meHandler);

module.exports = router;
