const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const SuperAdmin = require('../models/SuperAdmin');
const Mosque = require('../models/Mosque');
const { auth, requireSuperAdmin } = require('../middleware/auth');
const AuditLogger = require('../utils/auditLogger');

const router = express.Router();

// Admin Login
router.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required',
                code: 'MISSING_CREDENTIALS'
            });
        }

        // Validate email with domain restriction
        const allowedEmailDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com', 'protonmail.com'];
        const emailDomainRegex = new RegExp(`^[a-zA-Z0-9._%+-]+@(${allowedEmailDomains.join('|').replace(/\./g, '\\.')})$`, 'i');

        if (!emailDomainRegex.test(email.trim())) {
            return res.status(400).json({
                error: `Email must be from one of these providers: ${allowedEmailDomains.join(', ')}`,
                code: 'INVALID_EMAIL_DOMAIN'
            });
        }

        const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
        if (!admin) {
            return res.status(401).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        console.log('\n=== ADMIN LOGIN DEBUG ===');
        console.log('Admin found:', admin.email);
        console.log('Admin _id (raw):', admin._id);
        console.log('Admin _id (toString):', admin._id.toString());
        console.log('Admin _id type:', typeof admin._id);
        console.log('Admin _id constructor:', admin._id.constructor.name);

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Check admin status - Issue LIMITED tokens for rejected/pending/mosque_deleted to allow status page access
        if (admin.status === 'rejected') {
            // Issue a limited token for status page access only
            const limitedToken = jwt.sign(
                { userId: admin._id.toString(), role: 'admin', status: 'rejected', limited: true },
                process.env.JWT_SECRET,
                { expiresIn: '7d' } // 7 days to allow reapplication
            );

            console.log('REJECTED LOGIN - Admin ID:', admin._id.toString());
            console.log('REJECTED LOGIN - Token generated for userId:', admin._id.toString());

            return res.status(403).json({
                error: 'Your application has been rejected',
                code: 'ACCOUNT_REJECTED',
                status: 'rejected',
                token: limitedToken, // Provide token for status page access
                admin: {
                    _id: admin._id.toString(),
                    name: admin.name,
                    email: admin.email,
                    phone: admin.phone,
                    status: admin.status,
                    mosque_id: admin.mosque_id
                },
                rejection_reason: admin.rejection_reason || 'No reason provided',
                rejection_date: admin.rejection_date,
                rejection_count: admin.rejection_count,
                can_reapply: admin.can_reapply,
                message: admin.can_reapply
                    ? 'You are allowed to reapply. Please contact support or submit a new application.'
                    : 'You cannot reapply at this time. Please contact support for assistance.'
            });
        }

        if (admin.status === 'mosque_deleted') {
            // Issue a limited token for status page access only
            const limitedToken = jwt.sign(
                { userId: admin._id.toString(), role: 'admin', status: 'mosque_deleted', limited: true },
                process.env.JWT_SECRET,
                { expiresIn: '30d' } // 30 days to allow reapplication
            );

            console.log('MOSQUE DELETED LOGIN - Admin ID:', admin._id.toString());
            console.log('MOSQUE DELETED LOGIN - Token generated for userId:', admin._id.toString());

            return res.status(403).json({
                error: 'Your mosque has been deleted',
                code: 'MOSQUE_DELETED',
                status: 'mosque_deleted',
                token: limitedToken, // Provide token for status page access
                admin: {
                    _id: admin._id.toString(),
                    name: admin.name,
                    email: admin.email,
                    phone: admin.phone,
                    status: admin.status,
                    mosque_id: admin.mosque_id
                },
                mosque_deletion_reason: admin.mosque_deletion_reason || 'No reason provided',
                mosque_deletion_date: admin.mosque_deletion_date,
                deleted_mosque_name: admin.deleted_mosque_name,
                deleted_mosque_location: admin.deleted_mosque_location,
                can_reapply: admin.can_reapply,
                message: admin.can_reapply
                    ? 'Your mosque was deleted by the Super Admin. You can reapply for a different mosque.'
                    : 'Your mosque was deleted. Please contact the Super Admin for assistance.'
            });
        }

        if (admin.status === 'admin_removed') {
            // Issue a limited token for status page access only
            const limitedToken = jwt.sign(
                { userId: admin._id.toString(), role: 'admin', status: 'admin_removed', limited: true },
                process.env.JWT_SECRET,
                { expiresIn: '30d' } // 30 days to allow reapplication
            );

            console.log('ADMIN REMOVED LOGIN - Admin ID:', admin._id.toString());
            console.log('ADMIN REMOVED LOGIN - Token generated for userId:', admin._id.toString());

            return res.status(403).json({
                error: 'You have been removed from your mosque',
                code: 'ADMIN_REMOVED',
                status: 'admin_removed',
                token: limitedToken, // Provide token for status page access
                admin: {
                    _id: admin._id.toString(),
                    name: admin.name,
                    email: admin.email,
                    phone: admin.phone,
                    status: admin.status,
                    mosque_id: admin.mosque_id
                },
                admin_removal_reason: admin.admin_removal_reason || 'No reason provided',
                admin_removal_date: admin.admin_removal_date,
                removed_from_mosque_name: admin.removed_from_mosque_name,
                removed_from_mosque_location: admin.removed_from_mosque_location,
                can_reapply: admin.can_reapply,
                message: admin.can_reapply
                    ? 'You have been removed from your mosque by the Super Admin. You can reapply for a different mosque or the same mosque.'
                    : 'You have been removed from your mosque. Please contact the Super Admin for assistance.'
            });
        }

        if (admin.status === 'pending') {
            // Issue a limited token for status page access only
            const limitedToken = jwt.sign(
                { userId: admin._id.toString(), role: 'admin', status: 'pending', limited: true },
                process.env.JWT_SECRET,
                { expiresIn: '7d' } // 7 days validity
            );

            console.log('PENDING LOGIN - Admin ID:', admin._id.toString());
            console.log('PENDING LOGIN - Token generated for userId:', admin._id.toString());

            return res.status(403).json({
                error: 'Your application is pending approval',
                code: 'PENDING_APPROVAL',
                status: 'pending',
                token: limitedToken, // Provide token for status page access
                admin: {
                    _id: admin._id.toString(),
                    name: admin.name,
                    email: admin.email,
                    phone: admin.phone,
                    status: admin.status,
                    mosque_id: admin.mosque_id
                },
                message: 'Please wait for Super Admin approval (usually within 24 hours).'
            });
        }

        if (admin.status !== 'approved') {
            return res.status(401).json({
                error: 'Login failed: Your account is not approved.',
                code: 'NOT_APPROVED'
            });
        }

        const token = jwt.sign(
            { userId: admin._id, role: 'admin', mosque_id: admin.mosque_id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set cookie with token
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict'
        });

        // Log the admin login
        const auditLogger = new AuditLogger(req);
        await auditLogger.logLogin({ id: admin._id, name: admin.name, email: admin.email }, 'admin');

        res.json({
            message: 'Admin login successful',
            token,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                phone: admin.phone,
                mosque_id: admin.mosque_id
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            error: 'Server error during login',
            code: 'SERVER_ERROR'
        });
    }
});

// Admin Register with verification code
router.post('/admin/register', async (req, res) => {
    try {
        const { name, email, password, phone, mosque_id, verification_code, application_notes } = req.body;

        // Validate required fields
        if (!name || !email || !password || !phone || !mosque_id || !verification_code) {
            return res.status(400).json({
                error: 'Name, email, password, phone number, mosque ID, and verification code are required'
            });
        }

        // Validate name
        if (name.trim().length < 2) {
            return res.status(400).json({
                error: 'Name must be at least 2 characters long',
                code: 'INVALID_NAME_LENGTH'
            });
        }

        if (name.trim().length > 50) {
            return res.status(400).json({
                error: 'Name must not exceed 50 characters',
                code: 'INVALID_NAME_LENGTH'
            });
        }

        // Validate name format - only letters, spaces, hyphens, apostrophes
        const nameRegex = /^[a-zA-Z\s\-']+$/;
        if (!nameRegex.test(name.trim())) {
            return res.status(400).json({
                error: 'Name can only contain letters, spaces, hyphens and apostrophes',
                code: 'INVALID_NAME_FORMAT'
            });
        }

        // Validate email with domain restriction
        const allowedEmailDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com', 'protonmail.com'];
        const emailDomainRegex = new RegExp(`^[a-zA-Z0-9._%+-]+@(${allowedEmailDomains.join('|').replace(/\./g, '\\.')})$`, 'i');

        if (!emailDomainRegex.test(email.trim())) {
            return res.status(400).json({
                error: `Email must be from one of these providers: ${allowedEmailDomains.join(', ')}`,
                code: 'INVALID_EMAIL_DOMAIN'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters long',
                code: 'INVALID_PASSWORD_LENGTH'
            });
        }

        if (password.length > 50) {
            return res.status(400).json({
                error: 'Password must not exceed 50 characters',
                code: 'INVALID_PASSWORD_LENGTH'
            });
        }

        // Enhanced password validation with special characters
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)',
                code: 'INVALID_PASSWORD_FORMAT'
            });
        }

        // Validate Pakistani phone number format: +923xxxxxxxxx (11 digits after +92)
        const phoneRegex = /^\+923[0-9]{9}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                error: 'Invalid phone number format. Phone number must start with +923 followed by 9 digits (e.g., +923001234567)'
            });
        }

        // Validate application notes length if provided
        if (application_notes && application_notes.trim().length > 500) {
            return res.status(400).json({
                error: 'Application notes must not exceed 500 characters',
                code: 'INVALID_NOTES_LENGTH'
            });
        }

        // Check if admin already exists with this email
        const existingAdmin = await Admin.findOne({ email: email.toLowerCase().trim() });
        if (existingAdmin) {
            // Check if the existing admin is rejected
            if (existingAdmin.status === 'rejected') {
                return res.status(403).json({
                    error: 'This email was previously rejected and cannot be used for registration',
                    code: 'REJECTED_EMAIL',
                    message: existingAdmin.can_reapply
                        ? 'Your previous application was rejected. Please contact support to discuss reapplication options.'
                        : 'This email address is not eligible for registration. Please use a different email or contact support.',
                    rejection_info: {
                        rejection_count: existingAdmin.rejection_count,
                        can_reapply: existingAdmin.can_reapply,
                        rejection_reason: existingAdmin.rejection_reason
                    }
                });
            }

            return res.status(409).json({
                error: 'An admin with this email already exists',
                code: 'DUPLICATE_EMAIL'
            });
        }

        // Check if admin already exists with this phone number
        const existingAdminPhone = await Admin.findOne({ phone: phone.trim() });
        if (existingAdminPhone) {
            // Check if the existing admin is rejected
            if (existingAdminPhone.status === 'rejected') {
                return res.status(403).json({
                    error: 'This phone number was previously rejected and cannot be used for registration',
                    code: 'REJECTED_PHONE',
                    message: existingAdminPhone.can_reapply
                        ? 'Your previous application was rejected. Please contact support to discuss reapplication options.'
                        : 'This phone number is not eligible for registration. Please use a different number or contact support.',
                    rejection_info: {
                        rejection_count: existingAdminPhone.rejection_count,
                        can_reapply: existingAdminPhone.can_reapply,
                        rejection_reason: existingAdminPhone.rejection_reason
                    }
                });
            }

            return res.status(409).json({
                error: 'An admin with this phone number already exists',
                code: 'DUPLICATE_PHONE'
            });
        }

        // Check if mosque exists and verify code
        const mosque = await Mosque.findById(mosque_id);
        if (!mosque) {
            return res.status(404).json({
                error: 'Mosque not found',
                code: 'MOSQUE_NOT_FOUND'
            });
        }

        // Verify the mosque verification code
        if (mosque.verification_code !== verification_code) {
            return res.status(400).json({
                error: 'Invalid verification code for this mosque',
                message: 'Contact the mosque management to get the correct verification code',
                code: 'INVALID_VERIFICATION_CODE'
            });
        }

        // Check if verification code is expired
        if (new Date() > mosque.verification_code_expires) {
            return res.status(400).json({
                error: 'Verification code has expired',
                message: 'The verification code for this mosque has expired. Please contact the mosque management for a new code.',
                contact_info: {
                    phone: mosque.contact_phone,
                    email: mosque.contact_email
                },
                expired_on: mosque.verification_code_expires,
                days_expired: Math.floor((new Date() - mosque.verification_code_expires) / (1000 * 60 * 60 * 24)),
                code: 'VERIFICATION_CODE_EXPIRED'
            });
        }

        // Check if mosque already has an admin (approved or pending)
        const existingMosqueAdmin = await Admin.findOne({
            mosque_id: mosque_id,
            status: { $in: ['approved', 'pending'] }
        });

        if (existingMosqueAdmin) {
            return res.status(400).json({
                error: 'This mosque already has an admin or a pending admin request',
                mosque_admin_status: existingMosqueAdmin.status,
                code: 'ADMIN_ALREADY_EXISTS'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = new Admin({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            phone: phone.trim(),
            mosque_id,
            status: 'pending',
            verification_code_used: verification_code,
            application_notes: application_notes ? application_notes.trim() : ''
        });

        await admin.save();
        await admin.populate('mosque_id', 'name location');

        // Log the admin registration
        const auditLogger = new AuditLogger(req);
        await auditLogger.logAdminRegistered(admin, mosque);

        res.status(201).json({
            message: 'Registration successful. Waiting for super admin approval.',
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
        console.error('Registration error:', err);

        // Handle duplicate key errors
        if (err.code === 11000) {
            return res.status(409).json({
                error: 'An admin with this information already exists',
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

// Get mosque verification requirements (public endpoint)
router.get('/mosque/:id/verification-info', async (req, res) => {
    try {
        const mosque = await Mosque.findById(req.params.id).select('name location contact_phone contact_email admin_instructions');
        if (!mosque) {
            return res.status(404).json({ error: 'Mosque not found' });
        }

        res.json({
            mosque: {
                name: mosque.name,
                location: mosque.location,
                contact_phone: mosque.contact_phone,
                contact_email: mosque.contact_email,
                admin_instructions: mosque.admin_instructions
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});// Super Admin Login
router.post('/superadmin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const allowedDomainsRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|outlook\.com|yahoo\.com|hotmail\.com)$/i;

        // .test() returns true if there is a match, otherwise false
        if (!allowedDomainsRegex.test(email)) {
            return res.status(400).json({ error: 'Incorrect email format' });
        }
        const superAdmin = await SuperAdmin.findOne({ email });
        if (!superAdmin) return res.status(401).json({ error: 'Invalid credentials' });
        const isMatch = await bcrypt.compare(password, superAdmin.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ userId: superAdmin._id, role: 'super_admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });

        // Set cookie with token
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict'
        });

        // Log the super admin login
        const auditLogger = new AuditLogger(req);
        await auditLogger.logLogin({ id: superAdmin._id, email: superAdmin.email }, 'super_admin');

        res.json({
            message: 'Super admin login successful',
            token,
            super_admin: { id: superAdmin._id, email }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Super Admin Register (for initial setup or existing super admin creating new ones)
router.post('/superadmin/register', async (req, res, next) => {
    // This logic decides IF authentication is needed for this specific request
    const superAdminCount = await SuperAdmin.countDocuments();
    if (superAdminCount > 0) {
        // If super admins exist, run the standard auth and authorization middleware
        // The middleware will handle sending the error response if it fails
        auth(req, res, () => requireSuperAdmin(req, res, next));
    } else {
        // If it's the first ever super admin, skip auth and go to the route handler
        next();
    }
}, async (req, res) => {
    // This is the main route handler. It only runs if the middleware above calls next().
    try {
        const { email, password } = req.body;

        const allowedDomainsRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|outlook\.com|yahoo\.com|hotmail\.com)$/i;

        if (!allowedDomainsRegex.test(email)) {
            res.status(400).json({ error: 'Incorrect email format' })
        }

        if (password.length < 7) {
            res.status(400).json({ error: 'Password length should be 8 character' })

        }

        const existingSuperAdmin = await SuperAdmin.findOne({ email });
        if (existingSuperAdmin) return res.status(400).json({ error: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const superAdmin = new SuperAdmin({ email, password: hashedPassword });
        await superAdmin.save();
        res.status(201).json({ message: 'Super admin registered', super_admin: { id: superAdmin._id, email } });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Logout endpoint - clear cookie
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logout successful' });
});

// Request Reapplication - NEW (For rejected admins who are allowed to reapply)
router.post('/admin/request-reapplication', auth, async (req, res) => {
    try {
        const { new_verification_code, reason_for_reapplication, mosque_id } = req.body;

        // Validate inputs
        if (!new_verification_code || !reason_for_reapplication || !mosque_id) {
            return res.status(400).json({
                error: 'Verification code, reason for reapplication, and mosque ID are required',
                code: 'MISSING_FIELDS'
            });
        }

        if (reason_for_reapplication.trim().length < 50) {
            return res.status(400).json({
                error: 'Reason for reapplication must be at least 50 characters',
                code: 'INVALID_REASON_LENGTH'
            });
        }

        // Find the admin making the request
        const admin = await Admin.findById(req.user.userId);

        if (!admin) {
            return res.status(404).json({
                error: 'Admin not found',
                code: 'ADMIN_NOT_FOUND'
            });
        }

        // Check if admin is rejected or mosque_deleted
        if (admin.status !== 'rejected' && admin.status !== 'mosque_deleted') {
            return res.status(400).json({
                error: 'Only rejected or mosque_deleted admins can request reapplication',
                code: 'INVALID_STATUS'
            });
        }

        // Check if admin is allowed to reapply
        if (!admin.can_reapply) {
            return res.status(403).json({
                error: 'You are not allowed to reapply at this time',
                code: 'REAPPLICATION_NOT_ALLOWED',
                message: 'Please contact support for assistance.',
                rejection_count: admin.rejection_count
            });
        }

        // Verify mosque exists
        const mosque = await Mosque.findById(mosque_id);
        if (!mosque) {
            return res.status(404).json({
                error: 'Mosque not found',
                code: 'MOSQUE_NOT_FOUND'
            });
        }

        // Verify the mosque verification code
        if (mosque.verification_code !== new_verification_code) {
            return res.status(400).json({
                error: 'Invalid verification code for this mosque',
                code: 'INVALID_VERIFICATION_CODE'
            });
        }

        // Check if verification code is expired
        if (new Date() > mosque.verification_code_expires) {
            return res.status(400).json({
                error: 'Verification code has expired',
                code: 'EXPIRED_VERIFICATION_CODE'
            });
        }

        // Store the previous status for audit logging
        const previousStatus = admin.status;
        const wasMosqueDeleted = previousStatus === 'mosque_deleted';
        const wasRejected = previousStatus === 'rejected';

        // BUSINESS RULES:
        // 1. Rejected admins CAN reapply to the SAME mosque (allowed to improve application)
        // 2. Mosque_deleted admins CANNOT apply to the same deleted mosque (it doesn't exist anymore)
        //    - But since the mosque is deleted, they physically can't apply to it anyway
        //    - This check is just for safety and logging

        if (wasMosqueDeleted) {
            // Mosque_deleted admins can only apply to NEW mosques
            // The deleted mosque doesn't exist in the system anymore
            console.log('Mosque_deleted admin applying to new mosque:', {
                admin: admin.email,
                deleted_mosque: admin.deleted_mosque_name,
                new_mosque: mosque.name
            });

            // Additional safety check: ensure they're not somehow trying to apply to a non-existent mosque
            // (This shouldn't happen, but good to validate)
        } else if (wasRejected) {
            // Rejected admins CAN reapply to the SAME mosque OR a different one
            // We allow this because they might have improved their application
            const previouslyRejectedFromThisMosque = admin.previous_mosque_ids.some(
                pm => pm.mosque_id && pm.mosque_id.toString() === mosque_id.toString()
            );

            if (previouslyRejectedFromThisMosque) {
                console.log('Rejected admin reapplying to previously rejected mosque:', {
                    admin: admin.email,
                    mosque: mosque.name,
                    rejection_count: admin.rejection_count
                });
                // ALLOW the reapplication - they can try again
            } else {
                console.log('Rejected admin applying to new mosque:', {
                    admin: admin.email,
                    mosque: mosque.name
                });
            }
        }

        const previousMosqueInfo = wasMosqueDeleted ? {
            deleted_mosque_name: admin.deleted_mosque_name,
            deleted_mosque_location: admin.deleted_mosque_location,
            deletion_reason: admin.mosque_deletion_reason
        } : null;

        // Update admin to pending status with new mosque
        admin.status = 'pending';
        admin.mosque_id = mosque_id;
        admin.verification_code_used = new_verification_code;
        admin.can_reapply = false; // Reset until next rejection
        admin.application_notes = `REAPPLICATION: ${reason_for_reapplication.trim()}`;

        // Clear mosque deletion fields if this was a mosque_deleted admin
        if (admin.mosque_deletion_reason || admin.deleted_mosque_name) {
            admin.mosque_deletion_reason = null;
            admin.mosque_deletion_date = null;
            admin.deleted_mosque_name = null;
            admin.deleted_mosque_location = null;
        }

        await admin.save();

        // Audit log
        const auditLogger = new AuditLogger(req);
        await auditLogger.log({
            action: 'ADMIN_REAPPLICATION_SUBMITTED',
            performedBy: admin._id,
            targetModel: 'Admin',
            targetId: admin._id,
            details: {
                admin_name: admin.name,
                admin_email: admin.email,
                mosque_name: mosque.name,
                mosque_location: mosque.location,
                reason: reason_for_reapplication.trim(),
                previous_status: previousStatus,
                rejection_count: admin.rejection_count,
                ...(wasMosqueDeleted && previousMosqueInfo ? { previous_mosque_info: previousMosqueInfo } : {})
            }
        });

        res.json({
            success: true,
            message: previousStatus === 'mosque_deleted'
                ? 'Reapplication submitted successfully. You are now applying for a new mosque.'
                : 'Reapplication submitted successfully',
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
            },
            previous_status: previousStatus,
            next_steps: 'Your reapplication is now pending. Please wait for Super Admin approval.'
        });

    } catch (error) {
        console.error('Error processing reapplication:', error);
        res.status(500).json({
            error: 'Server error during reapplication',
            code: 'SERVER_ERROR'
        });
    }
});

// Get Current Admin Status - NEW
router.get('/admin/me', auth, async (req, res) => {
    try {
        console.log('GET /admin/me - req.user:', req.user);
        console.log('GET /admin/me - userId:', req.user.userId);

        const admin = await Admin.findById(req.user.userId)
            .populate('mosque_id', 'name location')
            .select('-password');

        console.log('GET /admin/me - admin found:', admin ? admin.email : 'NOT FOUND');

        if (!admin) {
            return res.status(404).json({
                error: 'Admin not found',
                code: 'ADMIN_NOT_FOUND'
            });
        }

        const responseData = {
            success: true,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                phone: admin.phone,
                status: admin.status,
                mosque: admin.mosque_id,
                rejection_info: admin.status === 'rejected' ? {
                    rejection_reason: admin.rejection_reason,
                    rejection_date: admin.rejection_date,
                    rejection_count: admin.rejection_count,
                    can_reapply: admin.can_reapply
                } : null,
                mosque_deletion_info: admin.status === 'mosque_deleted' ? {
                    mosque_deletion_reason: admin.mosque_deletion_reason,
                    mosque_deletion_date: admin.mosque_deletion_date,
                    deleted_mosque_name: admin.deleted_mosque_name,
                    deleted_mosque_location: admin.deleted_mosque_location,
                    can_reapply: admin.can_reapply
                } : null,
                admin_removal_info: admin.status === 'admin_removed' ? {
                    admin_removal_reason: admin.admin_removal_reason,
                    admin_removal_date: admin.admin_removal_date,
                    removed_from_mosque_name: admin.removed_from_mosque_name,
                    removed_from_mosque_location: admin.removed_from_mosque_location,
                    can_reapply: admin.can_reapply
                } : null,
                created_at: admin.createdAt
            }
        };

        console.log('GET /admin/me - Sending response for:', admin.email, 'status:', admin.status);
        res.json(responseData);

    } catch (error) {
        console.error('Error fetching admin profile:', error);
        res.status(500).json({
            error: 'Server error',
            code: 'SERVER_ERROR',
            details: error.message
        });
    }
});

module.exports = router;
