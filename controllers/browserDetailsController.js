const browserDetailsService = require('../services/browserDetailsService');

// Controller to handle saving browser details
const createBrowserDetails = async (req, res) => {
  try {
    const browserDetails = await browserDetailsService.saveBrowserDetails(req.body);
    res.status(201).json({ message: 'Browser details saved successfully', data: browserDetails });
  } catch (error) {
    console.error('Error saving browser details:', error);
    res.status(400).json({ message: 'Error saving browser details', error: error.message });
  }
};

// Controller to handle fetching browser details
const fetchBrowserDetails = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await browserDetailsService.getBrowserDetails(page, limit);
    res.status(200).json({
      message: 'Browser details fetched successfully',
      data: result.details,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching browser details:', error);
    res.status(500).json({ message: 'Error fetching browser details', error: error.message });
  }
};

module.exports = { createBrowserDetails, fetchBrowserDetails };