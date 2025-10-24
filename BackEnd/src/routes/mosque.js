import express from 'express';
import Mosque from '../models/Mosque.js';
import Admin from '../models/Admin.js';
import { auth, requireAdmin, requireSuperAdmin } from '../middleware/auth.js';
import crypto from 'crypto';
import AuditLogger from '../utils/auditLogger.js';

const router = express.Router();

// List All Mosques (Public)
router.get('/', async (req, res) => {
    try {
        const { search, page = 1, limit = 9 } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { name: new RegExp(search, 'i') },
                { location: new RegExp(search, 'i') }
            ];
        }

        const mosques = await Mosque.find(query)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Mosque.countDocuments(query);

        // Transform the response to match API spec - return ALL fields
        const transformedMosques = mosques.map(mosque => ({
            id: mosque._id,
            name: mosque.name,
            location: mosque.location,
            description: mosque.description || '',
            verification_code: mosque.verification_code || '',
            verification_code_expires: mosque.verification_code_expires || null,
            contact_email: mosque.contact_email || '',
            contact_phone: mosque.contact_phone || '',
            admin_instructions: mosque.admin_instructions || '',
            createdAt: mosque.createdAt,
            updatedAt: mosque.updatedAt,
            prayer_times: mosque.prayer_times || {
                fajr: null,
                dhuhr: null,
                asr: null,
                maghrib: null,
                isha: null,
                jummah: null
            }
        }));

        res.json({
            mosques: transformedMosques,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Single Mosque Details (Public)
router.get('/:id', async (req, res) => {
    try {
        const mosque = await Mosque.findById(req.params.id);
        if (!mosque) return res.status(404).json({ error: 'Mosque not found', code: 'MOSQUE_NOT_FOUND' });

        res.json({
            mosque: {
                id: mosque._id,
                name: mosque.name,
                location: mosque.location,
                description: mosque.description || '',
                verification_code: mosque.verification_code || '',
                verification_code_expires: mosque.verification_code_expires || null,
                contact_email: mosque.contact_email || '',
                contact_phone: mosque.contact_phone || '',
                admin_instructions: mosque.admin_instructions || '',
                createdAt: mosque.createdAt,
                updatedAt: mosque.updatedAt,
                prayer_times: mosque.prayer_times || {
                    fajr: null,
                    dhuhr: null,
                    asr: null,
                    maghrib: null,
                    isha: null,
                    jummah: null
                }
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Mosque Prayer Times (Public)
router.get('/:id/prayer-times', async (req, res) => {
    try {
        const mosque = await Mosque.findById(req.params.id);
        if (!mosque) return res.status(404).json({ error: 'Mosque not found', code: 'MOSQUE_NOT_FOUND' });

        res.json({
            mosque: {
                id: mosque._id,
                name: mosque.name,
                location: mosque.location
            },
            prayer_times: mosque.prayer_times || {
                fajr: null,
                dhuhr: null,
                asr: null,
                maghrib: null,
                isha: null,
                jummah: null
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// Update Prayer Times (Admin)
router.put('/:id/prayer-times', auth, requireAdmin, async (req, res) => {
    try {
        if (req.user.mosque_id.toString() !== req.params.id) return res.status(403).json({ error: 'Not authorized to update this mosque' });

        // Get current mosque data for audit logging
        const currentMosque = await Mosque.findById(req.params.id);
        if (!currentMosque) return res.status(404).json({ error: 'Mosque not found' });

        const oldPrayerTimes = currentMosque.prayer_times;
        const { fajr, dhuhr, asr, maghrib, isha, jummah } = req.body;
        const newPrayerTimes = { fajr, dhuhr, asr, maghrib, isha, jummah };

        const mosque = await Mosque.findByIdAndUpdate(req.params.id, { prayer_times: newPrayerTimes }, { new: true });

        // Log the prayer times update
        const auditLogger = new AuditLogger(req);
        await auditLogger.logPrayerTimesUpdated(mosque, oldPrayerTimes, newPrayerTimes);

        res.json({ message: 'Prayer times updated', prayer_times: mosque.prayer_times });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update Mosque Details (Admin)
router.put('/:id', auth, requireAdmin, async (req, res) => {
    try {
        if (req.user.mosque_id.toString() !== req.params.id) return res.status(403).json({ error: 'Not authorized to update this mosque' });

        // Get current mosque data for audit logging
        const currentMosque = await Mosque.findById(req.params.id);
        if (!currentMosque) return res.status(404).json({ error: 'Mosque not found' });

        const beforeData = {
            name: currentMosque.name,
            location: currentMosque.location,
            description: currentMosque.description
        };

        const { name, location, description } = req.body;
        const afterData = { name, location, description };

        const mosque = await Mosque.findByIdAndUpdate(req.params.id, afterData, { new: true });

        // Log the mosque details update
        const auditLogger = new AuditLogger(req);
        await auditLogger.logMosqueDetailsUpdated(mosque, beforeData, afterData);

        res.json({ message: 'Mosque details updated', mosque });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create New Mosque (Super Admin)
router.post('/', auth, requireSuperAdmin, async (req, res) => {
    try {
        const {
            name,
            location,
            description,
            contact_phone,
            contact_email,
            admin_instructions
        } = req.body;

        // Comprehensive validation for required fields
        if (!name || !location) {
            return res.status(400).json({
                error: 'Name and location are required',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }

        // Validate name
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

        // Validate name format - only letters, numbers, spaces, hyphens, and apostrophes
        const nameRegex = /^[a-zA-Z0-9\s\-']+$/;
        if (!nameRegex.test(name.trim())) {
            return res.status(400).json({
                error: 'Mosque name can only contain letters, numbers, spaces, hyphens and apostrophes',
                code: 'INVALID_NAME_FORMAT'
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

        // Check for duplicate mosque name in same location
        const existingMosque = await Mosque.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            location: { $regex: new RegExp(`^${location.trim()}$`, 'i') }
        });

        if (existingMosque) {
            return res.status(409).json({
                error: 'A mosque with this name already exists at this location',
                code: 'DUPLICATE_MOSQUE'
            });
        }

        // Validate contact email if provided - only allow specific domains
        if (contact_email && contact_email.trim()) {
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
        if (contact_phone && contact_phone.trim()) {
            const phoneRegex = /^\+923[0-9]{9}$/;
            if (!phoneRegex.test(contact_phone.trim())) {
                return res.status(400).json({
                    error: 'Phone number must be in format +923xxxxxxxxx (e.g., +923001234567)',
                    code: 'INVALID_PHONE_FORMAT'
                });
            }
        }

        // Generate unique verification code
        const verification_code = crypto.randomBytes(8).toString('hex').toUpperCase();

        // Set verification code expiry (30 days from now)
        const verification_code_expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Create custom admin instructions if not provided
        const defaultInstructions = contact_phone || contact_email
            ? `To become an admin of ${name}, you need the mosque verification code. Contact the mosque management at ${contact_phone ? `phone: ${contact_phone}` : ''}${contact_phone && contact_email ? ' or ' : ''}${contact_email ? `email: ${contact_email}` : ''} to get the verification code.`
            : `To become an admin of ${name}, you need the mosque verification code. Contact the mosque management to get the code.`;

        const mosque = new Mosque({
            name: name.trim(),
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

        // Log the mosque creation
        const auditLogger = new AuditLogger(req);
        await auditLogger.logMosqueCreated(mosque);

        // Return mosque details with verification info for super admin
        res.status(201).json({
            message: 'Mosque created successfully',
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
            instructions: {
                message: "Share the verification code with the trusted mosque management member",
                verification_code: mosque.verification_code,
                expires_in: "30 days",
                contact_info: {
                    phone: mosque.contact_phone || "Not provided",
                    email: mosque.contact_email || "Not provided"
                }
            }
        });
    } catch (err) {
        console.error('Mosque creation error:', err);

        // Handle duplicate key errors
        if (err.code === 11000) {
            return res.status(409).json({
                error: 'A mosque with this information already exists',
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
            error: 'Server error while creating mosque',
            code: 'SERVER_ERROR'
        });
    }
});

export default router;
