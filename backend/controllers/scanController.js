const Scan = require('../models/Scan');
const { runScan } = require('../utils/scanner');

const cache = new Map();
const CACHE_DURATION = 10 * 60 * 1000;

// Puppeteer scan (Postman testing ke liye)
exports.scanURL = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: 'URL is required' });

    let formattedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      formattedUrl = 'https://' + url;
    }

    const cached = cache.get(formattedUrl);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return res.json({ ...cached.data, fromCache: true });
    }

    const result = await runScan(formattedUrl);
    if (!result.success) {
      return res.status(500).json({ message: 'Scan failed', error: result.error });
    }

    const scan = await Scan.create({
      userId: req.user.userId,
      url: formattedUrl,
      score: result.score,
      critical: result.critical.length,
      moderate: result.moderate.length,
      minor: result.minor.length,
      issues: [...result.critical, ...result.moderate, ...result.minor]
    });

    const responseData = {
      scanId: scan._id,
      url: formattedUrl,
      score: result.score,
      critical: result.critical,
      moderate: result.moderate,
      minor: result.minor,
      scanDate: scan.scanDate
    };

    cache.set(formattedUrl, { data: responseData, timestamp: Date.now() });
    res.json(responseData);

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Frontend scan results save karo
exports.saveResults = async (req, res) => {
  try {
    const { url, score, critical, moderate, minor, issues } = req.body;

    if (!url) return res.status(400).json({ message: 'URL is required' });

    const scan = await Scan.create({
      userId: req.user.userId,
      url,
      score,
      critical,
      moderate,
      minor,
      issues: issues || []
    });

    res.json({ success: true, scanId: scan._id });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Scan history
exports.getHistory = async (req, res) => {
  try {
    const scans = await Scan.find({ userId: req.user.userId })
      .select('url score critical moderate minor scanDate')
      .sort({ scanDate: -1 })
      .limit(20);

    res.json(scans);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Single scan
exports.getScanById = async (req, res) => {
  try {
    const scan = await Scan.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!scan) return res.status(404).json({ message: 'Scan not found' });

    res.json(scan);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};