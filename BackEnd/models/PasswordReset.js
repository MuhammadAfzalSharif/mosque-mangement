const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const passwordResetSchema = new mongoose.Schema({
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
  code: {
    type: String,
    required: true
  }, // Hashed 6-digit code
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // Automatically delete when code expires (15 min)
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5 // Maximum 5 attempts per reset request
  },
  used: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Rate limiting schema for tracking hourly limits
const rateLimitSchema = new mongoose.Schema({
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
  hourStartTime: {
    type: Date,
    required: true
  },
  hourEndTime: {
    type: Date,
    required: true,
    index: { expires: 0 } // Auto-delete when hour expires
  },
  attemptCount: {
    type: Number,
    default: 0,
    max: 2 // Maximum 2 attempts per hour
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash code before saving
passwordResetSchema.pre('save', async function (next) {
  if (this.isModified('code') && !this.code.startsWith('$2a$') && !this.code.startsWith('$2b$')) {
    this.code = await bcrypt.hash(this.code, 12);
  }
  next();
});

// Instance method to verify code
passwordResetSchema.methods.verifyCode = async function (inputCode) {
  try {
    return await bcrypt.compare(inputCode.toString(), this.code);
  } catch (error) {
    console.error('Code verification error:', error);
    return false;
  }
};

// Static method to cleanup expired codes
passwordResetSchema.statics.cleanupExpired = async function () {
  try {
    const result = await this.deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        { used: true }
      ]
    });
    console.log(`Cleaned up ${result.deletedCount} expired/used reset codes`);
    return result;
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

// Static method to check rate limit and create/update rate limit record
passwordResetSchema.statics.checkRateLimit = async function (email, userType) {
  const now = new Date();

  // Find existing rate limit record for this email and userType
  let rateLimit = await RateLimit.findOne({
    email: email.toLowerCase().trim(),
    userType: userType,
    hourEndTime: { $gt: now }
  });

  if (!rateLimit) {
    // No active rate limit record, create new one
    const hourStartTime = now;
    const hourEndTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

    rateLimit = new RateLimit({
      email: email.toLowerCase().trim(),
      userType: userType,
      hourStartTime: hourStartTime,
      hourEndTime: hourEndTime,
      attemptCount: 1
    });

    await rateLimit.save();
    return { allowed: true, attemptsUsed: 1, attemptsRemaining: 1, canRetryAt: null };
  }

  // Check if limit exceeded
  if (rateLimit.attemptCount >= 2) {
    return {
      allowed: false,
      attemptsUsed: rateLimit.attemptCount,
      attemptsRemaining: 0,
      canRetryAt: rateLimit.hourEndTime
    };
  }

  // Increment attempt count
  rateLimit.attemptCount += 1;
  await rateLimit.save();

  return {
    allowed: true,
    attemptsUsed: rateLimit.attemptCount,
    attemptsRemaining: 2 - rateLimit.attemptCount,
    canRetryAt: rateLimit.hourEndTime
  };
};

// Index for efficient queries
passwordResetSchema.index({ email: 1, userType: 1 });
passwordResetSchema.index({ createdAt: 1 });
rateLimitSchema.index({ email: 1, userType: 1 });

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);
const RateLimit = mongoose.model('PasswordResetRateLimit', rateLimitSchema);

module.exports = PasswordReset;