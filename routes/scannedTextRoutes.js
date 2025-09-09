const express = require('express');
const router = express.Router();
const ScannedText = require('../models/ScannedText'); // Adjust path if needed

router.post('/', async (req, res) => {
  console.log('Received body:', req.body);  // Add this

  const { userId, scannedText, fuelType } = req.body;

  if (!userId || !scannedText || !fuelType) {
    return res.status(400).json({ error: 'Missing userId, scannedText, or fuelType' });
  }

  try {
    const saved = await ScannedText.create({ userId, scannedText, fuelType });
    res.status(201).json({ message: 'Saved', id: saved._id });
  } catch (err) {
    console.error('Saving scanned text failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
