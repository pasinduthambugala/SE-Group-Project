// services/attendanceService.js
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { ROLES } = require('../utils/roles');

const toDateKeyColombo = Attendance.toDateKeyColombo;

/* ---------- NIC-based helpers used by controller ---------- */
async function markByNic({ nic, present, dailySalary, dateKey, markedBy }) {
  const nicTrim = String(nic || '').trim();
  const user = await User.findOne({ nic: nicTrim });
  if (!user) {
    const err = new Error('USER_NOT_FOUND');
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  const key = dateKey || toDateKeyColombo();

  const update = {
    nic: nicTrim,
    present: !!present,
    markedBy: markedBy || null,
  };
  if (dailySalary !== undefined && dailySalary !== null && dailySalary !== '') {
    update.dailySalary = Number(dailySalary);
  }
  update.status = update.present ? 'present' : 'absent';

  const attendance = await Attendance.findOneAndUpdate(
    { user: user._id, dateKey: key },
    { $set: update, $setOnInsert: { user: user._id, dateKey: key } },
    { new: true, upsert: true }
  ).populate('user', 'name email nic role');

  return attendance;
}

async function getByNicAndDate({ nic, dateKey }) {
  const user = await User.findOne({ nic: String(nic || '').trim() });
  if (!user) return null;
  const key = dateKey || toDateKeyColombo();
  return Attendance.findOne({ user: user._id, dateKey: key })
    .populate('user', 'name email nic role');
}

async function listByDateRange({ nic, from, to, page = 1, limit = 20 }) {
  const user = await User.findOne({ nic: String(nic || '').trim() });
  if (!user) return { items: [], total: 0, page: Number(page) || 1, limit: Math.min(Number(limit) || 20, 100) };

  const match = { user: user._id };
  if (from || to) {
    match.dateKey = {};
    if (from) match.dateKey.$gte = from;
    if (to) match.dateKey.$lte = to;
  }

  page = Number(page) || 1;
  limit = Math.min(Number(limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Attendance.find(match)
      .sort({ dateKey: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email nic role'),
    Attendance.countDocuments(match),
  ]);

  return { items, total, page, limit };
}

/* ---------------- List (used by GET /api/attendance) ---------------- */
async function listAttendance({
  page = 1,
  limit = 20,
  userId,
  role,
  dateFrom,
  dateTo,
  status,
  q,
}) {
  page = Number(page) || 1;
  limit = Math.min(Number(limit) || 20, 100);
  const skip = (page - 1) * limit;

  const match = {};
  // ---- FIX: cast userId string -> ObjectId for $match ----
  if (userId) {
    if (mongoose.Types.ObjectId.isValid(String(userId))) {
      match.user = new mongoose.Types.ObjectId(String(userId));
    } else {
      // Invalid id -> no results (consistent behavior)
      return { items: [], page, limit, total: 0, pages: 1 };
    }
  }
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
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    }
  );

  const [res] = await Attendance.aggregate(pipeline);
  const items = (res?.items || []).map((r) => ({
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
  const total = res?.total?.[0]?.count || 0;

  return { items, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}

/* ---------------- Other existing methods (unchanged) ---------------- */

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
    present: true,
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

  if (target.role === ROLES.SUPER_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    throw new Error('Only super admin can modify a super admin');
  }

  const dk = dateKey || toDateKeyColombo(new Date());
  const rec = await Attendance.findOne({ user: targetUserId, dateKey: dk });

  const status = (data.status || 'present').toLowerCase();
  const payload = {
    status,
    present: status === 'present' || status === 'half-day',
    note: data.note,
    updatedBy: actor.id,

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

// Roster of all users for a given date (left-join with attendance)
async function rosterForDate({ dateKey, role, q, page = 1, limit = 50 }) {
  const dk = dateKey || toDateKeyColombo(new Date());
  page = Number(page) || 1;
  limit = Math.min(Number(limit) || 50, 200);
  const skip = (page - 1) * limit;

  const userMatch = {};
  if (role) userMatch.role = role;
  if (q) {
    const rx = new RegExp(q, 'i');
    userMatch.$or = [{ name: rx }, { email: rx }, { nic: rx }, { telephoneNo: rx }];
  }

  const pipeline = [
    { $match: userMatch },
    { $sort: { name: 1 } },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'attendances',
              let: { uid: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$user', '$$uid'] }, { $eq: ['$dateKey', dk] }],
                    },
                  },
                },
                { $limit: 1 },
              ],
              as: 'attendance',
            },
          },
          { $unwind: { path: '$attendance', preserveNullAndEmptyArrays: true } },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const [res] = await User.aggregate(pipeline);
  const total = res?.total?.[0]?.count || 0;
  return {
    dateKey: dk,
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    items: res?.items || [],
  };
}

// Bulk mark many users for one date (manager/SA)
async function bulkMark({ actor, dateKey, entries = [] }) {
  const dk = dateKey || toDateKeyColombo(new Date());
  const results = [];
  for (const e of entries) {
    try {
      const rec = await adminMark({
        actor,
        targetUserId: e.userId,
        dateKey: dk,
        data: {
          status: e.status,
          checkInAt: e.checkInAt,
          checkOutAt: e.checkOutAt,
          dailySalary: e.dailySalary,
          salaryPaid: e.salaryPaid,
          salaryPaidAmount: e.salaryPaidAmount,
          salaryPaidAt: e.salaryPaid ? (e.salaryPaidAt || new Date()) : undefined,
          salaryNote: e.salaryNote,
          note: e.note,
        },
      });
      results.push({ userId: e.userId, ok: true, attendanceId: String(rec._id) });
    } catch (err) {
      results.push({ userId: e.userId, ok: false, error: err.message });
    }
  }
  const ok = results.filter((r) => r.ok).length;
  return { dateKey: dk, ok, total: results.length, results };
}

module.exports = {
  // NIC-based used by controller
  markByNic,
  getByNicAndDate,
  listByDateRange,

  // existing
  listAttendance,
  checkInSelf,
  checkOutSelf,
  adminMark,
  payAttendance,
  deleteAttendanceById,
  listMyAttendance,
  rosterForDate,
  bulkMark,
};
