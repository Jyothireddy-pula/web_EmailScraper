const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    user: {type: String, default: 'rwc.iraaditi@gmail.com'},
    access_token: {type: String, required:true },
    refresh_token: {type: String },
    scope: { type: String },
    token_type: { type: String },
    expiry_date: { type: Number }
}, { timestamps: true});

module.exports = mongoose.model('Token', tokenSchema);