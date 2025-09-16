const BrowserDetails = require('../models/browserDetailsModel');

// Service to save multiple browser details
const saveBrowserDetails = async (data) => {
  // Ensure data is an array
  const items = Array.isArray(data) ? data : [data];

  // Basic validation for required fields
  for (const item of items) {
    if (!item.date || !item.invoiceNo || !item.browserNo || !item.product || !item.quantity || !item.sealNo) {
      throw new Error('All required fields must be provided');
    }
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      throw new Error('Quantity must be a positive number');
    }
  }

  return await BrowserDetails.insertMany(items, { runValidators: true });
};

// Service to fetch browser details with pagination and sorting
const getBrowserDetails = async (page, limit) => {
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  // Validate pagination parameters
  if (pageNum < 1 || limitNum < 1) {
    throw new Error('Page and limit must be positive integers');
  }

  const details = await BrowserDetails.find()
    .sort({ createdAt: -1 }) // Sort by creation date, newest first
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const total = await BrowserDetails.countDocuments();

  return {
    details,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

module.exports = { saveBrowserDetails, getBrowserDetails };