import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true, unique: true }, // Pakistani phone number format +923xxxxxxxxx
    mosque_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Mosque', default: null }, // Nullable when rejected, mosque deleted, or admin removed
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'mosque_deleted', 'admin_removed', 'code_regenerated'], default: 'pending' },
    verification_code_used: { type: String, default: null }, // Track which verification code was used, null when rejected, mosque deleted, or admin removed
    application_notes: String, // Additional notes from applicant
    super_admin_notes: String, // Notes from super admin during review
    approved_at: { type: Date }, // When the admin was approved
    rejected_at: { type: Date }, // When the admin was rejected

    // Rejection handling fields
    rejection_reason: { type: String, default: null }, // Detailed reason for rejection
    rejection_date: { type: Date, default: null }, // When the admin was rejected
    rejected_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }, // Super admin who rejected
    rejection_count: { type: Number, default: 0 }, // How many times this admin has been rejected
    can_reapply: { type: Boolean, default: false }, // Whether admin is allowed to reapply
    previous_mosque_ids: [{
        mosque_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Mosque' },
        rejected_at: { type: Date },
        rejection_reason: String
    }], // Track all mosques this admin was rejected from

    // Mosque deletion handling fields
    mosque_deletion_reason: { type: String, default: null }, // Reason why mosque was deleted
    mosque_deletion_date: { type: Date, default: null }, // When the mosque was deleted
    deleted_mosque_name: { type: String, default: null }, // Store deleted mosque name for reference
    deleted_mosque_location: { type: String, default: null }, // Store deleted mosque location for reference

    // Admin removal handling fields
    admin_removal_reason: { type: String, default: null }, // Reason why admin was removed
    admin_removal_date: { type: Date, default: null }, // When the admin was removed
    removed_from_mosque_name: { type: String, default: null }, // Store mosque name admin was removed from
    removed_from_mosque_location: { type: String, default: null }, // Store mosque location for reference
    removed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin', default: null }, // Super admin who removed this admin

    // Code regeneration handling fields
    code_regeneration_reason: { type: String, default: null }, // Reason why mosque code was regenerated
    code_regeneration_date: { type: Date, default: null }, // When the mosque code was regenerated
    code_regenerated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin', default: null }, // Super admin who regenerated the code
    previous_mosque_code: { type: String, default: null }, // Store previous mosque code for reference
    code_regenerated_mosque_name: { type: String, default: null }, // Store mosque name where code was regenerated
    code_regenerated_mosque_location: { type: String, default: null }, // Store mosque location for reference

    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Admin', adminSchema);