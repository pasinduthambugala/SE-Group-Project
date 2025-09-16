const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const scannedTextRoutes = require('./routes/scannedTextRoutes');
const browserDetailsRoutes = require('./routes/browserDetailsRoutes');
const analyticsRoutes = require('./routes/analytics.routes');
const cashbookRoutes = require("./routes/cashbook.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('✅ FuelX Backend is Running');
});

// Mount routes with path prefixes
app.use('/api/users', userRoutes);
app.use('/api/scanned-text', scannedTextRoutes);
app.use('/api/browser-details', browserDetailsRoutes);
app.use('/analytics', analyticsRoutes);
app.use("/api", cashbookRoutes);

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

// Log connected DB name after connection is established
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB:', mongoose.connection.db.databaseName);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT,'0.0.0.0', () => console.log(`Server running on port ${PORT}`));
