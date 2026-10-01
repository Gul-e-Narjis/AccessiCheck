const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url: { type: String, required: true },
  score: { type: Number },
  critical: { type: Number, default: 0 },
  moderate: { type: Number, default: 0 },
  minor: { type: Number, default: 0 },
  issues: { type: Array, default: [] },
  scanDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scan', scanSchema);