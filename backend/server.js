const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const scanRoutes = require('./routes/scan');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'AccessiCheck Backend Running! 🚀' });
});

let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });
  isConnected = true;
  console.log('✅ MongoDB Connected!');
};

// Database pehle connect ho, phir routes chalein (serverless cold start fix)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection failed:', err.message);
    res.status(503).json({ message: 'Database is waking up, please try again in a minute.' });
  }
});

// Keep-alive: cron-job.org isay roz kholega taake MongoDB pause na ho
app.get('/api/ping', async (req, res) => {
  await mongoose.connection.db.admin().ping();
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/scan', scanRoutes);

if (process.env.NODE_ENV !== 'production') {
  connectDB().then(() => {
    app.listen(process.env.PORT || 5000, () => {
      console.log('✅ Server running on port', process.env.PORT || 5000);
    });
  });
}

module.exports = app;