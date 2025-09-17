// routes/attendanceRoutes.js
const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');

const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/attendanceController');
const attendanceService = require('../services/attendanceService');

// Local validation handler (avoid external import path issues)
function handleValidation(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(422).json({ errors: result.array() });
  }
  next();
}

/**
 * GET /api/attendance
 * Query: userId?, role?, dateFrom?, dateTo?, status?, q?, page?, limit?
 * Uses your attendanceService.listAttendance
 */
router.get(
  '/',
  auth,
  [
    query('userId').optional().isString(),
    query('role').optional().isString(),
    query('status').optional().isString(),
    query('q').optional().isString(),
    query('dateFrom').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
    query('dateTo').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { userId, role, dateFrom, dateTo, status, q, page, limit } = req.query;
      const data = await attendanceService.listAttendance({
        userId, role, dateFrom, dateTo, status, q, page, limit,
      });
      return res.json(data);
    } catch (e) {
      return res.status(500).json({ message: 'Failed to list attendance' });
    }
  }
);

/**
 * POST /api/attendance/mark
 * Body: { nic, present, dailySalary?, dateKey? }
 */
router.post(
  '/mark',
  auth,
  [
    body('nic').trim().notEmpty().withMessage('NIC is required'),

    // accept boolean, "true"/"false", 1/0
    body('present')
      .customSanitizer((v) => {
        if (typeof v === 'boolean') return v;
        if (v === 1 || v === '1') return true;
        if (v === 0 || v === '0') return false;
        if (typeof v === 'string') {
          const s = v.trim().toLowerCase();
          if (s === 'true') return true;
          if (s === 'false') return false;
        }
        return v;
      })
      .isBoolean()
      .withMessage('present must be boolean'),

    // allow blank -> omitted
    body('dailySalary')
      .optional({ checkFalsy: true, nullable: true })
      .isFloat({ min: 0 })
      .withMessage('dailySalary must be >= 0')
      .toFloat(),

    body('dateKey')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('dateKey must be YYYY-MM-DD'),
  ],
  handleValidation,
  ctrl.markAttendance
);

/**
 * GET /api/attendance/by-date?nic=...&dateKey=YYYY-MM-DD
 */
router.get(
  '/by-date',
  auth,
  [
    query('nic').trim().notEmpty().withMessage('nic is required'),
    query('dateKey').optional().matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('dateKey must be YYYY-MM-DD'),
  ],
  handleValidation,
  ctrl.getByDate
);

/**
 * GET /api/attendance/range?nic=...&from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=100
 */
router.get(
  '/range',
  auth,
  [
    query('nic').trim().notEmpty().withMessage('nic is required'),
    query('from').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
    query('to').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  handleValidation,
  ctrl.listRange
);

module.exports = router;
