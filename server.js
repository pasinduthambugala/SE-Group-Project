const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');

const userRoutes = require('./routes/userRoutes');
const scannedTextRoutes = require('./routes/scannedTextRoutes');
const authRoutes = require('./routes/authRoutes'); // only once

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/scanned-text', scannedTextRoutes);
app.use('/api/users', authRoutes); // login/register routes

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
app.get('/', (req, res) => {
  res.send('✅ FuelX Backend is Running');
});
module.exports = app;