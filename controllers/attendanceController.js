// controllers/attendanceController.js
const { body, query, param } = require('express-validator');
const S = require('../services/attendanceService');

const listValidators = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('userId').optional().isMongoId(),
  query('role').optional().isString(),
  query('dateFrom').optional().isString(),
  query('dateTo').optional().isString(),
  query('status').optional().isIn(['present','absent','leave','half-day']),
  query('q').optional().isString(),
];
async function listHandler(req, res) {
  const data = await S.listAttendance(req.query);
  res.json(data);
}

const checkInValidators = [
  body('dateKey').optional().isString(),
  body('note').optional().isString(),
  body('checkInAt').optional().isISO8601().toDate(),
];
async function checkInHandler(req, res) {
  try {
    const data = await S.checkInSelf({ actor: req.user, ...req.body });
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

const checkOutValidators = [
  body('dateKey').optional().isString(),
  body('note').optional().isString(),
  body('checkOutAt').optional().isISO8601().toDate(),
];
async function checkOutHandler(req, res) {
  try {
    const data = await S.checkOutSelf({ actor: req.user, ...req.body });
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

const adminMarkValidators = [
  body('userId').isMongoId(),
  body('dateKey').optional().isString(),
  body('status').optional().isIn(['present','absent','leave','half-day']),
  body('checkInAt').optional().isISO8601().toDate(),
  body('checkOutAt').optional().isISO8601().toDate(),
  body('note').optional().isString(),
  // salary fields
  body('dailySalary').optional().isFloat({ min: 0 }),
  body('salaryPaid').optional().isBoolean(),
  body('salaryPaidAmount').optional().isFloat({ min: 0 }),
  body('salaryPaidAt').optional().isISO8601().toDate(),
  body('salaryNote').optional().isString(),
];
async function adminMarkHandler(req, res) {
  try {
    const data = await S.adminMark({
      actor: req.user,
      targetUserId: req.body.userId,
      dateKey: req.body.dateKey,
      data: {
        status: req.body.status,
        checkInAt: req.body.checkInAt,
        checkOutAt: req.body.checkOutAt,
        note: req.body.note,
        dailySalary: req.body.dailySalary,
        salaryPaid: req.body.salaryPaid,
        salaryPaidAmount: req.body.salaryPaidAmount,
        salaryPaidAt: req.body.salaryPaidAt,
        salaryNote: req.body.salaryNote,
      },
    });
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

const payValidators = [
  param('id').isMongoId(),
  body('amount').isFloat({ min: 0 }),
  body('note').optional().isString(),
  body('paidAt').optional().isISO8601().toDate(),
];
async function payHandler(req, res) {
  try {
    const data = await S.payAttendance({
      id: req.params.id,
      amount: req.body.amount,
      note: req.body.note,
      actor: req.user,
      paidAt: req.body.paidAt || new Date(),
    });
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

const deleteValidators = [param('id').isMongoId()];
async function deleteHandler(req, res) {
  try {
    const result = await S.deleteAttendanceById({ id: req.params.id, actor: req.user });
    res.json(result);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

const listMyValidators = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('month').optional().isInt({ min: 1, max: 12 }).toInt(),
  query('year').optional().isInt({ min: 1970 }).toInt(),
];
async function listMyHandler(req, res) {
  const data = await S.listMyAttendance({ actor: req.user, ...req.query });
  res.json(data);
}

module.exports = {
  listValidators,
  listHandler,
  checkInValidators,
  checkInHandler,
  checkOutValidators,
  checkOutHandler,
  adminMarkValidators,
  adminMarkHandler,
  payValidators,
  payHandler,
  deleteValidators,
  deleteHandler,
  listMyValidators,
  listMyHandler,
};
