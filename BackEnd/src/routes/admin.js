const express = require('express');
const Admin = require('../models/Admin');
const Mosque = require('../models/Mosque');
const { auth } = require('../middleware/auth');
const AuditLogger = require('../utils/auditLogger');

const router = express.Router();

// Get Admin Status
router.get('/status', auth, async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.userId).populate('mosque_id', 'name location');
        if (!admin) return res.status(404).json({ error: 'Admin not found' });
        res.json({ admin });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Reapply for mosque admin (for rejected admins who are allowed to reapply)
router.post('/reapply', auth, async (req, res) => {
    console.log('=== REAPPLY ENDPOINT HIT ===');
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Request user:', req.user);

    try {
        const { mosque_verification_code, application_notes } = req.body;

        console.log('Reapplication request:', {
            userId: req.user?.userId || req.user?.id,
            mosque_verification_code: mosque_verification_code?.substring(0, 4) + '...',
            has_notes: !!application_notes
        });

        // Find the admin - try both userId and id
        const adminId = req.user.userId || req.user.id;
        console.log('Looking for admin with ID:', adminId);
        console.log('Admin ID type:', typeof adminId);

        // Don't populate mosque_id since rejected admins have null mosque_id
        const admin = await Admin.findById(adminId);
        console.log('Admin query result:', admin ? `Found: ${admin.name}` : 'NOT FOUND');

        if (!admin) {
            console.error('Admin not found with ID:', adminId);
            console.error('req.user object:', JSON.stringify(req.user, null, 2));
            return res.status(404).json({
                success: false,
                error: 'Admin account not found. Please contact support.',
                code: 'ADMIN_NOT_FOUND',
                debug: {
                    searchedId: adminId,
                    userObject: req.user
                }
            });
        }

        console.log('Admin found:', { id: admin._id, status: admin.status, can_reapply: admin.can_reapply });

        // Check if admin is rejected or mosque_deleted
        if (admin.status !== 'rejected' && admin.status !== 'mosque_deleted') {
            return res.status(400).json({
                success: false,
                error: `Only rejected or mosque_deleted admins can reapply. Your current status is: ${admin.status}`,
                code: 'INVALID_STATUS',
                current_status: admin.status
            });
        }

        // Check if admin is allowed to reapply
        if (!admin.can_reapply) {
            return res.status(403).json({
                success: false,
                error: 'You are not allowed to reapply. Please contact the super admin for permission.',
                code: 'REAPPLICATION_NOT_ALLOWED',
                rejection_count: admin.rejection_count
            });
        }

        // Validate verification code
        if (!mosque_verification_code || mosque_verification_code.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Mosque verification code is required',
                code: 'VERIFICATION_CODE_REQUIRED'
            });
        }

        // Validate verification code format
        const codePattern = /^[A-Z0-9]{8,20}$/i;
        if (!codePattern.test(mosque_verification_code.trim())) {
            console.log('Invalid code format:', mosque_verification_code);
            return res.status(400).json({
                success: false,
                error: 'Invalid verification code format. Code must be 8-20 alphanumeric characters.',
                code: 'INVALID_CODE_FORMAT'
            });
        }

        const normalizedCode = mosque_verification_code.trim().toUpperCase();
        console.log('Searching for mosque with code:', normalizedCode);

        // Find mosque with matching verification code
        const mosque = await Mosque.findOne({
            verification_code: normalizedCode
        });

        console.log('Mosque search result:', mosque ? `Found: ${mosque.name} (${mosque._id})` : 'NOT FOUND');

        if (!mosque) {
            console.log('Invalid verification code attempted:', normalizedCode);

            // Check if mosque exists at all for debugging
            const allMosques = await Mosque.find({}, 'name verification_code').limit(5);
            console.log('Sample mosques in database:', allMosques.map(m => ({
                name: m.name,
                code: m.verification_code
            })));

            return res.status(404).json({
                success: false,
                error: 'Invalid verification code. Please verify the code with the mosque administration.',
                code: 'INVALID_VERIFICATION_CODE'
            });
        }

        console.log('Mosque found:', { id: mosque._id, name: mosque.name, code: mosque.verification_code });

        // Check if verification code is expired
        if (new Date() > mosque.verification_code_expires) {
            console.log('Expired code:', { mosque: mosque.name, expired_on: mosque.verification_code_expires });
            return res.status(400).json({
                success: false,
                error: `This verification code expired on ${new Date(mosque.verification_code_expires).toLocaleDateString()}. Please request a new code from the mosque.`,
                code: 'VERIFICATION_CODE_EXPIRED',
                expired_date: mosque.verification_code_expires,
                mosque_name: mosque.name
            });
        }

        // Check if mosque already has a DIFFERENT admin (not the current admin reapplying)
        const existingAdmin = await Admin.findOne({
            mosque_id: mosque._id,
            status: { $in: ['approved', 'pending'] },
            _id: { $ne: admin._id } // Exclude the current admin from this check
        });

        if (existingAdmin) {
            console.log('Security breach detected - mosque already has admin:', {
                mosque: mosque.name,
                existing_admin: existingAdmin.name
            });

            // Security: Regenerate verification code since it was breached
            const crypto = require('crypto');
            const newCode = crypto.randomBytes(8).toString('hex').toUpperCase();
            const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

            const oldCode = mosque.verification_code;
            mosque.verification_code = newCode;
            mosque.verification_code_expires = expiryDate;
            await mosque.save();

            console.log('Verification code regenerated for security:', { mosque: mosque.name, new_code: newCode });

            // Log the security breach - wrapped in try-catch to prevent audit errors from failing the request
            try {
                const auditLogger = new AuditLogger(req);
                await auditLogger.log({
                    action: 'VERIFICATION_CODE_BREACH',
                    performedBy: admin._id,
                    targetModel: 'Mosque',
                    targetId: mosque._id,
                    details: {
                        admin_name: admin.name,
                        admin_email: admin.email,
                        mosque_name: mosque.name,
                        old_code: oldCode,
                        new_code: newCode,
                        reason: 'Mosque already has an admin - code regenerated for security'
                    }
                });
                console.log('Security breach audit log created');
            } catch (auditError) {
                console.error('Failed to create security breach audit log (non-critical):', auditError);
            }

            return res.status(400).json({
                success: false,
                error: `${mosque.name} already has an admin (${existingAdmin.name}). The verification code has been regenerated for security. Please contact the mosque for a new code.`,
                code: 'MOSQUE_HAS_ADMIN',
                mosque_name: mosque.name,
                existing_admin_name: existingAdmin.name
            });
        }

        // Update admin for reapplication
        console.log('Updating admin for reapplication:', { admin: admin.name, mosque: mosque.name });

        // Store previous mosque info if this is a reapplication to a different mosque
        if (admin.mosque_id && admin.mosque_id.toString() !== mosque._id.toString()) {
            if (!admin.previous_mosque_ids) {
                admin.previous_mosque_ids = [];
            }
            admin.previous_mosque_ids.push({
                mosque_id: admin.mosque_id,
                rejected_at: admin.rejected_at || new Date(),
                rejection_reason: admin.rejection_reason || 'No reason provided'
            });
            console.log('Stored previous mosque info:', admin.previous_mosque_ids[admin.previous_mosque_ids.length - 1]);
        }

        admin.mosque_id = mosque._id;
        admin.verification_code_used = mosque_verification_code.trim().toUpperCase();
        admin.application_notes = application_notes || 'Reapplying for mosque admin position';
        admin.status = 'pending'; // Reset to pending
        admin.can_reapply = false; // Reset reapply flag

        // Clear rejection fields if coming from rejected status
        admin.rejection_reason = null;
        admin.rejected_at = null;
        admin.rejected_by = null;

        // Clear mosque deletion fields if coming from mosque_deleted status
        admin.mosque_deletion_reason = null;
        admin.mosque_deletion_date = null;
        admin.deleted_mosque_name = null;
        admin.deleted_mosque_location = null;

        await admin.save();
        console.log('Admin updated successfully:', {
            admin_id: admin._id,
            status: admin.status,
            mosque_id: admin.mosque_id,
            can_reapply: admin.can_reapply
        });

        // Audit log - wrapped in try-catch to prevent audit log errors from affecting the main flow
        try {
            const auditLogger = new AuditLogger(req);
            await auditLogger.log({
                action: 'ADMIN_REAPPLICATION',
                performedBy: admin._id,
                targetModel: 'Admin',
                targetId: admin._id,
                details: {
                    admin_name: admin.name,
                    admin_email: admin.email,
                    mosque_id: mosque._id,
                    mosque_name: mosque.name,
                    previous_rejection_count: admin.rejection_count,
                    notes: application_notes
                }
            });
            console.log('Audit log created successfully');
        } catch (auditError) {
            console.error('Failed to create audit log (non-critical):', auditError);
            // Don't fail the reapplication if audit logging fails
        }

        console.log('Reapplication successful:', {
            admin: admin.name,
            mosque: mosque.name,
            status: admin.status
        });

        res.json({
            success: true,
            message: `Reapplication submitted successfully! Your application for ${mosque.name} is now pending approval.`,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                status: admin.status,
                mosque: {
                    id: mosque._id,
                    name: mosque.name,
                    location: mosque.location
                }
            }
        });

    } catch (error) {
        console.error('Error during reapplication:', error);
        console.error('Error stack:', error.stack);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);

        // Provide more specific error messages based on error type
        let errorMessage = 'An unexpected error occurred while processing your reapplication. Please try again or contact support.';
        let errorCode = 'SERVER_ERROR';

        if (error.name === 'ValidationError') {
            errorMessage = 'Invalid data provided. Please check your information and try again.';
            errorCode = 'VALIDATION_ERROR';
        } else if (error.name === 'CastError') {
            errorMessage = 'Invalid ID format. Please contact support.';
            errorCode = 'CAST_ERROR';
        } else if (error.code === 11000) {
            errorMessage = 'Duplicate entry detected. This might be a duplicate application.';
            errorCode = 'DUPLICATE_ERROR';
        }

        res.status(500).json({
            success: false,
            error: errorMessage,
            code: errorCode,
            details: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                name: error.name,
                stack: error.stack
            } : undefined
        });
    }
});

module.exports = router;