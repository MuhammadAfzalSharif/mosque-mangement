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
            'admin_removed',
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

// Instance method to get formatted action description in simple English
auditLogSchema.methods.getActionDescription = function () {
    const { action_type, performed_by, target, action_details } = this;
    const userName = performed_by.user_name || 'Unknown User';

    switch (action_type) {
        case 'mosque_created':
            const mosqueName = action_details?.mosque_data?.name || 'a mosque';
            const mosqueLocation = action_details?.mosque_data?.location || 'unknown location';
            return `${userName} created a new mosque called "${mosqueName}" located at ${mosqueLocation}`;

        case 'mosque_deleted':
            const deletedMosqueName = action_details?.mosque_data?.name || 'a mosque';
            const deletedMosqueLocation = action_details?.mosque_data?.location || 'unknown location';
            return `${userName} permanently deleted the mosque "${deletedMosqueName}" from ${deletedMosqueLocation}`;

        case 'mosque_details_updated':
            const updatedMosqueName = action_details?.mosque_data?.name || target.target_name || 'a mosque';
            return `${userName} updated the details of "${updatedMosqueName}" mosque`;

        case 'admin_registered':
            const registeredAdminName = action_details?.admin_data?.name || 'An admin';
            const registeredMosqueName = action_details?.admin_data?.mosque_name || 'a mosque';
            return `${registeredAdminName} applied to become admin for "${registeredMosqueName}"`;

        case 'admin_approved':
            const approvedAdminName = action_details?.admin_data?.name || 'an admin';
            const approvedMosqueName = action_details?.admin_data?.mosque_name || 'a mosque';
            return `${userName} approved ${approvedAdminName} as the admin for "${approvedMosqueName}"`;

        case 'admin_rejected':
            const rejectedAdminName = action_details?.admin_data?.name || 'an admin';
            const rejectedMosqueName = action_details?.admin_data?.mosque_name || 'a mosque';
            const rejectionReason = action_details?.reason || 'no reason provided';
            return `${userName} rejected ${rejectedAdminName}'s application for "${rejectedMosqueName}". Reason: ${rejectionReason}`;

        case 'admin_removed':
            const removedAdminName = action_details?.admin_data?.name || 'an admin';
            const removedFromMosque = action_details?.mosque_data?.mosque_name || action_details?.admin_data?.mosque_name || 'a mosque';
            const removalReason = action_details?.admin_data?.removal_reason || action_details?.reason || 'no reason provided';
            return `${userName} removed ${removedAdminName} from "${removedFromMosque}". Reason: ${removalReason}`;

        case 'verification_code_regenerated':
            const codeRegeneratedMosque = action_details?.mosque_data?.name || target.target_name || 'a mosque';
            const oldCode = action_details?.before_data?.verification_code || 'old code';
            const newCode = action_details?.after_data?.verification_code || action_details?.mosque_data?.verification_code || 'new code';
            return `${userName} generated a new verification code for "${codeRegeneratedMosque}" (changed from ${oldCode} to ${newCode})`;

        case 'prayer_times_updated':
            const prayerMosqueName = action_details?.mosque_data?.name || target.target_name || 'a mosque';
            return `${userName} updated the prayer times for "${prayerMosqueName}"`;

        case 'admin_login':
            return `${userName} successfully logged in as Admin`;

        case 'superadmin_login':
            return `${userName} successfully logged in as Super Admin`;

        default:
            const targetName = target?.target_name || 'an item';
            const actionName = action_type.replace(/_/g, ' ');
            return `${userName} performed "${actionName}" on ${targetName}`;
    }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);