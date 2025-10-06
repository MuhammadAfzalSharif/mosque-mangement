const express = require('express');
const Admin = require('../models/Admin');
const Mosque = require('../models/Mosque');
const AuditLog = require('../models/AuditLog');
const { auth, requireSuperAdmin } = require('../middleware/auth');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const AuditLogger = require('../utils/auditLogger');

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

        res.json({
            stats: {
                total_mosques: totalMosques,
                approved_mosques: approvedMosques,
                pending_requests: pendingMosques,
                rejected_requests: rejectedMosques
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
            newVerificationCode = crypto.randomBytes(8).toString('hex').toUpperCase();
            const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            await Mosque.findByIdAndUpdate(
                mosqueDetails.id,
                {
                    verification_code: newVerificationCode,
                    verification_code_expires: expiryDate
                }
            );
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
        res.status(500).json({
            error: 'Server error during rejection process',
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

        // Log the verification code regeneration
        const auditLogger = new AuditLogger(req);
        await auditLogger.logVerificationCodeRegenerated(mosque, 'old_code', newCode, mosque_admin);

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

        res.json({
            message: 'Mosque details updated successfully',
            mosque,
            updated_fields: Object.keys(updateData)
        });
    } catch (error) {
        console.error('Error updating mosque:', error);

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
        for (let mosque of expiredMosques) {
            const newCode = crypto.randomBytes(8).toString('hex').toUpperCase();
            const newExpiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            await Mosque.findByIdAndUpdate(mosque._id, {
                verification_code: newCode,
                verification_code_expires: newExpiryDate
            });

            updates.push({
                mosque_id: mosque._id,
                mosque_name: mosque.name,
                old_code: mosque.verification_code,
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
            end_date
        } = req.query;

        const AuditLog = require('../models/AuditLog');
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

        const auditLogs = await AuditLog.find(query)
            .sort({ timestamp: -1 })
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
        const AuditLog = require('../models/AuditLog');

        const stats = await AuditLog.aggregate([
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

        const userStats = await AuditLog.aggregate([
            {
                $group: {
                    _id: '$performed_by.user_type',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            action_stats: stats,
            user_stats: userStats,
            generated_at: new Date()
        });
    } catch (err) {
        console.error('Audit stats error:', err);
        res.status(500).json({ error: 'Server error' });
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

        // Audit log
        const auditLogger = new AuditLogger(req);
        await AuditLog.logAction({
            action_type: 'admin_reapplication_allowed',
            performed_by: auditLogger.getUserInfo(),
            target: {
                target_type: 'admin',
                target_id: admin._id,
                target_name: admin.name
            },
            action_details: {
                admin_name: admin.name,
                admin_email: admin.email,
                admin_phone: admin.phone,
                notes: notes || 'No notes provided',
                rejection_count: admin.rejection_count,
                ip_address: auditLogger.ip_address,
                user_agent: auditLogger.user_agent
            }
        });

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

module.exports = router;