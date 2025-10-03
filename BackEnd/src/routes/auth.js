const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const SuperAdmin = require('../models/SuperAdmin');
const Mosque = require('../models/Mosque');
const { auth, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// Admin Login
router.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const allowedDomainsRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|outlook\.com|yahoo\.com|hotmail\.com)$/i;

        // .test() returns true if there is a match, otherwise false
        if (!allowedDomainsRegex.test(email)) {
            return res.status(400).json({ error: 'Incorrect email format' });
        }


        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials ' });
        }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        if (admin.status !== 'approved') return res.status(401).json({ error: 'Login failed: Register first, or wait for Super Admin approval (24 hrs).' });



        const token = jwt.sign({ userId: admin._id, role: 'admin', mosque_id: admin.mosque_id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        // Set cookie with token
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict'
        });

        res.json({
            message: 'Admin login successful',
            token,
            admin: { id: admin._id, name: admin.name, email: admin.email, mosque_id: admin.mosque_id }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin Register with verification code
router.post('/admin/register', async (req, res) => {
    try {
        const { name, email, password, mosque_id, verification_code, application_notes } = req.body;

        // Validate required fields
        if (!name || !email || !password || !mosque_id || !verification_code) {
            return res.status(400).json({
                error: 'Name, email, password, mosque ID, and verification code are required'
            });
        }


        const allowedDomainsRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|outlook\.com|yahoo\.com|hotmail\.com)$/i;

        // .test() returns true if there is a match, otherwise false
        if (!allowedDomainsRegex.test(email)) {
            return res.status(400).json({ error: 'Incorrect email format' });
        }

        if (password.length < 7) {
            return res.status(400).json({ error: 'Password length should be at least 7 characters' });
        }



        // Check if admin already exists with this email
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ error: 'Admin with this email already exists' });
        }

        // Check if mosque exists and verify code
        const mosque = await Mosque.findById(mosque_id);
        if (!mosque) {
            return res.status(404).json({ error: 'Mosque not found' });
        }

        // Verify the mosque verification code
        if (mosque.verification_code !== verification_code) {
            return res.status(400).json({
                error: 'Invalid verification code for this mosque',
                message: 'Contact the mosque management to get the correct verification code'
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
                days_expired: Math.floor((new Date() - mosque.verification_code_expires) / (1000 * 60 * 60 * 24))
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
                mosque_admin_status: existingMosqueAdmin.status
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = new Admin({
            name,
            email,
            password: hashedPassword,
            mosque_id,
            status: 'pending',
            verification_code_used: verification_code,
            application_notes: application_notes || ''
        });

        await admin.save();
        await admin.populate('mosque_id', 'name location');

        res.status(201).json({
            message: 'Registration successful. Waiting for super admin approval.',
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                status: admin.status,
                mosque: admin.mosque_id
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Server error' });
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

module.exports = router;
