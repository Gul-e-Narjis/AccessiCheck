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

// Apna proxy: website ka HTML server se laata hai taake scan free proxies pe depend na kare
const isPrivateHost = (h) =>
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$)/i.test(h);

app.get('/api/fetch-page', async (req, res) => {
  let target;
  try {
    target = new URL(String(req.query.url || ''));
  } catch {
    return res.status(400).json({ message: 'A valid url is required' });
  }
  if (!['http:', 'https:'].includes(target.protocol) || isPrivateHost(target.hostname)) {
    return res.status(400).json({ message: 'Only public http(s) URLs can be scanned' });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(target.href, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 AccessiCheck',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    const html = await response.text();
    if (html.length > 5 * 1024 * 1024) {
      return res.status(413).json({ message: 'Page is too large to scan' });
    }
    res.status(response.ok ? 200 : 502).type('text/html').send(html);
  } catch (err) {
    res.status(502).json({ message: 'Could not reach that website', error: err.name });
  } finally {
    clearTimeout(timer);
  }
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