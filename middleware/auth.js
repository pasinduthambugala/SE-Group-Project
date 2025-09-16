const { verifyJwt } = require('../services/tokenService');

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const payload = verifyJwt(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (_e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Example: requireRoles('super admin','manager')
function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user?.role) return res.status(401).json({ message: 'Unauthorized' });
    if (!roles.map(r => r.toLowerCase()).includes(req.user.role.toLowerCase())) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { auth, requireRoles };
