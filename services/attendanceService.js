// services/attendanceService.js
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { ROLES } = require('../utils/roles');

const toDateKeyColombo = Attendance.toDateKeyColombo;

// List with filters (admins/viewers)
async function listAttendance({
  page = 1,
  limit = 20,
  userId,
  role,          // filter by user.role
  dateFrom,      // 'YYYY-MM-DD'
  dateTo,        // 'YYYY-MM-DD'
  status,        // present/absent/leave/half-day
  q,             // search user name/email/nic
}) {
  page = Number(page) || 1;
  limit = Math.min(Number(limit) || 20, 100);
  const skip = (page - 1) * limit;

  const match = {};
  if (userId) match.user = userId;
  if (status) match.status = status;
  if (dateFrom || dateTo) {
    match.dateKey = {};
    if (dateFrom) match.dateKey.$gte = dateFrom;
    if (dateTo) match.dateKey.$lte = dateTo;
  }

  const userMatch = {};
  if (role) userMatch.role = role;
  if (q) {
    const rx = new RegExp(q, 'i');
    userMatch.$or = [{ name: rx }, { email: rx }, { nic: rx }];
  }

  const pipeline = [
    { $match: match },
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userDoc' } },
    { $unwind: '$userDoc' },
  ];
  if (role || q) pipeline.push({ $match: userMatch });

  pipeline.push(
    { $sort: { dateKey: -1, createdAt: -1 } },
    { $facet: {
        items: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    }
  );

  const [res] = await Attendance.aggregate(pipeline);
  const items = (res.items || []).map((r) => ({
    ...r,
    user: {
      _id: r.userDoc._id,
      name: r.userDoc.name,
      email: r.userDoc.email,
      role: r.userDoc.role,
      nic: r.userDoc.nic,
      telephoneNo: r.userDoc.telephoneNo,
    },
    userDoc: undefined,
  }));
  const total = res.total?.[0]?.count || 0;

  return { items, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}

// Employee self check-in
async function checkInSelf({ actor, dateKey, checkInAt = new Date(), note }) {
  const dk = dateKey || toDateKeyColombo(new Date());
  const existing = await Attendance.findOne({ user: actor.id, dateKey: dk });

  if (existing) {
    if (existing.checkInAt) throw new Error('Already checked in for this day');
    existing.checkInAt = checkInAt;
    if (note) existing.note = note;
    existing.updatedBy = actor.id;
    await existing.save();
    return existing;
  }

  const created = await Attendance.create({
    user: actor.id,
    dateKey: dk,
    checkInAt,
    status: 'present',
    note,
    createdBy: actor.id,
    updatedBy: actor.id,
  });
  return created;
}

// Employee self check-out
async function checkOutSelf({ actor, dateKey, checkOutAt = new Date(), note }) {
  const dk = dateKey || toDateKeyColombo(new Date());
  const rec = await Attendance.findOne({ user: actor.id, dateKey: dk });
  if (!rec) throw new Error('No attendance record to check out');
  if (rec.checkOutAt) throw new Error('Already checked out');

  rec.checkOutAt = checkOutAt;
  if (note) rec.note = note;
  rec.updatedBy = actor.id;
  await rec.save();
  return rec;
}

// Admin mark/update any user for a date (incl. salary fields)
async function adminMark({ actor, targetUserId, dateKey, data }) {
  const target = await User.findById(targetUserId).lean();
  if (!target) throw new Error('Target user not found');

  // Only SA can modify a super admin
  if (target.role === ROLES.SUPER_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    throw new Error('Only super admin can modify a super admin');
  }

  const dk = dateKey || toDateKeyColombo(new Date());
  const rec = await Attendance.findOne({ user: targetUserId, dateKey: dk });

  const payload = {
    status: data.status || 'present',
    note: data.note,
    updatedBy: actor.id,

    // salary fields
    ...(data.dailySalary !== undefined ? { dailySalary: Number(data.dailySalary) || 0 } : {}),
    ...(data.salaryPaid !== undefined ? { salaryPaid: !!data.salaryPaid } : {}),
    ...(data.salaryPaidAmount !== undefined ? { salaryPaidAmount: Number(data.salaryPaidAmount) || 0 } : {}),
    ...(data.salaryPaidAt !== undefined ? { salaryPaidAt: data.salaryPaidAt } : {}),
    ...(data.salaryNote !== undefined ? { salaryNote: data.salaryNote } : {}),
  };

  if (data.checkInAt !== undefined) payload.checkInAt = data.checkInAt;
  if (data.checkOutAt !== undefined) payload.checkOutAt = data.checkOutAt;

  if (rec) {
    Object.assign(rec, payload);
    await rec.save();
    return rec;
  }

  const created = await Attendance.create({
    user: targetUserId,
    dateKey: dk,
    ...payload,
    createdBy: actor.id,
  });
  return created;
}

async function payAttendance({ id, amount, note, actor, paidAt = new Date() }) {
  const rec = await Attendance.findById(id).populate('user', 'role');
  if (!rec) throw new Error('Attendance not found');

  if (rec.user?.role === ROLES.SUPER_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    throw new Error('Only super admin can pay a super admin');
  }

  rec.salaryPaid = true;
  rec.salaryPaidAmount = Number(amount) || 0;
  rec.salaryPaidAt = paidAt;
  if (note !== undefined) rec.salaryNote = note;
  rec.updatedBy = actor.id;
  await rec.save();
  return rec;
}

async function deleteAttendanceById({ id, actor }) {
  const rec = await Attendance.findById(id).populate('user', 'role');
  if (!rec) throw new Error('Attendance not found');
  if (rec.user?.role === ROLES.SUPER_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    throw new Error('Only super admin can delete a super admin attendance');
  }
  await rec.deleteOne();
  return { ok: true };
}

// Self list
async function listMyAttendance({ actor, page = 1, limit = 20, month, year }) {
  page = Number(page) || 1;
  limit = Math.min(Number(limit) || 20, 100);
  const skip = (page - 1) * limit;

  const match = { user: actor.id };
  if (month && year) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    match.dateKey = { $regex: `^${prefix}` };
  }

  const [items, total] = await Promise.all([
    Attendance.find(match).sort({ dateKey: -1 }).skip(skip).limit(limit),
    Attendance.countDocuments(match),
  ]);

  return { items, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}

module.exports = {
  listAttendance,
  checkInSelf,
  checkOutSelf,
  adminMark,
  payAttendance,
  deleteAttendanceById,
  listMyAttendance,
};
