import express from 'express';
import Admin from '../models/Admin.js';
import SuperAdmin from '../models/SuperAdmin.js';
import Mosque from '../models/Mosque.js';
import AuditLog from '../models/AuditLog.js';
import { auth, requireSuperAdmin } from '../middleware/auth.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import AuditLogger from '../utils/auditLogger.js';
import {
    validateEmail,
    validatePhone,
    validatePassword,
    validateName,
    validateApplicationNotes,
    sanitizeEmail,
    sanitizeString
} from '../utils/validators.js';

const router = express.Router();

// Dashboard Stats
router.get('/dashboard/stats', auth, requireSuperAdmin, async (req, res) => {
    try {
        const totalMosques = await Mosque.countDocuments();

        // Only count approved admins whose mosques still exist
        const approvedAdmins = await Admin.find({ status: 'approved' }).populate('mosque_id');
        const approvedMosques = approvedAdmins.filter(admin => admin.mosque_id && admin.mosque_id._id).length;

        const pendingMosques = await Admin.countDocuments({ status: 'pending' });
        const rejectedMosques = await Admin.countDocuments({ status: 'rejected' });
        const mosqueDeletedAdmins = await Admin.countDocuments({ status: 'mosque_deleted' });
        const adminRemovedAdmins = await Admin.countDocuments({ status: 'admin_removed' });
        const codeRegeneratedAdmins = await Admin.countDocuments({ status: 'code_regenerated' });
        const totalSuperAdmins = await SuperAdmin.countDocuments();
        const totalAuditLogs = await AuditLog.countDocuments();

        res.json({
            stats: {
                total_mosques: totalMosques,
                approved_mosques: approvedMosques,
                pending_requests: pendingMosques,
                rejected_requests: rejectedMosques,
                mosque_deleted_admins: mosqueDeletedAdmins,
                admin_removed_admins: adminRemovedAdmins,
                code_regenerated_admins: codeRegeneratedAdmins,
                total_super_admins: totalSuperAdmins,
                total_audit_logs: totalAuditLogs
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Approve Mosque Admin with notes
router.put('/:id/approve', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { super_admin_notes } = req.body;

        const admin = await Admin.findByIdAndUpdate(
            req.params.id,
            {
                status: 'approved',
                super_admin_notes: super_admin_notes || 'Approved by super admin',
                approved_at: new Date()
            },
            { new: true }
        ).populate('mosque_id', 'name location');

        if (!admin) return res.status(404).json({ error: 'Admin not found' });

        // Log the admin approval
        const auditLogger = new AuditLogger(req);
        await auditLogger.logAdminApproved(admin, admin.mosque_id, super_admin_notes);

        res.json({
            message: 'Super admin approve mosque request by admin and assigned a mosque to admin successfully',

            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                phone: admin.phone,
                status: admin.status,
                mosque: admin.mosque_id
            }
        });
    } catch (err) {
        // Log the error
        try {
            const auditLogger = new AuditLogger(req);
            await auditLogger.logError({
                action: 'approve_admin',
                error: err,
                errorMessage: err.message,
                statusCode: 500,
                endpoint: `/superadmin/${req.params.id}/approve`,
                method: 'PUT'
            });
        } catch (auditError) {
            console.error('Failed to log error (non-critical):', auditError);
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Reject Mosque Admin - UPDATED (Don't delete, just update status)
router.put('/:id/reject', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { reason } = req.body;

        // Validation
        if (!reason || reason.trim().length < 10) {
            return res.status(400).json({
                error: 'Rejection reason must be at least 10 characters long',
                code: 'INVALID_REASON'
            });
        }

        // Find admin with populated mosque data
        const admin = await Admin.findById(req.params.id).populate('mosque_id');

        if (!admin) {
            return res.status(404).json({
                error: 'Admin application not found',
                code: 'ADMIN_NOT_FOUND'
            });
        }

        // Check if already rejected
        if (admin.status === 'rejected') {
            return res.status(400).json({
                error: 'This admin has already been rejected',
                code: 'ALREADY_REJECTED'
            });
        }

        // Store mosque details before modification
        const mosqueDetails = admin.mosque_id ? {
            id: admin.mosque_id._id,
            name: admin.mosque_id.name,
            location: admin.mosque_id.location
        } : null;

        // Add current mosque to previous_mosque_ids array (if exists)
        if (admin.mosque_id) {
            admin.previous_mosque_ids.push({
                mosque_id: admin.mosque_id._id,
                rejected_at: new Date(),
                rejection_reason: reason.trim()
            });
        }

        // Update admin status to rejected (DON'T DELETE)
        admin.status = 'rejected';
        admin.rejection_reason = reason.trim();
        admin.rejection_date = new Date();
        admin.rejected_by = req.user.id;
        admin.rejection_count += 1;
        admin.mosque_id = null; // Remove mosque association
        admin.verification_code_used = null; // Clear verification code
        admin.can_reapply = false; // Default: cannot reapply
        admin.rejected_at = new Date(); // Set rejection timestamp

        // Auto-ban if rejected 3+ times
        if (admin.rejection_count >= 3) {
            admin.can_reapply = false;
        }

        await admin.save();

        // If there was a mosque, regenerate its verification code
        let newVerificationCode = null;
        if (mosqueDetails) {
            const oldCode = mosqueDetails.verification_code || 'unknown';
            newVerificationCode = crypto.randomBytes(8).toString('hex').toUpperCase();
            const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            await Mosque.findByIdAndUpdate(
                mosqueDetails.id,
                {
                    verification_code: newVerificationCode,
                    verification_code_expires: expiryDate
                }
            );

            // Log the verification code regeneration
            try {
                const auditLogger = new AuditLogger(req);
                const mosque = await Mosque.findById(mosqueDetails.id);
                await auditLogger.logVerificationCodeRegenerated(mosque, oldCode, newVerificationCode, admin);
            } catch (auditError) {
                console.error('Failed to log verification code regeneration (non-critical):', auditError);
            }
        }

        // Audit log
        const auditLogger = new AuditLogger(req);
        await auditLogger.logAdminRejected(admin, mosqueDetails, reason.trim());

        res.json({
            success: true,
            message: 'Admin application rejected successfully. Admin account retained with rejected status.',
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                phone: admin.phone,
                status: admin.status,
                rejection_reason: admin.rejection_reason,
                rejection_date: admin.rejection_date,
                rejection_count: admin.rejection_count,
                can_reapply: admin.can_reapply
            },
            mosque: mosqueDetails ? {
                ...mosqueDetails,
                new_verification_code: newVerificationCode,
                message: 'Mosque verification code has been regenerated'
            } : null
        });

    } catch (error) {
        console.error('Error rejecting admin:', error);

        // Log the error
        try {
            const auditLogger = new AuditLogger(req);
            await auditLogger.logError({
                action: 'reject_admin',
                error: error,
                errorMessage: error.message,
                statusCode: 500,
                endpoint: `/superadmin/${req.params.id}/reject`,
                method: 'PUT'
            });
        } catch (auditError) {
            console.error('Failed to log error (non-critical):', auditError);
        }

        res.status(500).json({
            error: 'Server error during rejection process',
            code: 'SERVER_ERROR'
        });
    }
});

// Remove Admin from Mosque - UPDATED (Don't delete, just update status to admin_removed)
router.put('/admin/:id/remove', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { removal_reason } = req.body;

        // Validation
        if (!removal_reason || removal_reason.trim().length < 10) {
            return res.status(400).json({
                error: 'Removal reason must be at least 10 characters long',
                code: 'INVALID_REASON'
            });
        }

        // Find admin with populated mosque data
        const admin = await Admin.findById(req.params.id).populate('mosque_id');

        if (!admin) {
            return res.status(404).json({
                error: 'Admin not found',
                code: 'ADMIN_NOT_FOUND'
            });
        }

        // Check if admin is approved (only approved admins can be removed)
        if (admin.status !== 'approved') {
            return res.status(400).json({
                error: 'Only approved admins can be removed from their mosques',
                code: 'NOT_APPROVED'
            });
        }

        // Store mosque details before modification
        const mosqueDetails = admin.mosque_id ? {
            id: admin.mosque_id._id,
            name: admin.mosque_id.name,
            location: admin.mosque_id.location
        } : null;

        if (!mosqueDetails) {
            return res.status(400).json({
                error: 'Admin has no associated mosque',
                code: 'NO_MOSQUE'
            });
        }

        // Update admin status to admin_removed (DON'T DELETE)
        admin.status = 'admin_removed';
        admin.admin_removal_reason = removal_reason.trim();
        admin.admin_removal_date = new Date();
        admin.removed_from_mosque_name = mosqueDetails.name;
        admin.removed_from_mosque_location = mosqueDetails.location;
        admin.removed_by = req.user.id;
        admin.mosque_id = null; // Remove mosque association
        admin.can_reapply = true; // Allow reapplication

        await admin.save();

        // Regenerate mosque verification code so someone else can apply
        const oldCode = mosqueDetails.verification_code || 'unknown';
        const newVerificationCode = crypto.randomBytes(8).toString('hex').toUpperCase();
        const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await Mosque.findByIdAndUpdate(
            mosqueDetails.id,
            {
                verification_code: newVerificationCode,
                verification_code_expires: expiryDate
            }
        );

        // Log the verification code regeneration
        try {
            const auditLogger = new AuditLogger(req);
            const mosque = await Mosque.findById(mosqueDetails.id);
            await auditLogger.logVerificationCodeRegenerated(mosque, oldCode, newVerificationCode, admin);
        } catch (auditError) {
            console.error('Failed to log verification code regeneration (non-critical):', auditError);
        }

        // Audit log
        const auditLogger = new AuditLogger(req);
        await auditLogger.logAdminRemoved(admin, mosqueDetails, removal_reason.trim());

        res.json({
            success: true,
            message: 'Admin removed from mosque successfully. Admin account retained with admin_removed status.',
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                phone: admin.phone,
                status: admin.status,
                admin_removal_reason: admin.admin_removal_reason,
                admin_removal_date: admin.admin_removal_date,
                removed_from_mosque_name: admin.removed_from_mosque_name,
                removed_from_mosque_location: admin.removed_from_mosque_location,
                can_reapply: admin.can_reapply
            },
            mosque: {
                ...mosqueDetails,
                new_verification_code: newVerificationCode,
                message: 'Mosque verification code has been regenerated'
            }
        });

    } catch (error) {
        console.error('Error removing admin:', error);

        // Log the error
        try {
            const auditLogger = new AuditLogger(req);
            await auditLogger.logError({
                action: 'remove_admin',
                error: error,
                errorMessage: error.message,
                statusCode: 500,
                endpoint: `/superadmin/admin/${req.params.id}/remove`,
                method: 'PUT'
            });
        } catch (auditError) {
            console.error('Failed to log error (non-critical):', auditError);
        }

        res.status(500).json({
            error: 'Server error during admin removal process',
            code: 'SERVER_ERROR'
        });
    }
});


// Generate new verification code for mosque
router.put('/mosque/:id/regenerate-code', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { expiry_days = 30 } = req.body;

        const newCode = crypto.randomBytes(8).toString('hex').toUpperCase();
        const expiryDate = new Date(Date.now() + expiry_days * 24 * 60 * 60 * 1000);

        const mosque = await Mosque.findByIdAndUpdate(
            req.params.id,
            {
                verification_code: newCode,
                verification_code_expires: expiryDate
            },
            { new: true }
        );

        if (!mosque) {
            return res.status(404).json({ error: 'Mosque not found' });
        }

        const mosque_admin = await Admin.findOneAndDelete({ mosque_id: req.params.id });

        // Log the verification code regeneration (single mosque)
        const auditLogger = new AuditLogger(req);
        await auditLogger.logCodeRegenerated(mosque, 'old_code', newCode, new Date(Date.now() + expiry_days * 24 * 60 * 60 * 1000));

        if (mosque_admin) {
            return res.json({
                message: 'Verification code regenerated successfully and Mosque admin removed register again for mosque managment ',
                mosque: {
                    id: mosque._id,
                    name: mosque.name,
                    verification_code: newCode,
                    expires_at: expiryDate
                },
                adminRemove: {
                    name: mosque_admin.name,
                    email: mosque_admin.email,
                    phone: mosque_admin.phone,
                    verification_code_used: mosque_admin.verification_code_used

                }
            });
        }


        return res.json({
            message: 'Verification code regenerated successfully  ',
            mosque: {
                id: mosque._id,
                name: mosque.name,
                verification_code: newCode,
                expires_at: expiryDate
            }

        });




    } catch (err) {
        // Log the error
        try {
            const auditLogger = new AuditLogger(req);
            await auditLogger.logError({
                action: 'regenerate_verification_code',
                error: err,
                errorMessage: err.message,
                statusCode: 500,
                endpoint: `/superadmin/mosque/${req.params.id}/regenerate-code`,
                method: 'PUT'
            });
        } catch (auditError) {
            console.error('Failed to log error (non-critical):', auditError);
        }
        res.status(500).json({ error: 'Server error' });
    }
});


// List Pending Admins with verification details
router.get('/pending', auth, requireSuperAdmin, async (req, res) => {
    try {
        const pendingAdmins = await Admin.find({ status: 'pending' })
            .populate('mosque_id', 'name location verification_code')
            .sort({ createdAt: -1 });

        const adminDetails = pendingAdmins.map(admin => ({
            ...admin.toObject(),
            verification_status: admin.verification_code_used === admin.mosque_id?.verification_code ? 'valid' : 'invalid'
        }));

        res.json({ pending_admins: adminDetails });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

//list approved admins with verified details
router.get('/approved', auth, requireSuperAdmin, async (req, res) => {
    try {
        const approvedAdmins = await Admin.find({ status: 'approved' })
            .populate('mosque_id', 'name location verification_code')
            .sort({ approved_at: -1, createdAt: -1 }); // Sort by approved_at first, then createdAt as fallback

        // Filter out admins whose mosques have been deleted
        const validApprovedAdmins = approvedAdmins.filter(admin => admin.mosque_id && admin.mosque_id._id);

        // Debug: Log the raw data to see what's actually in the database
        console.log('Raw approved admins data:');
        validApprovedAdmins.forEach(admin => {
            console.log(`Admin ${admin.name}:`, {
                createdAt: admin.createdAt,
                approved_at: admin.approved_at,
                status: admin.status,
                mosque_id: admin.mosque_id
            });
        });

        const adminDetails = validApprovedAdmins.map(admin => ({
            ...admin.toObject(),
            verification_status: admin.verification_code_used === admin.mosque_id?.verification_code ? 'valid' : 'invalid'
        }));

        res.json({ approved_admins: adminDetails });
    } catch (err) {
        console.error('Error fetching approved admins:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// List All Admins (for mosque assignment)
router.get('/', auth, requireSuperAdmin, async (req, res) => {
    try {
        const admins = await Admin.find().populate('mosque_id', 'name location');
        res.json({ admins });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});



// View mosque verification details
router.get('/mosque/:id/verification', auth, requireSuperAdmin, async (req, res) => {
    try {
        const mosque = await Mosque.findById(req.params.id);
        if (!mosque) {
            return res.status(404).json({ error: 'Mosque not found' });
        }

        // Get admins who used this mosque's verification codes
        const adminsWithCodes = await Admin.find({
            mosque_id: req.params.id
        }).select('name email phone verification_code_used status createdAt');

        res.json({
            mosque: {
                id: mosque._id,
                name: mosque.name,
                location: mosque.location,
                description: mosque.description,
                contact_phone: mosque.contact_phone,
                contact_email: mosque.contact_email,
                admin_instructions: mosque.admin_instructions,
                verification_code: mosque.verification_code,
                code_expires: mosque.verification_code_expires,
                code_expired: new Date() > mosque.verification_code_expires,
                prayer_times: mosque.prayer_times || {
                    fajr: '',
                    dhuhr: '',
                    asr: '',
                    maghrib: '',
                    isha: '',
                    jummah: ''
                }
            },
            admin_applications: adminsWithCodes
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// updating mosque detail 

router.put('/mosque/:id', auth, requireSuperAdmin, async (req, res) => {
    try {
        // Super admin can update any mosque, so remove the authorization check
        const {
            name,
            location,
            description,
            contact_phone,
            contact_email,
            admin_instructions,
            prayer_times
        } = req.body;

        // Validate name if provided
        if (name !== undefined) {
            if (name.trim().length < 3) {
                return res.status(400).json({
                    error: 'Mosque name must be at least 3 characters long',
                    code: 'INVALID_NAME_LENGTH'
                });
            }

            if (name.trim().length > 100) {
                return res.status(400).json({
                    error: 'Mosque name must not exceed 100 characters',
                    code: 'INVALID_NAME_LENGTH'
                });
            }

            // Validate name format
            const nameRegex = /^[a-zA-Z0-9\s\-']+$/;
            if (!nameRegex.test(name.trim())) {
                return res.status(400).json({
                    error: 'Mosque name can only contain letters, numbers, spaces, hyphens and apostrophes',
                    code: 'INVALID_NAME_FORMAT'
                });
            }
        }

        // Validate location if provided
        if (location !== undefined) {
            if (location.trim().length < 5) {
                return res.status(400).json({
                    error: 'Location must be at least 5 characters long',
                    code: 'INVALID_LOCATION_LENGTH'
                });
            }

            if (location.trim().length > 200) {
                return res.status(400).json({
                    error: 'Location must not exceed 200 characters',
                    code: 'INVALID_LOCATION_LENGTH'
                });
            }
        }

        // Validate description if provided
        if (description !== undefined && description.trim().length > 1000) {
            return res.status(400).json({
                error: 'Description must not exceed 1000 characters',
                code: 'INVALID_DESCRIPTION_LENGTH'
            });
        }

        // Validate admin instructions if provided
        if (admin_instructions !== undefined && admin_instructions.trim().length > 500) {
            return res.status(400).json({
                error: 'Admin instructions must not exceed 500 characters',
                code: 'INVALID_INSTRUCTIONS_LENGTH'
            });
        }

        // Validate contact email if provided
        if (contact_email !== undefined && contact_email.trim()) {
            const allowedEmailDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com', 'protonmail.com'];
            const emailDomainRegex = new RegExp(`^[a-zA-Z0-9._%+-]+@(${allowedEmailDomains.join('|').replace(/\./g, '\\.')})$`, 'i');

            if (!emailDomainRegex.test(contact_email.trim())) {
                return res.status(400).json({
                    error: `Email must be from one of these providers: ${allowedEmailDomains.join(', ')}`,
                    code: 'INVALID_EMAIL_DOMAIN'
                });
            }
        }

        // Validate contact phone if provided
        if (contact_phone !== undefined && contact_phone.trim()) {
            const phoneRegex = /^\+923[0-9]{9}$/;
            if (!phoneRegex.test(contact_phone.trim())) {
                return res.status(400).json({
                    error: 'Phone number must be in format +923xxxxxxxxx (e.g., +923001234567)',
                    code: 'INVALID_PHONE_FORMAT'
                });
            }
        }

        // Build update object only with provided fields (with trimming)
        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (location !== undefined) updateData.location = location.trim();
        if (description !== undefined) updateData.description = description.trim();
        if (contact_phone !== undefined) updateData.contact_phone = contact_phone.trim();
        if (contact_email !== undefined) updateData.contact_email = contact_email.trim().toLowerCase();
        if (admin_instructions !== undefined) updateData.admin_instructions = admin_instructions.trim();

        // Handle prayer times update
        if (prayer_times !== undefined) {
            updateData.prayer_times = {};
            if (prayer_times.fajr !== undefined) updateData.prayer_times.fajr = prayer_times.fajr;
            if (prayer_times.dhuhr !== undefined) updateData.prayer_times.dhuhr = prayer_times.dhuhr;
            if (prayer_times.asr !== undefined) updateData.prayer_times.asr = prayer_times.asr;
            if (prayer_times.maghrib !== undefined) updateData.prayer_times.maghrib = prayer_times.maghrib;
            if (prayer_times.isha !== undefined) updateData.prayer_times.isha = prayer_times.isha;
            if (prayer_times.jummah !== undefined) updateData.prayer_times.jummah = prayer_times.jummah;
        }

        // Get current mosque data for audit logging
        const currentMosque = await Mosque.findById(req.params.id);
        if (!currentMosque) {
            return res.status(404).json({
                error: 'Mosque not found',
                code: 'MOSQUE_NOT_FOUND'
            });
        }

        // Store old data for audit
        const beforeData = {
            name: currentMosque.name,
            location: currentMosque.location,
            description: currentMosque.description,
            contact_phone: currentMosque.contact_phone,
            contact_email: currentMosque.contact_email,
            admin_instructions: currentMosque.admin_instructions,
            prayer_times: currentMosque.prayer_times
        };

        const mosque = await Mosque.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!mosque) {
            return res.status(404).json({
                error: 'Mosque not found',
                code: 'MOSQUE_NOT_FOUND'
            });
        }

        // Log the mosque update - separate logs for prayer times and details
        try {
            const auditLogger = new AuditLogger(req);

            // If prayer times were updated, log separately
            if (prayer_times !== undefined) {
                await auditLogger.logPrayerTimesUpdated(
                    mosque,
                    beforeData.prayer_times,
                    mosque.prayer_times
                );
            }

            // If other details were updated, log them
            const detailsUpdated = name !== undefined || location !== undefined ||
                description !== undefined || contact_phone !== undefined ||
                contact_email !== undefined || admin_instructions !== undefined;

            if (detailsUpdated) {
                const afterData = {
                    name: mosque.name,
                    location: mosque.location,
                    description: mosque.description,
                    contact_phone: mosque.contact_phone,
                    contact_email: mosque.contact_email,
                    admin_instructions: mosque.admin_instructions
                };
                await auditLogger.logMosqueDetailsUpdated(mosque, beforeData, afterData);
            }
        } catch (auditError) {
            console.error('Failed to log mosque update (non-critical):', auditError);
        }

        res.json({
            message: 'Mosque details updated successfully',
            mosque,
            updated_fields: Object.keys(updateData)
        });
    } catch (error) {
        console.error('Error updating mosque:', error);

        // Log the error
        try {
            const auditLogger = new AuditLogger(req);
            await auditLogger.logError({
                action: 'update_mosque',
                error: error,
                errorMessage: error.message,
                statusCode: error.code === 11000 ? 409 : (error.name === 'ValidationError' ? 400 : 500),
                endpoint: `/superadmin/mosque/${req.params.id}`,
                method: 'PUT'
            });
        } catch (auditError) {
            console.error('Failed to log error (non-critical):', auditError);
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(409).json({
                error: 'A mosque with this information already exists',
                code: 'DUPLICATE_ENTRY'
            });
        }

        // Handle validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: error.message,
                code: 'VALIDATION_ERROR'
            });
        }

        res.status(500).json({
            error: 'Server error while updating mosque',
            code: 'SERVER_ERROR'
        });
    }
});



// Check expiring verification codes
router.get('/mosque/expiring-codes', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { days_ahead = 7 } = req.query; // Check codes expiring in next 7 days
        const checkDate = new Date(Date.now() + days_ahead * 24 * 60 * 60 * 1000);

        const expiringMosques = await Mosque.find({
            verification_code_expires: { $lte: checkDate }
        }).select('name location verification_code verification_code_expires contact_phone contact_email');

        const expiredMosques = expiringMosques.filter(mosque =>
            new Date() > mosque.verification_code_expires
        );

        const soonToExpire = expiringMosques.filter(mosque =>
            new Date() <= mosque.verification_code_expires && mosque.verification_code_expires <= checkDate
        );

        res.json({
            summary: {
                total_expiring: expiringMosques.length,
                already_expired: expiredMosques.length,
                expiring_soon: soonToExpire.length
            },
            expired_mosques: expiredMosques.map(mosque => ({
                id: mosque._id,
                name: mosque.name,
                location: mosque.location,
                expired_date: mosque.verification_code_expires,
                days_expired: Math.floor((new Date() - mosque.verification_code_expires) / (1000 * 60 * 60 * 24))
            })),
            expiring_soon: soonToExpire.map(mosque => ({
                id: mosque._id,
                name: mosque.name,
                location: mosque.location,
                expires_date: mosque.verification_code_expires,
                days_remaining: Math.floor((mosque.verification_code_expires - new Date()) / (1000 * 60 * 60 * 24))
            }))
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Bulk regenerate expired codes
router.put('/mosque/regenerate-expired-codes', auth, requireSuperAdmin, async (req, res) => {
    try {
        const expiredMosques = await Mosque.find({
            verification_code_expires: { $lt: new Date() }
        });

        const updates = [];
        const auditLogger = new AuditLogger(req);

        for (let mosque of expiredMosques) {
            const oldCode = mosque.verification_code;
            const newCode = crypto.randomBytes(8).toString('hex').toUpperCase();
            const newExpiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            await Mosque.findByIdAndUpdate(mosque._id, {
                verification_code: newCode,
                verification_code_expires: newExpiryDate
            });

            // Log each code regeneration
            try {
                const updatedMosque = await Mosque.findById(mosque._id);
                await auditLogger.logVerificationCodeRegenerated(updatedMosque, oldCode, newCode, null);
            } catch (auditError) {
                console.error('Failed to log bulk code regeneration (non-critical):', auditError);
            }

            updates.push({
                mosque_id: mosque._id,
                mosque_name: mosque.name,
                old_code: oldCode,
                new_code: newCode,
                new_expiry: newExpiryDate
            });
        }

        res.json({
            message: `Successfully regenerated codes for ${updates.length} expired mosques`,
            updated_mosques: updates
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all mosques with registration details
router.get('/mosques/registration', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { search, sort = 'name', page = 1, limit = 10 } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { name: new RegExp(search, 'i') },
                { location: new RegExp(search, 'i') }
            ];
        }

        const sortOptions = {};
        sortOptions[sort] = 1;

        const mosques = await Mosque.find(query)
            .sort(sortOptions)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Mosque.countDocuments(query);

        // Get admin info for each mosque
        const mosquesWithAdmins = await Promise.all(
            mosques.map(async (mosque) => {
                const admin = await Admin.findOne({
                    mosque_id: mosque._id,
                    status: 'approved'
                }).select('name email phone');

                return {
                    id: mosque._id,
                    name: mosque.name,
                    location: mosque.location,
                    description: mosque.description,
                    contact_phone: mosque.contact_phone,
                    contact_email: mosque.contact_email,
                    admin_instructions: mosque.admin_instructions,
                    verification_code: mosque.verification_code,
                    verification_code_expires: mosque.verification_code_expires,
                    admin: admin ? {
                        name: admin.name,
                        email: admin.email,
                        phone: admin.phone
                    } : null,
                    createdAt: mosque.createdAt
                };
            })
        );

        res.json({
            mosques: mosquesWithAdmins,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get approved and rejected requests with filtering
router.get('/requests/history', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { status, search, sort = 'createdAt', page = 1, limit = 10 } = req.query;
        const query = {};

        if (status && ['approved', 'rejected'].includes(status)) {
            query.status = status;
        } else {
            query.status = { $in: ['approved', 'rejected'] };
        }

        let admins = await Admin.find(query)
            .populate('mosque_id', 'name location')
            .sort({ [sort]: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        if (search) {
            admins = admins.filter(admin =>
                admin.name.toLowerCase().includes(search.toLowerCase()) ||
                admin.email.toLowerCase().includes(search.toLowerCase()) ||
                admin.mosque_id?.name.toLowerCase().includes(search.toLowerCase()) ||
                admin.mosque_id?.location.toLowerCase().includes(search.toLowerCase())
            );
        }

        const total = await Admin.countDocuments(query);

        const adminDetails = admins.map(admin => ({
            id: admin._id,
            name: admin.name,
            email: admin.email,
            phone: admin.phone,
            status: admin.status,
            mosque: admin.mosque_id ? {
                id: admin.mosque_id._id,
                name: admin.mosque_id.name,
                location: admin.mosque_id.location
            } : null,
            application_notes: admin.application_notes,
            super_admin_notes: admin.super_admin_notes,
            verification_code_used: admin.verification_code_used,
            createdAt: admin.createdAt
        }));

        res.json({
            requests: adminDetails,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get audit logs for dashboard
router.get('/audit-logs', auth, requireSuperAdmin, async (req, res) => {
    try {
        const {
            action_type,
            user_type,
            target_type,
            page = 1,
            limit = 20,
            start_date,
            end_date,
            search,
            sort_by = 'timestamp',
            sort_order = 'desc'
        } = req.query;

        const query = {};

        // Filter by action type
        if (action_type) {
            query.action_type = action_type;
        }

        // Filter by user type
        if (user_type) {
            query['performed_by.user_type'] = user_type;
        }

        // Filter by target type
        if (target_type) {
            query['target.target_type'] = target_type;
        }

        // Filter by date range
        if (start_date || end_date) {
            query.timestamp = {};
            if (start_date) {
                query.timestamp.$gte = new Date(start_date);
            }
            if (end_date) {
                query.timestamp.$lte = new Date(end_date);
            }
        }

        // Search functionality
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            query.$or = [
                { 'performed_by.user_name': searchRegex },
                { 'performed_by.user_email': searchRegex },
                { 'target.target_name': searchRegex },
                { action_type: searchRegex },
                { description: searchRegex },
                { 'action_details.mosque_data.name': searchRegex },
                { 'action_details.mosque_data.location': searchRegex },
                { 'action_details.admin_data.name': searchRegex },
                { 'action_details.admin_data.email': searchRegex },
                { 'action_details.admin_data.mosque_name': searchRegex },
                { 'action_details.super_admin_data.name': searchRegex },
                { 'action_details.super_admin_data.email': searchRegex },
                { 'action_details.notes': searchRegex },
                { 'action_details.reason': searchRegex }
            ];
        }

        // Build sort object
        const sortOptions = {};
        sortOptions[sort_by] = sort_order === 'asc' ? 1 : -1;

        const auditLogs = await AuditLog.find(query)
            .sort(sortOptions)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await AuditLog.countDocuments(query);

        // Get audit log summaries
        const logsWithDescriptions = auditLogs.map(log => ({
            ...log.toObject(),
            description: log.getActionDescription()
        }));

        res.json({
            audit_logs: logsWithDescriptions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            },
            summary: {
                total_actions: total,
                date_range: {
                    start: start_date || 'All time',
                    end: end_date || 'Present'
                }
            }
        });
    } catch (err) {
        console.error('Audit logs error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get audit log statistics
router.get('/audit-stats', auth, requireSuperAdmin, async (req, res) => {
    try {
        // Get total actions count
        const totalActions = await AuditLog.countDocuments();

        // Get status-based stats
        const statusStats = await AuditLog.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Calculate successful and failed actions
        const successCount = statusStats.find(s => s._id === 'success')?.count || 0;
        const failureCount = statusStats.find(s => s._id === 'failure')?.count || 0;

        // Get recent activity (last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentActivityCount = await AuditLog.countDocuments({
            timestamp: { $gte: twentyFourHoursAgo }
        });

        // Get action type breakdown
        const actionStats = await AuditLog.aggregate([
            {
                $group: {
                    _id: '$action_type',
                    count: { $sum: 1 },
                    latest: { $max: '$timestamp' }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        // Get user type breakdown
        const userStats = await AuditLog.aggregate([
            {
                $group: {
                    _id: '$performed_by.user_type',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get target type breakdown
        const targetStats = await AuditLog.aggregate([
            {
                $group: {
                    _id: '$target.target_type',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            total_actions: totalActions,
            successful_actions: successCount,
            failed_actions: failureCount,
            last_24h: recentActivityCount,
            action_stats: actionStats,
            user_stats: userStats,
            status_stats: statusStats,
            target_stats: targetStats,
            generated_at: new Date()
        });
    } catch (err) {
        console.error('Audit stats error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get action types summary for dashboard cards
router.get('/action-types-summary', auth, requireSuperAdmin, async (req, res) => {
    try {
        // Define action type metadata with colors and icons
        const actionTypeMetadata = {
            'mosque_created': {
                label: 'Mosques Created',
                color: 'blue',
                icon: 'building',
                category: 'mosque'
            },
            'mosque_deleted': {
                label: 'Mosques Deleted',
                color: 'orange',
                icon: 'trash',
                category: 'mosque'
            },
            'mosque_updated': {
                label: 'Mosques Updated',
                color: 'indigo',
                icon: 'edit',
                category: 'mosque'
            },
            'admin_approved': {
                label: 'Admins Approved',
                color: 'green',
                icon: 'user-check',
                category: 'admin'
            },
            'admin_rejected': {
                label: 'Admins Rejected',
                color: 'red',
                icon: 'user-times',
                category: 'admin'
            },
            'admin_registered': {
                label: 'Admins Registered',
                color: 'purple',
                icon: 'user-plus',
                category: 'admin'
            },
            'admin_removed': {
                label: 'Admins Removed',
                color: 'gray',
                icon: 'user-minus',
                category: 'admin'
            },
            'admin_reapplication': {
                label: 'Admin Reapplications',
                color: 'lime',
                icon: 'user-plus',
                category: 'admin'
            },
            'admin_allowed_reapply': {
                label: 'Reapplication Allowed',
                color: 'emerald',
                icon: 'user-check',
                category: 'admin'
            },
            'admin_assigned': {
                label: 'Admins Assigned',
                color: 'sky',
                icon: 'user-plus',
                category: 'admin'
            },
            'code_regenerated': {
                label: 'Codes Regenerated',
                color: 'yellow',
                icon: 'refresh',
                category: 'verification'
            },
            'bulk_code_regeneration': {
                label: 'Bulk Code Regeneration',
                color: 'yellow',
                icon: 'refresh',
                category: 'verification'
            },
            'prayer_times_updated': {
                label: 'Prayer Times Updated',
                color: 'teal',
                icon: 'clock',
                category: 'prayer'
            },
            'mosque_details_updated': {
                label: 'Mosque Details Updated',
                color: 'cyan',
                icon: 'info',
                category: 'mosque'
            },
            'error': {
                label: 'System Errors',
                color: 'red',
                icon: 'exclamation-triangle',
                category: 'system'
            },
            'audit_logs_cleaned': {
                label: 'Audit Logs Cleaned',
                color: 'slate',
                icon: 'trash',
                category: 'system'
            },
            'super_admin_created': {
                label: 'Super Admins Created',
                color: 'violet',
                icon: 'user-shield',
                category: 'admin'
            },
            'super_admin_deleted': {
                label: 'Super Admins Deleted',
                color: 'red',
                icon: 'user-shield',
                category: 'admin'
            }
        };

        // Get counts for all action types
        const actionTypeCounts = await AuditLog.aggregate([
            {
                $group: {
                    _id: '$action_type',
                    total_count: { $sum: 1 },
                    success_count: {
                        $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
                    },
                    failure_count: {
                        $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] }
                    },
                    latest_timestamp: { $max: '$timestamp' },
                    earliest_timestamp: { $min: '$timestamp' }
                }
            }
        ]);

        // Get last 24 hours count for each action type
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const last24hCounts = await AuditLog.aggregate([
            {
                $match: {
                    timestamp: { $gte: twentyFourHoursAgo }
                }
            },
            {
                $group: {
                    _id: '$action_type',
                    count_24h: { $sum: 1 }
                }
            }
        ]);

        // Get today's count for each action type
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayCounts = await AuditLog.aggregate([
            {
                $match: {
                    timestamp: { $gte: todayStart }
                }
            },
            {
                $group: {
                    _id: '$action_type',
                    count_today: { $sum: 1 }
                }
            }
        ]);

        // Create a map of existing counts
        const existingCounts = {};
        actionTypeCounts.forEach(item => {
            existingCounts[item._id] = item;
        });

        // Ensure ALL action types are included (even with zero count)
        const actionTypesData = Object.keys(actionTypeMetadata).map(actionType => {
            const metadata = actionTypeMetadata[actionType];
            const existingData = existingCounts[actionType];
            const last24h = last24hCounts.find(c => c._id === actionType)?.count_24h || 0;
            const today = todayCounts.find(c => c._id === actionType)?.count_today || 0;

            return {
                action_type: actionType,
                label: metadata.label,
                color: metadata.color,
                icon: metadata.icon,
                category: metadata.category,
                total_count: existingData?.total_count || 0,
                success_count: existingData?.success_count || 0,
                failure_count: existingData?.failure_count || 0,
                count_24h: last24h,
                count_today: today,
                latest_timestamp: existingData?.latest_timestamp || null,
                earliest_timestamp: existingData?.earliest_timestamp || null,
                success_rate: existingData && existingData.total_count > 0
                    ? Math.round((existingData.success_count / existingData.total_count) * 100)
                    : 0
            };
        });

        // Combine code_regenerated and bulk_code_regeneration into a single "Codes Regenerated" entry
        const codeRegeneratedIndex = actionTypesData.findIndex(item => item.action_type === 'code_regenerated');
        const bulkCodeRegenerationIndex = actionTypesData.findIndex(item => item.action_type === 'bulk_code_regeneration');

        if (codeRegeneratedIndex !== -1 && bulkCodeRegenerationIndex !== -1) {
            // Merge bulk_code_regeneration into code_regenerated
            const codeRegenerated = actionTypesData[codeRegeneratedIndex];
            const bulkCodeRegeneration = actionTypesData[bulkCodeRegenerationIndex];

            codeRegenerated.total_count += bulkCodeRegeneration.total_count;
            codeRegenerated.success_count += bulkCodeRegeneration.success_count;
            codeRegenerated.failure_count += bulkCodeRegeneration.failure_count;
            codeRegenerated.count_24h += bulkCodeRegeneration.count_24h;
            codeRegenerated.count_today += bulkCodeRegeneration.count_today;

            // Update timestamps to most recent
            if (bulkCodeRegeneration.latest_timestamp > codeRegenerated.latest_timestamp) {
                codeRegenerated.latest_timestamp = bulkCodeRegeneration.latest_timestamp;
            }
            if (bulkCodeRegeneration.earliest_timestamp < codeRegenerated.earliest_timestamp) {
                codeRegenerated.earliest_timestamp = bulkCodeRegeneration.earliest_timestamp;
            }

            // Recalculate success rate
            codeRegenerated.success_rate = codeRegenerated.total_count > 0
                ? Math.round((codeRegenerated.success_count / codeRegenerated.total_count) * 100)
                : 0;

            // Remove bulk_code_regeneration from the array
            actionTypesData.splice(bulkCodeRegenerationIndex, 1);
        } else if (bulkCodeRegenerationIndex !== -1 && codeRegeneratedIndex === -1) {
            // If only bulk exists, rename it to "Codes Regenerated"
            actionTypesData[bulkCodeRegenerationIndex].label = 'Codes Regenerated';
        }

        // Sort by total count descending
        actionTypesData.sort((a, b) => b.total_count - a.total_count);

        // Get summary by category
        const categorySummary = actionTypesData.reduce((acc, item) => {
            if (!acc[item.category]) {
                acc[item.category] = {
                    category: item.category,
                    total_count: 0,
                    count_today: 0,
                    count_24h: 0,
                    action_types: []
                };
            }
            acc[item.category].total_count += item.total_count;
            acc[item.category].count_today += item.count_today;
            acc[item.category].count_24h += item.count_24h;
            acc[item.category].action_types.push(item.action_type);
            return acc;
        }, {});

        res.json({
            action_types: actionTypesData,
            category_summary: Object.values(categorySummary),
            total_action_types: actionTypesData.length,
            total_actions: actionTypesData.reduce((sum, item) => sum + item.total_count, 0),
            generated_at: new Date()
        });
    } catch (err) {
        console.error('Action types summary error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get specific audit log details
router.get('/audit-logs/:id', auth, requireSuperAdmin, async (req, res) => {
    try {
        const log = await AuditLog.findById(req.params.id);

        if (!log) {
            return res.status(404).json({ error: 'Audit log not found' });
        }

        res.json({
            audit_log: {
                ...log.toObject(),
                description: log.getActionDescription()
            }
        });
    } catch (err) {
        console.error('Audit log details error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Export audit logs (CSV format)
router.get('/audit-logs/export/csv', auth, requireSuperAdmin, async (req, res) => {
    try {
        const {
            action_type,
            user_type,
            target_type,
            start_date,
            end_date,
            log_ids
        } = req.query;

        const query = {};

        // If specific log IDs are provided, only export those logs
        if (log_ids) {
            const logIdArray = Array.isArray(log_ids) ? log_ids : log_ids.split(',');
            query._id = { $in: logIdArray };
        } else {
            // Apply filters only if no specific log IDs are provided
            if (action_type) query.action_type = action_type;
            if (user_type) query['performed_by.user_type'] = user_type;
            if (target_type) query['target.target_type'] = target_type;

            if (start_date || end_date) {
                query.timestamp = {};
                if (start_date) query.timestamp.$gte = new Date(start_date);
                if (end_date) query.timestamp.$lte = new Date(end_date);
            }
        }

        const logs = await AuditLog.find(query).sort({ timestamp: -1 });

        // Create CSV content
        const csvHeader = 'Timestamp,Action Type,Performed By,User Type,Target Type,Target Name,Status,Description\n';
        const csvRows = logs.map(log => {
            const timestamp = new Date(log.timestamp).toISOString();
            const actionType = log.action_type || '';
            const performedBy = log.performed_by?.user_name || 'Unknown';
            const userType = log.performed_by?.user_type || '';
            const targetType = log.target?.target_type || '';
            const targetName = log.target?.target_name || '';
            const status = log.status || '';
            const description = log.getActionDescription().replace(/,/g, ';'); // Replace commas to avoid CSV issues

            return `"${timestamp}","${actionType}","${performedBy}","${userType}","${targetType}","${targetName}","${status}","${description}"`;
        }).join('\n');

        const csvContent = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
        res.send(csvContent);
    } catch (err) {
        console.error('Audit logs export error:', err);
        res.status(500).json({ error: 'Server error during export' });
    }
});

// Delete old audit logs (cleanup)
router.delete('/audit-logs/cleanup', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { days_old = 90, reason } = req.query;

        // Validation for reason
        if (!reason || reason.trim().length < 10) {
            return res.status(400).json({
                error: 'Reason is required and must be at least 10 characters long',
                code: 'INVALID_REASON'
            });
        }

        const cutoffDate = new Date(Date.now() - days_old * 24 * 60 * 60 * 1000);

        // Delete old audit logs from database
        const result = await AuditLog.deleteMany({
            timestamp: { $lt: cutoffDate }
        });

        console.log(`Deleted ${result.deletedCount} audit logs older than ${days_old} days from database`);

        // Log the cleanup action (this creates a new audit log entry)
        const auditLogger = new AuditLogger(req);
        await AuditLog.logAction({
            action_type: 'audit_logs_cleaned',
            performed_by: auditLogger.getUserInfo(),
            target: {
                target_type: 'system',
                target_id: null,
                target_name: 'Audit System'
            },
            action_details: {
                notes: reason.trim(),
                cleanup_criteria: {
                    days_old: days_old,
                    cutoff_date: cutoffDate
                },
                deleted_count: result.deletedCount,
                ip_address: auditLogger.ip_address,
                user_agent: auditLogger.user_agent
            }
        });

        res.json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} audit logs older than ${days_old} days`,
            deleted_count: result.deletedCount
        });
    } catch (err) {
        console.error('Audit logs cleanup error:', err);
        res.status(500).json({ error: 'Server error during cleanup' });
    }
});

// Delete specific audit logs by IDs
router.delete('/audit-logs/bulk-delete', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { log_ids, reason } = req.body;

        // Validation
        if (!log_ids || !Array.isArray(log_ids) || log_ids.length === 0) {
            return res.status(400).json({ error: 'log_ids array is required and cannot be empty' });
        }

        if (!reason || reason.trim().length < 10) {
            return res.status(400).json({ error: 'Reason is required and must be at least 10 characters long' });
        }

        // Get the logs before deletion for audit logging
        const logsToDelete = await AuditLog.find({ _id: { $in: log_ids } });

        if (logsToDelete.length === 0) {
            return res.status(404).json({ error: 'No logs found with the provided IDs' });
        }

        // Delete the specific logs
        const result = await AuditLog.deleteMany({ _id: { $in: log_ids } });

        // Log the bulk deletion action
        const auditLogger = new AuditLogger(req);
        await AuditLog.logAction({
            action_type: 'audit_logs_bulk_deleted',
            performed_by: auditLogger.getUserInfo(),
            target: {
                target_type: 'system',
                target_id: null,
                target_name: 'Audit System'
            },
            action_details: {
                notes: `Bulk deleted ${result.deletedCount} specific audit logs`,
                reason: reason.trim(),
                deleted_log_ids: log_ids,
                deleted_logs_summary: logsToDelete.map(log => ({
                    id: log._id,
                    action_type: log.action_type,
                    performed_by: log.performed_by.user_name,
                    timestamp: log.timestamp
                })),
                deleted_count: result.deletedCount,
                ip_address: auditLogger.ip_address,
                user_agent: auditLogger.user_agent
            }
        });

        res.json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} audit logs`,
            deleted_count: result.deletedCount
        });
    } catch (err) {
        console.error('Bulk audit logs deletion error:', err);
        res.status(500).json({ error: 'Server error during bulk deletion' });
    }
});

// Complete Mosque Registration with Admin (New Method)
// This route creates both mosque and admin in one step with approved status
router.post('/mosque-registration', auth, requireSuperAdmin, async (req, res) => {
    try {
        const {
            // Mosque details
            mosque_name,
            location,
            description,
            contact_phone,
            contact_email,
            admin_instructions,
            // Admin details
            admin_name,
            admin_email,
            admin_phone,
            admin_password,
            registration_code
        } = req.body;

        // Comprehensive validation for required fields
        if (!mosque_name || !location || !admin_name || !admin_email || !admin_password || !admin_phone) {
            return res.status(400).json({
                error: 'Mosque name, location, admin name, email, phone, and password are required',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }

        // Validate mosque name
        if (mosque_name.trim().length < 3) {
            return res.status(400).json({
                error: 'Mosque name must be at least 3 characters long',
                code: 'INVALID_MOSQUE_NAME_LENGTH'
            });
        }

        if (mosque_name.trim().length > 100) {
            return res.status(400).json({
                error: 'Mosque name must not exceed 100 characters',
                code: 'INVALID_MOSQUE_NAME_LENGTH'
            });
        }

        // Validate mosque name format
        const nameRegex = /^[a-zA-Z0-9\s\-']+$/;
        if (!nameRegex.test(mosque_name.trim())) {
            return res.status(400).json({
                error: 'Mosque name can only contain letters, numbers, spaces, hyphens and apostrophes',
                code: 'INVALID_MOSQUE_NAME_FORMAT'
            });
        }

        // Validate location
        if (location.trim().length < 5) {
            return res.status(400).json({
                error: 'Location must be at least 5 characters long',
                code: 'INVALID_LOCATION_LENGTH'
            });
        }

        if (location.trim().length > 200) {
            return res.status(400).json({
                error: 'Location must not exceed 200 characters',
                code: 'INVALID_LOCATION_LENGTH'
            });
        }

        // Validate description length if provided
        if (description && description.trim().length > 1000) {
            return res.status(400).json({
                error: 'Description must not exceed 1000 characters',
                code: 'INVALID_DESCRIPTION_LENGTH'
            });
        }

        // Validate admin instructions length if provided
        if (admin_instructions && admin_instructions.trim().length > 500) {
            return res.status(400).json({
                error: 'Admin instructions must not exceed 500 characters',
                code: 'INVALID_INSTRUCTIONS_LENGTH'
            });
        }

        // Validate admin name
        if (admin_name.trim().length < 2) {
            return res.status(400).json({
                error: 'Admin name must be at least 2 characters long',
                code: 'INVALID_ADMIN_NAME_LENGTH'
            });
        }

        if (admin_name.trim().length > 50) {
            return res.status(400).json({
                error: 'Admin name must not exceed 50 characters',
                code: 'INVALID_ADMIN_NAME_LENGTH'
            });
        }

        // Validate admin name format - only letters, spaces, hyphens, apostrophes
        const adminNameRegex = /^[a-zA-Z\s\-']+$/;
        if (!adminNameRegex.test(admin_name.trim())) {
            return res.status(400).json({
                error: 'Admin name can only contain letters, spaces, hyphens and apostrophes',
                code: 'INVALID_ADMIN_NAME_FORMAT'
            });
        }

        // Validate admin email with domain restriction
        const allowedEmailDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com', 'protonmail.com'];
        const emailDomainRegex = new RegExp(`^[a-zA-Z0-9._%+-]+@(${allowedEmailDomains.join('|').replace(/\./g, '\\.')})$`, 'i');

        if (!emailDomainRegex.test(admin_email.trim())) {
            return res.status(400).json({
                error: `Admin email must be from one of these providers: ${allowedEmailDomains.join(', ')}`,
                code: 'INVALID_EMAIL_DOMAIN'
            });
        }

        // Validate admin phone
        const phoneRegex = /^\+923[0-9]{9}$/;
        if (!phoneRegex.test(admin_phone.trim())) {
            return res.status(400).json({
                error: 'Phone number must be in format +923xxxxxxxxx (e.g., +923001234567)',
                code: 'INVALID_PHONE_FORMAT'
            });
        }

        // Validate admin password
        if (admin_password.length < 8) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters long',
                code: 'INVALID_PASSWORD_LENGTH'
            });
        }

        if (admin_password.length > 50) {
            return res.status(400).json({
                error: 'Password must not exceed 50 characters',
                code: 'INVALID_PASSWORD_LENGTH'
            });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/;
        if (!passwordRegex.test(admin_password)) {
            return res.status(400).json({
                error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)',
                code: 'INVALID_PASSWORD_FORMAT'
            });
        }

        // Check for duplicate mosque name in same location
        const existingMosque = await Mosque.findOne({
            name: { $regex: new RegExp(`^${mosque_name.trim()}$`, 'i') },
            location: { $regex: new RegExp(`^${location.trim()}$`, 'i') }
        });

        if (existingMosque) {
            return res.status(409).json({
                error: 'A mosque with this name already exists at this location',
                code: 'DUPLICATE_MOSQUE'
            });
        }

        // Check if admin email already exists
        const existingAdminByEmail = await Admin.findOne({ email: admin_email.toLowerCase().trim() });
        if (existingAdminByEmail) {
            return res.status(409).json({
                error: 'An admin with this email already exists',
                code: 'DUPLICATE_EMAIL'
            });
        }

        // Check if admin phone already exists
        const existingAdminByPhone = await Admin.findOne({ phone: admin_phone.trim() });
        if (existingAdminByPhone) {
            return res.status(409).json({
                error: 'An admin with this phone number already exists',
                code: 'DUPLICATE_PHONE'
            });
        }

        // Validate contact email if provided
        if (contact_email && contact_email.trim()) {
            if (!emailDomainRegex.test(contact_email.trim())) {
                return res.status(400).json({
                    error: `Contact email must be from one of these providers: ${allowedEmailDomains.join(', ')}`,
                    code: 'INVALID_CONTACT_EMAIL_DOMAIN'
                });
            }
        }

        // Validate contact phone if provided
        if (contact_phone && contact_phone.trim()) {
            if (!phoneRegex.test(contact_phone.trim())) {
                return res.status(400).json({
                    error: 'Contact phone number must be in format +923xxxxxxxxx (e.g., +923001234567)',
                    code: 'INVALID_CONTACT_PHONE_FORMAT'
                });
            }
        }

        // Generate unique verification code for the mosque
        const verification_code = crypto.randomBytes(8).toString('hex').toUpperCase();
        const verification_code_expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Create custom admin instructions if not provided
        const defaultInstructions = contact_phone || contact_email
            ? `To become an admin of ${mosque_name}, you need the mosque verification code. Contact the mosque management at ${contact_phone ? `phone: ${contact_phone}` : ''}${contact_phone && contact_email ? ' or ' : ''}${contact_email ? `email: ${contact_email}` : ''} to get the verification code.`
            : `To become an admin of ${mosque_name}, you need the mosque verification code. Contact the mosque management to get the code.`;

        // Create the mosque first
        const mosque = new Mosque({
            name: mosque_name.trim(),
            location: location.trim(),
            description: description ? description.trim() : '',
            verification_code,
            verification_code_expires,
            contact_phone: contact_phone ? contact_phone.trim() : '',
            contact_email: contact_email ? contact_email.trim().toLowerCase() : '',
            admin_instructions: admin_instructions ? admin_instructions.trim() : defaultInstructions,
            prayer_times: {
                fajr: '',
                dhuhr: '',
                asr: '',
                maghrib: '',
                isha: '',
                jummah: ''
            }
        });

        await mosque.save();

        // Hash the admin password before saving
        const hashedPassword = await bcrypt.hash(admin_password, 10);

        // Create the admin with approved status
        const admin = new Admin({
            name: admin_name.trim(),
            email: admin_email.trim().toLowerCase(),
            password: hashedPassword,
            phone: admin_phone.trim(),
            mosque_id: mosque._id,
            verification_code_used: verification_code,
            status: 'approved',
            super_admin_notes: 'Directly registered by super admin',
            approved_at: new Date(),
            application_notes: `Registered via super admin mosque registration with code: ${registration_code || 'N/A'}`
        });

        await admin.save();

        // Log both mosque creation and admin approval
        const auditLogger = new AuditLogger(req);
        await auditLogger.logMosqueCreated(mosque);
        await auditLogger.logAdminApproved(admin, mosque, 'Directly registered by super admin');

        // Return complete registration details
        res.status(201).json({
            message: 'Mosque and admin registered successfully',
            registration_code: registration_code,
            mosque: {
                id: mosque._id,
                name: mosque.name,
                location: mosque.location,
                description: mosque.description,
                contact_phone: mosque.contact_phone,
                contact_email: mosque.contact_email,
                admin_instructions: mosque.admin_instructions,
                verification_code: mosque.verification_code,
                verification_code_expires: mosque.verification_code_expires,
                created_at: mosque.createdAt
            },
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                phone: admin.phone,
                status: admin.status,
                approved_at: admin.approved_at
            },
            instructions: {
                message: "Mosque and admin have been successfully registered and approved",
                verification_code: mosque.verification_code,
                admin_status: "Approved and ready to manage mosque",
                expires_in: "30 days"
            }
        });
    } catch (err) {
        console.error('Complete mosque registration error:', err);

        // Handle duplicate key errors
        if (err.code === 11000) {
            return res.status(409).json({
                error: 'Duplicate entry detected. This mosque or admin information already exists',
                code: 'DUPLICATE_ENTRY'
            });
        }

        // Handle validation errors
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                error: err.message,
                code: 'VALIDATION_ERROR'
            });
        }

        res.status(500).json({
            error: 'Server error during registration',
            code: 'SERVER_ERROR'
        });
    }
});

// Get all mosques with their admin details (for deletion management)
router.get('/mosques/all', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { search, status, sort = 'createdAt', order = 'desc' } = req.query;

        // Build mosque query
        const mosqueQuery = {};
        if (search) {
            mosqueQuery.$or = [
                { name: new RegExp(search, 'i') },
                { location: new RegExp(search, 'i') },
                { verification_code: new RegExp(search, 'i') }
            ];
        }

        // Get all mosques
        const sortOptions = {};
        sortOptions[sort] = order === 'desc' ? -1 : 1;

        const mosques = await Mosque.find(mosqueQuery).sort(sortOptions);

        // Get all admins for these mosques
        const mosquesWithDetails = await Promise.all(
            mosques.map(async (mosque) => {
                // Find all admins for this mosque (could be multiple if pending/rejected)
                const admins = await Admin.find({ mosque_id: mosque._id });

                // Find the approved admin if exists
                const approvedAdmin = admins.find(a => a.status === 'approved');

                // Filter admins by status if requested
                let filteredAdmins = admins;
                if (status && status !== 'all') {
                    filteredAdmins = admins.filter(a => a.status === status);
                }

                // Return mosque data with admin details
                return {
                    _id: mosque._id,
                    mosque_name: mosque.name,
                    location: mosque.location,
                    description: mosque.description,
                    contact_phone: mosque.contact_phone,
                    contact_email: mosque.contact_email,
                    admin_instructions: mosque.admin_instructions,
                    verification_code: mosque.verification_code,
                    verification_code_expires: mosque.verification_code_expires,
                    created_at: mosque.createdAt,

                    // Admin details
                    has_admin: !!approvedAdmin,
                    admin_name: approvedAdmin ? approvedAdmin.name : 'No Admin Assigned',
                    admin_email: approvedAdmin ? approvedAdmin.email : null,
                    admin_phone: approvedAdmin ? approvedAdmin.phone : null,
                    admin_status: approvedAdmin ? approvedAdmin.status : 'no_admin',
                    admin_id: approvedAdmin ? approvedAdmin._id : null,

                    // All admin requests for this mosque
                    all_admins: admins.map(admin => ({
                        _id: admin._id,
                        name: admin.name,
                        email: admin.email,
                        phone: admin.phone,
                        status: admin.status,
                        created_at: admin.createdAt,
                        approved_at: admin.approved_at,
                        rejected_at: admin.rejected_at
                    })),

                    // Pending/rejected counts
                    pending_admins: admins.filter(a => a.status === 'pending').length,
                    rejected_admins: admins.filter(a => a.status === 'rejected').length
                };
            })
        );

        // Apply status filter if needed
        let filteredMosques = mosquesWithDetails;
        if (status && status !== 'all') {
            filteredMosques = mosquesWithDetails.filter(m => {
                if (status === 'approved') return m.has_admin;
                if (status === 'no_admin') return !m.has_admin;
                if (status === 'pending') return m.pending_admins > 0;
                if (status === 'rejected') return m.rejected_admins > 0;
                return false;
            });
        }

        res.json({
            mosques: filteredMosques,
            total: filteredMosques.length,
            filters: {
                search: search || '',
                status: status || 'all',
                sort,
                order
            }
        });
    } catch (err) {
        console.error('Error fetching all mosques:', err);

        // Log the error
        try {
            const auditLogger = new AuditLogger(req);
            await auditLogger.logError({
                action: 'fetch_all_mosques',
                error: err,
                errorMessage: err.message,
                statusCode: 500,
                endpoint: '/superadmin/mosques/all',
                method: 'GET'
            });
        } catch (auditError) {
            console.error('Failed to log error (non-critical):', auditError);
        }

        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Delete a single mosque
router.delete('/mosque/:id', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason || reason.trim() === '') {
            return res.status(400).json({
                error: 'Deletion reason is required',
                code: 'MISSING_REASON'
            });
        }

        // Get mosque and admin data before deletion for audit logging
        const mosque = await Mosque.findById(req.params.id);
        if (!mosque) {
            return res.status(404).json({ error: 'Mosque not found' });
        }

        const admins = await Admin.find({ mosque_id: req.params.id });

        // Log the mosque deletion with admin details
        const auditLogger = new AuditLogger(req);
        await auditLogger.logMosqueDeleted(mosque, admins[0], reason);

        // Update admins to mosque_deleted status instead of deleting them
        const updatedAdmins = [];
        for (const admin of admins) {
            admin.status = 'mosque_deleted';
            admin.mosque_deletion_reason = reason.trim();
            admin.mosque_deletion_date = new Date();
            admin.deleted_mosque_name = mosque.name;
            admin.deleted_mosque_location = mosque.location;
            admin.mosque_id = null; // Remove mosque association
            admin.verification_code_used = null; // Clear verification code
            admin.can_reapply = true; // Allow them to reapply by default

            await admin.save();
            updatedAdmins.push({
                name: admin.name,
                email: admin.email,
                status: admin.status
            });
        }

        // Delete the mosque
        await Mosque.findByIdAndDelete(req.params.id);

        res.json({
            message: 'Mosque deleted successfully. Associated admins have been notified and can reapply.',
            deleted_mosque: {
                name: mosque.name,
                location: mosque.location,
                verification_code: mosque.verification_code
            },
            updated_admins: updatedAdmins,
            reason: reason
        });
    } catch (err) {
        console.error('Error deleting mosque:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Bulk delete mosques
router.post('/mosques/bulk-delete', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { mosque_ids, reason } = req.body;

        if (!mosque_ids || !Array.isArray(mosque_ids) || mosque_ids.length === 0) {
            return res.status(400).json({
                error: 'Mosque IDs array is required',
                code: 'MISSING_MOSQUE_IDS'
            });
        }

        if (!reason || reason.trim() === '') {
            return res.status(400).json({
                error: 'Deletion reason is required',
                code: 'MISSING_REASON'
            });
        }

        const deletedMosques = [];
        const errors = [];

        for (const mosqueId of mosque_ids) {
            try {
                // Get mosque and admin data before deletion
                const mosque = await Mosque.findById(mosqueId);
                if (!mosque) {
                    errors.push({ mosque_id: mosqueId, error: 'Mosque not found' });
                    continue;
                }

                const admins = await Admin.find({ mosque_id: mosqueId });

                // Log the deletion
                const auditLogger = new AuditLogger(req);
                await auditLogger.logMosqueDeleted(mosque, admins[0], reason);

                // Update admins to mosque_deleted status instead of deleting them
                for (const admin of admins) {
                    admin.status = 'mosque_deleted';
                    admin.mosque_deletion_reason = reason.trim();
                    admin.mosque_deletion_date = new Date();
                    admin.deleted_mosque_name = mosque.name;
                    admin.deleted_mosque_location = mosque.location;
                    admin.mosque_id = null;
                    admin.verification_code_used = null;
                    admin.can_reapply = true;
                    await admin.save();
                }

                // Delete mosque only
                await Mosque.findByIdAndDelete(mosqueId);

                deletedMosques.push({
                    mosque_id: mosqueId,
                    name: mosque.name,
                    location: mosque.location,
                    updated_admins: admins.length
                });
            } catch (err) {
                errors.push({ mosque_id: mosqueId, error: err.message });
            }
        }

        res.json({
            message: `Successfully deleted ${deletedMosques.length} mosque(s). Associated admins can reapply.`,
            deleted_mosques: deletedMosques,
            failed: errors.length,
            errors: errors,
            reason: reason
        });
    } catch (err) {
        console.error('Error in bulk delete:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Allow Rejected Admin to Reapply - NEW
router.put('/:id/allow-reapplication', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { notes } = req.body;

        // Find admin
        const admin = await Admin.findById(req.params.id);

        if (!admin) {
            return res.status(404).json({
                error: 'Admin not found',
                code: 'ADMIN_NOT_FOUND'
            });
        }

        // Verify admin is rejected
        if (admin.status !== 'rejected') {
            return res.status(400).json({
                error: 'Only rejected admins can be allowed to reapply',
                code: 'INVALID_STATUS'
            });
        }

        // Check if already allowed
        if (admin.can_reapply) {
            return res.status(400).json({
                error: 'This admin is already allowed to reapply',
                code: 'ALREADY_ALLOWED'
            });
        }

        // Allow reapplication
        admin.can_reapply = true;
        await admin.save();

        // Get mosque data for audit logging
        const mosque = await Mosque.findById(admin.mosque_id);

        // Audit log
        try {
            const auditLogger = new AuditLogger(req);
            await auditLogger.logAdminAllowedReapply(admin, mosque, notes);
        } catch (auditError) {
            console.error('Failed to log admin allowed to reapply (non-critical):', auditError);
        }

        res.json({
            success: true,
            message: 'Admin is now allowed to reapply',
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                status: admin.status,
                can_reapply: admin.can_reapply,
                rejection_count: admin.rejection_count
            }
        });

    } catch (error) {
        console.error('Error allowing reapplication:', error);

        // Log the error
        try {
            const auditLogger = new AuditLogger(req);
            await auditLogger.logError({
                action: 'allow_admin_reapplication',
                error: error,
                errorMessage: error.message,
                statusCode: 500,
                endpoint: `/superadmin/${req.params.id}/allow-reapplication`,
                method: 'PUT'
            });
        } catch (auditError) {
            console.error('Failed to log error (non-critical):', auditError);
        }

        res.status(500).json({
            error: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

// Get All Rejected Admins - NEW
router.get('/rejected-admins', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { search = '', page = 1, limit = 20, sort_by = 'rejection_date' } = req.query;

        // Build query
        let query = { status: 'rejected' };

        // Add search filter
        if (search) {
            const searchLower = search.toLowerCase().trim();

            // Check for special "reapply" search terms
            const reapplyTerms = ['reapply', 'can reapply', 'canreapply', 'can apply', 'canapply', 'apply'];
            const isReapplySearch = reapplyTerms.some(term => searchLower === term || searchLower.includes('reapply') || searchLower.includes('can apply'));

            if (isReapplySearch) {
                // Only show admins who can reapply
                query.can_reapply = true;
            } else {
                // First, search for mosques matching the search term
                const matchingMosques = await Mosque.find({
                    $or: [
                        { name: new RegExp(search, 'i') },
                        { location: new RegExp(search, 'i') }
                    ]
                }).select('_id');

                const mosqueIds = matchingMosques.map(m => m._id);

                // Now build the admin query
                query.$or = [
                    { name: new RegExp(search, 'i') },
                    { email: new RegExp(search, 'i') },
                    { phone: new RegExp(search, 'i') },
                    { rejection_reason: new RegExp(search, 'i') },
                    // Search in previous mosque applications
                    { 'previous_mosque_ids.mosque_id': { $in: mosqueIds } }
                ];
            }
        }

        // Get total count
        const total = await Admin.countDocuments(query);

        // Get rejected admins with pagination
        const rejectedAdmins = await Admin.find(query)
            .populate('previous_mosque_ids.mosque_id', 'name location')
            .populate('rejected_by', 'name email')
            .sort({ [sort_by]: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .select('-password'); // Exclude password

        res.json({
            success: true,
            rejected_admins: rejectedAdmins.map(admin => ({
                id: admin._id,
                name: admin.name,
                email: admin.email,
                phone: admin.phone,
                status: admin.status,
                rejection_reason: admin.rejection_reason,
                rejection_date: admin.rejection_date,
                rejection_count: admin.rejection_count,
                can_reapply: admin.can_reapply,
                rejected_by: admin.rejected_by ? {
                    id: admin.rejected_by._id,
                    name: admin.rejected_by.name,
                    email: admin.rejected_by.email
                } : null,
                previous_mosques: admin.previous_mosque_ids.map(pm => ({
                    mosque: pm.mosque_id ? {
                        id: pm.mosque_id._id,
                        name: pm.mosque_id.name,
                        location: pm.mosque_id.location
                    } : null,
                    rejected_at: pm.rejected_at,
                    rejection_reason: pm.rejection_reason
                })),
                created_at: admin.createdAt
            })),
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching rejected admins:', error);
        res.status(500).json({
            error: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

// Assign Admin to Existing Mosque
router.post('/assign-admin/:mosqueId', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { mosqueId } = req.params;
        const {
            admin_name,
            admin_email,
            admin_phone,
            admin_password,
            super_admin_notes
        } = req.body;

        // Validation
        if (!admin_name || !admin_email || !admin_password || !admin_phone) {
            return res.status(400).json({
                error: 'Admin name, email, phone, and password are required',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(admin_email)) {
            return res.status(400).json({
                error: 'Invalid email format',
                code: 'INVALID_EMAIL'
            });
        }

        // Validate phone format
        const phoneRegex = /^\+?[0-9]{10,15}$/;
        if (!phoneRegex.test(admin_phone.replace(/[\s-]/g, ''))) {
            return res.status(400).json({
                error: 'Invalid phone number format',
                code: 'INVALID_PHONE'
            });
        }

        // Validate password
        if (admin_password.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters long',
                code: 'INVALID_PASSWORD_LENGTH'
            });
        }

        // Check if mosque exists
        const mosque = await Mosque.findById(mosqueId);
        if (!mosque) {
            return res.status(404).json({
                error: 'Mosque not found',
                code: 'MOSQUE_NOT_FOUND'
            });
        }

        // Check if mosque already has an approved admin
        const existingApprovedAdmin = await Admin.findOne({
            mosque_id: mosqueId,
            status: 'approved'
        });

        if (existingApprovedAdmin) {
            return res.status(400).json({
                error: 'This mosque already has an approved admin',
                code: 'ADMIN_ALREADY_EXISTS',
                existing_admin: {
                    name: existingApprovedAdmin.name,
                    email: existingApprovedAdmin.email
                }
            });
        }

        // Check if email is already registered
        const existingAdmin = await Admin.findOne({ email: admin_email });
        if (existingAdmin) {
            return res.status(400).json({
                error: 'Admin with this email already exists',
                code: 'EMAIL_ALREADY_EXISTS'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(admin_password, 10);

        // Create new admin with approved status
        const newAdmin = new Admin({
            name: admin_name,
            email: admin_email,
            phone: admin_phone,
            password: hashedPassword,
            mosque_id: mosqueId,
            status: 'approved',
            super_admin_notes: super_admin_notes || 'Admin assigned by super admin',
            approved_at: new Date(),
            registration_code_used: mosque.verification_code
        });

        await newAdmin.save();

        // Log the admin assignment
        const auditLogger = new AuditLogger(req);
        await auditLogger.logAdminAssigned(newAdmin, mosque, super_admin_notes || 'Admin assigned by super admin');

        res.status(201).json({
            message: 'Admin successfully assigned to mosque',
            admin: {
                id: newAdmin._id,
                name: newAdmin.name,
                email: newAdmin.email,
                phone: newAdmin.phone,
                status: newAdmin.status,
                mosque: {
                    id: mosque._id,
                    name: mosque.name,
                    location: mosque.location,
                    verification_code: mosque.verification_code
                },
                approved_at: newAdmin.approved_at
            }
        });
    } catch (error) {
        console.error('Error assigning admin:', error);
        res.status(500).json({
            error: 'Server error',
            code: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Assign Admin to Existing Mosque
router.post('/mosques/:mosqueId/assign-admin', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { mosqueId } = req.params;
        const {
            admin_name,
            admin_email,
            admin_phone,
            admin_password,
            super_admin_notes
        } = req.body;

        // Validate required fields
        if (!admin_name || !admin_email || !admin_phone || !admin_password) {
            return res.status(400).json({
                error: 'Admin name, email, phone, and password are required',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }

        // Validate admin name using validators
        const nameValidation = validateName(admin_name, 'Admin name');
        if (!nameValidation.valid) {
            return res.status(400).json({
                error: nameValidation.error,
                code: 'INVALID_NAME'
            });
        }

        // Validate email using validators
        const emailValidation = validateEmail(admin_email);
        if (!emailValidation.valid) {
            return res.status(400).json({
                error: emailValidation.error,
                code: 'INVALID_EMAIL'
            });
        }

        // Validate phone using validators
        const phoneValidation = validatePhone(admin_phone, true);
        if (!phoneValidation.valid) {
            return res.status(400).json({
                error: phoneValidation.error,
                code: 'INVALID_PHONE'
            });
        }

        // Validate password using validators
        const passwordValidation = validatePassword(admin_password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                error: passwordValidation.error,
                code: 'INVALID_PASSWORD'
            });
        }

        // Validate super admin notes if provided
        if (super_admin_notes) {
            const notesValidation = validateApplicationNotes(super_admin_notes);
            if (!notesValidation.valid) {
                return res.status(400).json({
                    error: notesValidation.error,
                    code: 'INVALID_NOTES'
                });
            }
        }

        // Sanitize inputs
        const sanitizedName = sanitizeString(admin_name);
        const sanitizedEmail = sanitizeEmail(admin_email);
        const sanitizedPhone = sanitizeString(admin_phone);
        const sanitizedNotes = super_admin_notes ? sanitizeString(super_admin_notes) : '';

        // Check if mosque exists
        const mosque = await Mosque.findById(mosqueId);
        if (!mosque) {
            return res.status(404).json({
                error: 'Mosque not found',
                code: 'MOSQUE_NOT_FOUND'
            });
        }

        // Check if mosque already has an approved admin
        const existingApprovedAdmin = await Admin.findOne({
            mosque_id: mosqueId,
            status: 'approved'
        });

        if (existingApprovedAdmin) {
            return res.status(400).json({
                error: 'This mosque already has an approved admin',
                code: 'ADMIN_ALREADY_EXISTS',
                admin: {
                    name: existingApprovedAdmin.name,
                    email: existingApprovedAdmin.email,
                    phone: existingApprovedAdmin.phone
                }
            });
        }

        // Check if email is already in use
        const existingAdminByEmail = await Admin.findOne({ email: sanitizedEmail });
        if (existingAdminByEmail) {
            return res.status(400).json({
                error: 'An admin with this email already exists',
                code: 'EMAIL_ALREADY_EXISTS',
                existing_admin: {
                    name: existingAdminByEmail.name,
                    status: existingAdminByEmail.status
                }
            });
        }

        // Check if phone is already in use
        const existingAdminByPhone = await Admin.findOne({ phone: sanitizedPhone });
        if (existingAdminByPhone) {
            return res.status(400).json({
                error: 'An admin with this phone number already exists',
                code: 'PHONE_ALREADY_EXISTS',
                existing_admin: {
                    name: existingAdminByPhone.name,
                    email: existingAdminByPhone.email,
                    status: existingAdminByPhone.status
                }
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(admin_password, 10);

        // Create the new admin with approved status
        const newAdmin = new Admin({
            name: sanitizedName,
            email: sanitizedEmail,
            phone: sanitizedPhone,
            password: hashedPassword,
            mosque_id: mosqueId,
            status: 'approved',
            approved_at: new Date(),
            super_admin_notes: sanitizedNotes || 'Admin assigned by super admin',
            verification_code_used: mosque.verification_code
        });

        await newAdmin.save();

        // Populate mosque details for response
        await newAdmin.populate('mosque_id', 'name location');

        // Log the admin assignment
        const auditLogger = new AuditLogger(req);
        await auditLogger.logAdminAssigned(newAdmin, mosque, sanitizedNotes || 'Admin assigned by super admin');

        res.status(201).json({
            message: 'Admin assigned to mosque successfully',
            admin: {
                id: newAdmin._id,
                name: newAdmin.name,
                email: newAdmin.email,
                phone: newAdmin.phone,
                status: newAdmin.status,
                mosque: {
                    id: mosque._id,
                    name: mosque.name,
                    location: mosque.location,
                    verification_code: mosque.verification_code
                },
                approved_at: newAdmin.approved_at,
                super_admin_notes: newAdmin.super_admin_notes
            }
        });

    } catch (error) {
        console.error('Error assigning admin:', error);
        res.status(500).json({
            error: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

// Create new super admin (Internal route - requires existing super admin authentication)
router.post('/create-superadmin', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate name length
        if (name.trim().length < 2) {
            return res.status(400).json({ error: 'Name must be at least 2 characters long' });
        }

        const allowedDomainsRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|outlook\.com|yahoo\.com|hotmail\.com)$/i;

        if (!allowedDomainsRegex.test(email)) {
            return res.status(400).json({ error: 'Email must be from gmail.com, outlook.com, yahoo.com, or hotmail.com' });
        }

        if (password.length < 7) {
            return res.status(400).json({ error: 'Password must be at least 7 characters long' });
        }

        // Check if email already exists
        const existingSuperAdmin = await SuperAdmin.findOne({ email });
        if (existingSuperAdmin) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const superAdmin = new SuperAdmin({ name: name.trim(), email, password: hashedPassword });
        await superAdmin.save();

        // Log the super admin creation
        try {
            const auditLogger = new AuditLogger(req);
            await auditLogger.logSuperAdminCreated(superAdmin, 'existing_super_admin');
        } catch (auditError) {
            console.error('Failed to log super admin creation:', auditError);
            // Don't fail the request if audit logging fails
        }

        res.status(201).json({
            message: 'Super admin created successfully',
            super_admin: { id: superAdmin._id, name: superAdmin.name, email }
        });
    } catch (err) {
        console.error('Error creating super admin:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all super admins
router.get('/super-admins', auth, requireSuperAdmin, async (req, res) => {
    try {
        const superAdmins = await SuperAdmin.find({}, 'name email createdAt').sort({ createdAt: -1 });
        res.json({ super_admins: superAdmins });
    } catch (err) {
        console.error('Error fetching super admins:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete super admin
router.delete('/super-admin/:id', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent self-deletion
        if (req.user.userId === id) {
            return res.status(400).json({ error: 'Cannot delete your own super admin account' });
        }

        const superAdmin = await SuperAdmin.findById(id);
        if (!superAdmin) {
            return res.status(404).json({ error: 'Super admin not found' });
        }

        // Log the deletion before removing
        try {
            const auditLogger = new AuditLogger(req);
            await auditLogger.logSuperAdminDeleted(superAdmin, 'existing_super_admin');
        } catch (auditError) {
            console.error('Failed to log super admin deletion:', auditError);
        }

        await SuperAdmin.findByIdAndDelete(id);

        res.json({ message: 'Super admin deleted successfully' });
    } catch (err) {
        console.error('Error deleting super admin:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ================================
// CODE REGENERATION ENDPOINTS
// ================================

// Get mosques list for code regeneration with filtering and search
router.get('/mosque/code-regeneration', auth, requireSuperAdmin, async (req, res) => {
    try {
        const {
            search,
            expiry_filter,
            sort = 'verification_code_expires',
            order = 'asc',
            page = 1,
            limit = 50
        } = req.query;

        console.log('Code regeneration list request:', {
            search,
            expiry_filter,
            sort,
            order,
            page,
            limit
        });

        // Build filter query
        let filter = {};

        // Search filter
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { name: searchRegex },
                { location: searchRegex },
                { contact_email: searchRegex },
                { contact_phone: searchRegex }
            ];
        }

        // Get all mosques first
        let mosques = await Mosque.find(filter);

        // Calculate days remaining for each mosque and filter by expiry
        const now = new Date();
        const filteredMosques = [];

        for (const mosque of mosques) {
            const expiryDate = new Date(mosque.verification_code_expires);
            const timeDiff = expiryDate.getTime() - now.getTime();
            const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
            const isExpired = expiryDate < now;

            // Apply expiry filter
            let includeInResults = false;
            switch (expiry_filter) {
                case 'expired':
                    includeInResults = isExpired;
                    break;
                case '1':
                    includeInResults = daysRemaining <= 1 && !isExpired;
                    break;
                case '3':
                    includeInResults = daysRemaining <= 3 && !isExpired;
                    break;
                case '7':
                    includeInResults = daysRemaining <= 7 && !isExpired;
                    break;
                case '10':
                    includeInResults = daysRemaining <= 10 && !isExpired;
                    break;
                case 'all':
                default:
                    includeInResults = true;
                    break;
            }

            if (includeInResults) {
                // Get admin info if exists
                let adminInfo = null;
                try {
                    const admin = await Admin.findOne({ mosque_id: mosque._id, status: 'approved' });
                    if (admin) {
                        adminInfo = {
                            name: admin.name,
                            email: admin.email,
                            phone: admin.phone
                        };
                    }
                } catch (adminErr) {
                    console.warn(`Could not fetch admin for mosque ${mosque._id}:`, adminErr.message);
                }

                filteredMosques.push({
                    id: mosque._id.toString(),
                    name: mosque.name,
                    location: mosque.location,
                    verification_code: mosque.verification_code,
                    verification_code_expires: mosque.verification_code_expires,
                    contact_phone: mosque.contact_phone || 'N/A',
                    contact_email: mosque.contact_email || 'N/A',
                    days_remaining: daysRemaining,
                    is_expired: isExpired,
                    admin: adminInfo
                });
            }
        }

        // Sort results
        const sortOrder = order === 'desc' ? -1 : 1;
        filteredMosques.sort((a, b) => {
            let aVal, bVal;

            switch (sort) {
                case 'name':
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
                case 'location':
                    aVal = a.location.toLowerCase();
                    bVal = b.location.toLowerCase();
                    break;
                case 'verification_code_expires':
                default:
                    aVal = new Date(a.verification_code_expires).getTime();
                    bVal = new Date(b.verification_code_expires).getTime();
                    break;
            }

            if (aVal < bVal) return -1 * sortOrder;
            if (aVal > bVal) return 1 * sortOrder;
            return 0;
        });

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedMosques = filteredMosques.slice(startIndex, endIndex);

        const totalPages = Math.ceil(filteredMosques.length / limitNum);

        console.log(`Found ${filteredMosques.length} mosques for code regeneration`);
        console.log('Sample mosque data:', JSON.stringify(paginatedMosques.slice(0, 1), null, 2));

        const response = {
            mosques: paginatedMosques,
            pagination: {
                current_page: pageNum,
                total_pages: totalPages,
                total_count: filteredMosques.length,
                per_page: limitNum,
                has_next: pageNum < totalPages,
                has_prev: pageNum > 1
            }
        };

        console.log('Response summary:', {
            mosqueCount: response.mosques.length,
            pagination: response.pagination
        });

        res.json(response);

    } catch (err) {
        console.error('Error fetching mosques for code regeneration:', err);
        res.status(500).json({
            error: 'Failed to fetch mosques for code regeneration',
            details: err.message
        });
    }
});

// Regenerate multiple mosque verification codes
router.post('/mosque/regenerate-multiple-codes', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { mosque_ids, expiry_days = 30 } = req.body;

        console.log('Multiple code regeneration request:', {
            mosque_ids,
            expiry_days,
            requestedBy: req.user.email
        });

        // Validation
        if (!mosque_ids || !Array.isArray(mosque_ids) || mosque_ids.length === 0) {
            return res.status(400).json({
                error: 'Invalid request: mosque_ids array is required and cannot be empty'
            });
        }

        if (expiry_days < 1 || expiry_days > 365) {
            return res.status(400).json({
                error: 'Invalid expiry_days: must be between 1 and 365'
            });
        }

        const updatedMosques = [];
        const failedMosques = [];
        let successCount = 0;
        let failedCount = 0;

        // Process each mosque
        for (const mosqueId of mosque_ids) {
            try {
                console.log(`Processing mosque ID: ${mosqueId}`);

                // Find the mosque
                const mosque = await Mosque.findById(mosqueId);
                if (!mosque) {
                    console.warn(`Mosque not found: ${mosqueId}`);
                    failedMosques.push({
                        mosque_id: mosqueId,
                        error: 'Mosque not found'
                    });
                    failedCount++;
                    continue;
                }

                // Store old code for audit
                const oldCode = mosque.verification_code;
                const oldExpiry = mosque.verification_code_expires;

                // Generate new verification code (8 bytes = 16 hex characters)
                const newCode = crypto.randomBytes(8).toString('hex').toUpperCase();
                const newExpiry = new Date();
                console.log(`Generated new code for ${mosque.name}: ${newCode} (${newCode.length} characters)`);
                console.log(`Old code was: ${oldCode} (${oldCode.length} characters)`);
                newExpiry.setDate(newExpiry.getDate() + parseInt(expiry_days));

                // Find and update associated admin status (if any)
                let adminStatusChanged = null;
                try {
                    const admin = await Admin.findOne({ mosque_id: mosqueId, status: 'approved' });
                    if (admin) {
                        adminStatusChanged = {
                            name: admin.name,
                            email: admin.email,
                            phone: admin.phone
                        };

                        // Update admin status to code_regenerated instead of deleting
                        await Admin.findByIdAndUpdate(admin._id, {
                            status: 'code_regenerated',
                            code_regeneration_reason: 'Mosque verification code was regenerated by super admin',
                            code_regeneration_date: new Date(),
                            code_regenerated_by: req.user._id,
                            previous_mosque_code: oldCode,
                            code_regenerated_mosque_name: mosque.name,
                            code_regenerated_mosque_location: mosque.location,
                            can_reapply: true
                        });
                        console.log(`Changed admin ${admin.email} status to code_regenerated for mosque ${mosque.name}`);
                    }
                } catch (adminError) {
                    console.warn(`Failed to update admin status for mosque ${mosqueId}:`, adminError);
                }

                // Update mosque with new code
                mosque.verification_code = newCode;
                mosque.verification_code_expires = newExpiry;
                await mosque.save();

                console.log(`Successfully regenerated code for mosque: ${mosque.name}`);

                // Add to successful updates
                updatedMosques.push({
                    mosque_id: mosqueId,
                    mosque_name: mosque.name,
                    old_code: oldCode,
                    new_code: newCode,
                    new_expiry: newExpiry.toISOString(),
                    admin_status_changed: adminStatusChanged
                });

                successCount++;

                // Create audit log for this mosque
                try {
                    const auditLogger = new AuditLogger(req);
                    if (mosque_ids.length === 1) {
                        // Single mosque - create individual audit log
                        console.log(`Creating individual audit log for mosque: ${mosque.name}`);
                        await auditLogger.logCodeRegenerated(mosque, oldCode, newCode, newExpiry);
                        console.log(`✅ Individual audit log created successfully`);
                    }
                    // Also log the admin status change if there was one
                    if (adminStatusChanged) {
                        await auditLogger.logAdminCodeRegenerated(adminStatusChanged, mosque, oldCode, newCode);
                        console.log(`✅ Admin code regeneration audit log created for ${adminStatusChanged.email}`);
                    }
                    // For multiple mosques, we'll create a bulk audit log below
                } catch (auditError) {
                    console.error(`❌ Failed to create audit log for mosque ${mosqueId}:`, auditError);
                }

            } catch (error) {
                console.error(`Failed to regenerate code for mosque ${mosqueId}:`, error);
                failedMosques.push({
                    mosque_id: mosqueId,
                    error: error.message
                });
                failedCount++;
            }
        }

        // Create bulk audit log if multiple mosques were processed
        if (mosque_ids.length > 1) {
            try {
                console.log(`Creating bulk audit log for ${mosque_ids.length} mosques (${successCount} successful, ${failedCount} failed)`);
                const auditLogger = new AuditLogger(req);
                await auditLogger.logBulkCodeRegeneration(successCount, failedCount, expiry_days);
                console.log(`✅ Bulk audit log created successfully`);
            } catch (auditError) {
                console.error('❌ Failed to create bulk audit log:', auditError);
            }
        }

        console.log(`Code regeneration completed: ${successCount} successful, ${failedCount} failed`);

        // Determine audit log type for frontend
        const auditLogType = mosque_ids.length === 1 ? 'Code Regenerated' : 'BULK CODE REGENERATION COMPLETED';

        res.json({
            message: `Code regeneration completed: ${successCount} successful, ${failedCount} failed`,
            summary: {
                total_requested: mosque_ids.length,
                successful: successCount,
                failed: failedCount,
                audit_log_type: auditLogType
            },
            updated_mosques: updatedMosques,
            failed_mosques: failedMosques.length > 0 ? failedMosques : undefined
        });

    } catch (err) {
        console.error('Error in multiple code regeneration:', err);
        res.status(500).json({
            error: 'Failed to regenerate verification codes',
            details: err.message
        });
    }
});

export default router;