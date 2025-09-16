module.exports.ROLES = Object.freeze({
  SUPER_ADMIN: 'super admin',
  MANAGER: 'manager',
  PUMPER: 'pumper',
  ACCOUNTANT: 'accountant',
  HEAD_OFFICER: 'head officer',
  AREA_MANAGER: 'area manager',
});

module.exports.ALLOWED_ROLES = Object.values(module.exports.ROLES);
