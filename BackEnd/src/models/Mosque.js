const mongoose = require('mongoose');

const mosqueSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String },
    prayer_times: {
        fajr: { type: String },
        dhuhr: { type: String },
        asr: { type: String },
        maghrib: { type: String },
        isha: { type: String },
        jummah: { type: String }
    },
    // Add verification system
    verification_code: {
        type: String,
        required: true,
        unique: true
    },
    verification_code_expires: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    },
    contact_phone: String,
    contact_email: String,
    admin_instructions: {
        type: String,
        default: "To become an admin of this mosque, you need the mosque verification code. Contact the mosque management at the provided phone/email to get the code."
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mosque', mosqueSchema);