const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Employee = require('../models/Employee');

// ✅ Test Route
router.get('/test', (req, res) => {
  res.send('✅ User routes working!');
});

// ✅ Login Route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', username);

  try {
    // 1. Find user
    const user = await User.findOne({ username });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // 2. Find related employee record
    const employee = await Employee.findOne({ userId: user._id });

    if (!employee) {
      return res.status(404).json({ error: 'Employee details not found' });
    }

    // 3. Send full data on success
    return res.status(200).json({
      message: 'Login successful',
      userId: user._id,
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      jobRole: employee.jobRole,
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
