const express = require('express');
const Mosque = require('../models/Mosque');
const Admin = require('../models/Admin');
const { auth, requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const crypto = require('crypto'); // Add this import for verification code generation

const router = express.Router();

// List All Mosques (Public)
router.get('/', async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { name: new RegExp(search, 'i') },
                { location: new RegExp(search, 'i') }
            ];
        }

        const mosques = await Mosque.find(query)
            .select('name location description prayer_times')
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Mosque.countDocuments(query);

        // Transform the response to match API spec
        const transformedMosques = mosques.map(mosque => ({
            id: mosque._id,
            name: mosque.name,
            location: mosque.location,
            description: mosque.description || '',
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
        const { fajr, dhuhr, asr, maghrib, isha, jummah } = req.body;
        const mosque = await Mosque.findByIdAndUpdate(req.params.id, { prayer_times: { fajr, dhuhr, asr, maghrib, isha, jummah } }, { new: true });
        if (!mosque) return res.status(404).json({ error: 'Mosque not found' });
        res.json({ message: 'Prayer times updated', prayer_times: mosque.prayer_times });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update Mosque Details (Admin)
router.put('/:id', auth, requireAdmin, async (req, res) => {
    try {
        if (req.user.mosque_id.toString() !== req.params.id) return res.status(403).json({ error: 'Not authorized to update this mosque' });
        const { name, location, description } = req.body;
        const mosque = await Mosque.findByIdAndUpdate(req.params.id, { name, location, description }, { new: true });
        if (!mosque) return res.status(404).json({ error: 'Mosque not found' });
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

        // Validate required fields
        if (!name || !location) {
            return res.status(400).json({
                error: 'Name and location are required'
            });
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
            name,
            location,
            description: description || '',
            verification_code,
            verification_code_expires,
            contact_phone: contact_phone || '',
            contact_email: contact_email || '',
            admin_instructions: admin_instructions || defaultInstructions,
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
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete Mosque (Super Admin)
router.delete('/:id', auth, requireSuperAdmin, async (req, res) => {
    try {
        await Mosque.findByIdAndDelete(req.params.id);
        await Admin.deleteMany({ mosque_id: req.params.id });
        res.json({ message: 'Mosque deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
