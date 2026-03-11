const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  keyword: { type: String, required: true, index: true }, // Indexing makes searching fast
  gmailId: { type: String, unique: true }, // Prevents saving the same email twice
  subject: String,
  from: String,
  date: Date,
  snippet: String
}, { timestamps: true });

module.exports = mongoose.model('Email', emailSchema);