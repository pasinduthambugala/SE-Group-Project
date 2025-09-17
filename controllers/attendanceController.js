const attendanceService = require('../services/attendanceService');

async function markAttendance(req, res) {
  try {
    const { nic, present, dailySalary, dateKey } = req.body;

    const attendance = await attendanceService.markByNic({
      nic,
      present,
      dailySalary,
      dateKey,                // optional; if omitted, service uses today's Colombo date
      markedBy: req.user?.id, // from auth middleware
    });

    return res.status(200).json({
      message: 'Attendance saved',
      attendance,
    });
  } catch (e) {
    if (e && e.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ message: 'No user found with that NIC' });
    }
    return res.status(500).json({ message: 'Failed to save attendance' });
  }
}

async function getByDate(req, res) {
  try {
    const { nic, dateKey } = req.query;
    const rec = await attendanceService.getByNicAndDate({ nic, dateKey });
    if (!rec) return res.status(404).json({ message: 'No attendance record for that NIC/date' });
    return res.json({ attendance: rec });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to fetch attendance' });
  }
}

async function listRange(req, res) {
  try {
    const { nic, from, to, page, limit } = req.query;
    const data = await attendanceService.listByDateRange({ nic, from, to, page, limit });
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ message: 'Failed to fetch range' });
  }
}

module.exports = {
  markAttendance,
  getByDate,
  listRange,
};
