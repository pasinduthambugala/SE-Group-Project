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


router.get('/', async (req, res) => {
  try {
    const { userId } = req.query; // optional filter by userId
    let query = {};

    if (userId) {
      query.userId = userId;
    }

    const scannedTexts = await ScannedText.find(query).sort({ createdAt: -1 });

    res.status(200).json(scannedTexts);
  } catch (err) {
    console.error('Fetching scanned texts failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.get('/latest-by-fuel', async (req, res) => {
  try {
    // Use MongoDB aggregation to group by fuelType and pick latest
    const latestData = await ScannedText.aggregate([
      { $sort: { createdAt: -1 } }, // sort newest first
      {
        $group: {
          _id: "$fuelType",      // group by fuelType
          latest: { $first: "$$ROOT" } // get first document (latest) per group
        }
      },
      { $replaceRoot: { newRoot: "$latest" } } // flatten structure
    ]);

    res.status(200).json(latestData);
  } catch (err) {
    console.error('Fetching latest by fuelType failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;
 