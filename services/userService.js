// services/userService.js
const User = require('../models/User');
const { ROLES } = require('../utils/roles');

async function listUsers({ page = 1, limit = 20, role, q }) {
  page = Number(page) || 1;
  limit = Math.min(Number(limit) || 20, 100);

  const filter = {};
  if (role) filter.role = role;
  if (q) {
    const rx = new RegExp(q, 'i');
    filter.$or = [
      { name: rx },
      { email: rx },
      { nic: rx },
      { telephoneNo: rx },
      { address: rx },
    ];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-password'),
    User.countDocuments(filter),
  ]);

  return {
    items,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
}

async function deleteUserById(userId, actor) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (String(user._id) === String(actor.id)) {
    throw new Error('You cannot delete your own account');
  }

  if (user.role === ROLES.SUPER_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    throw new Error('Only super admin can delete a super admin');
  }

  const otherSA = await User.countDocuments({
    role: ROLES.SUPER_ADMIN,
    _id: { $ne: user._id },
  });
  if (user.role === ROLES.SUPER_ADMIN && otherSA === 0) {
    throw new Error('Cannot delete the last super admin');
  }

  await user.deleteOne();
  return { ok: true };
}

async function resetPasswordAdmin({ userId, newPassword }, actor) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (user.role === ROLES.SUPER_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    throw new Error('Only super admin can reset a super admin password');
  }

  user.password = newPassword; // hashed by pre-save
  await user.save();
  return { ok: true };
}

async function changePasswordSelf({ userId, currentPassword, newPassword }) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const ok = await user.comparePassword(currentPassword);
  if (!ok) throw new Error('Current password is incorrect');

  user.password = newPassword; // hashed by pre-save
  await user.save();
  return { ok: true };
}

module.exports = {
  listUsers,
  deleteUserById,
  resetPasswordAdmin,
  changePasswordSelf,
};
