const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    mosque_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Mosque' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    verification_code_used: String, // Track which verification code was used
    application_notes: String, // Additional notes from applicant
    super_admin_notes: String, // Notes from super admin during review
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Admin', adminSchema);