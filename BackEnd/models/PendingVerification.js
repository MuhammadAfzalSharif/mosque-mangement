import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const pendingVerificationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    userType: {
        type: String,
        enum: ['admin', 'superadmin'],
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: function () { return this.userType === 'admin'; },
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    mosque_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Mosque',
        required: function () { return this.userType === 'admin'; }
    },
    mosque_verification_code: {
        type: String,
        required: function () { return this.userType === 'admin'; }
    }, // The mosque verification code used during registration
    verification_code: {
        type: String,
        required: true
    }, // Hashed 6-digit email verification code
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // Auto-delete when code expires (15 min)
    },
    application_notes: {
        type: String,
        trim: true,
        maxlength: 500
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Hash verification code before saving
pendingVerificationSchema.pre('save', async function (next) {
    if (this.isModified('verification_code') && !this.verification_code.startsWith('$2a$') && !this.verification_code.startsWith('$2b$')) {
        this.verification_code = await bcrypt.hash(this.verification_code, 12);
    }
    next();
});

// Instance method to verify code
pendingVerificationSchema.methods.verifyCode = async function (inputCode) {
    try {
        return await bcrypt.compare(inputCode.toString(), this.verification_code);
    } catch (error) {
        console.error('Code verification error:', error);
        return false;
    }
};

export default mongoose.model('PendingVerification', pendingVerificationSchema);