const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    // Action details
    action_type: {
        type: String,
        required: true,
        enum: [
            'mosque_created',
            'mosque_updated',
            'mosque_deleted',
            'admin_registered',
            'admin_approved',
            'admin_rejected',
            'admin_login',
            'superadmin_login',
            'verification_code_generated',
            'verification_code_regenerated',
            'prayer_times_updated',
            'mosque_details_updated'
        ]
    },

    // Who performed the action
    performed_by: {
        user_id: { type: mongoose.Schema.Types.ObjectId },
        user_type: { type: String, enum: ['admin', 'super_admin', 'system'] },
        user_email: String,
        user_name: String
    },

    // Target of the action (mosque, admin, etc.)
    target: {
        target_type: { type: String, enum: ['mosque', 'admin', 'verification_code', 'prayer_times'] },
        target_id: mongoose.Schema.Types.ObjectId,
        target_name: String
    },

    // Detailed data about what happened
    action_details: {
        // For mosque operations
        mosque_data: {
            name: String,
            location: String,
            description: String,
            contact_phone: String,
            contact_email: String,
            admin_instructions: String,
            verification_code: String,
            verification_code_expires: Date
        },

        // For admin operations
        admin_data: {
            name: String,
            email: String,
            phone: String,
            status: String,
            mosque_id: mongoose.Schema.Types.ObjectId,
            mosque_name: String,
            mosque_location: String,
            verification_code_used: String,
            application_notes: String,
            super_admin_notes: String
        },

        // For prayer times
        prayer_times: {
            fajr: String,
            dhuhr: String,
            asr: String,
            maghrib: String,
            isha: String,
            jummah: String
        },

        // Before and after data for updates
        before_data: mongoose.Schema.Types.Mixed,
        after_data: mongoose.Schema.Types.Mixed,

        // Additional context
        reason: String,
        notes: String,
        ip_address: String,
        user_agent: String
    },

    // Metadata
    timestamp: { type: Date, default: Date.now },
    status: { type: String, enum: ['success', 'failed', 'pending'], default: 'success' },
    error_message: String,

    // For linking related actions
    related_audit_id: mongoose.Schema.Types.ObjectId,
    session_id: String
});

// Indexes for better query performance
auditLogSchema.index({ action_type: 1, timestamp: -1 });
auditLogSchema.index({ 'performed_by.user_id': 1, timestamp: -1 });
auditLogSchema.index({ 'target.target_id': 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

// Static method to create audit log entry
auditLogSchema.statics.logAction = async function (actionData) {
    try {
        const auditEntry = new this(actionData);
        await auditEntry.save();
        return auditEntry;
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw error to prevent breaking main functionality
        return null;
    }
};

// Instance method to get formatted action description
auditLogSchema.methods.getActionDescription = function () {
    const { action_type, performed_by, target, action_details } = this;

    switch (action_type) {
        case 'mosque_created':
            return `${performed_by.user_name} created mosque "${action_details.mosque_data.name}" at ${action_details.mosque_data.location}`;
        case 'mosque_deleted':
            return `${performed_by.user_name} deleted mosque "${action_details.mosque_data.name}" at ${action_details.mosque_data.location}`;
        case 'admin_approved':
            return `${performed_by.user_name} approved admin "${action_details.admin_data.name}" for mosque "${action_details.admin_data.mosque_name}"`;
        case 'admin_rejected':
            return `${performed_by.user_name} rejected admin application for "${action_details.admin_data.name}" for mosque "${action_details.admin_data.mosque_name}"`;
        case 'verification_code_regenerated':
            return `${performed_by.user_name} regenerated verification code for mosque "${action_details.mosque_data.name}"`;
        default:
            return `${performed_by.user_name} performed ${action_type} on ${target.target_type}`;
    }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);