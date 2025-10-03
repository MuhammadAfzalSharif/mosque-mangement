const express = require('express');
const Admin = require('../models/Admin');
const Mosque = require('../models/Mosque')
const { auth, requireSuperAdmin } = require('../middleware/auth');
const crypto = require('crypto')

const router = express.Router();

// Approve Mosque Admin with notes
router.put('/:id/approve', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { super_admin_notes } = req.body;

        const admin = await Admin.findByIdAndUpdate(
            req.params.id,
            {
                status: 'approved',
                super_admin_notes: super_admin_notes || 'Approved by super admin'
            },
            { new: true }
        ).populate('mosque_id', 'name location');

        if (!admin) return res.status(404).json({ error: 'Admin not found' });

        res.json({
            message: 'Super admin approve mosque request by admin and assigned a mosque to admin successfully',

            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                status: admin.status,
                mosque: admin.mosque_id
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Reject Mosque Admin
router.put('/:id/reject', auth, requireSuperAdmin, async (req, res) => {
    try {
        // 1. Find the admin application first, don't delete it yet
        const adminApplication = await Admin.findById(req.params.id);

        if (!adminApplication) {
            return res.status(404).json({ error: 'Admin application not found' });
        }

        // 2. Extract the mosque ID from the application
        const mosqueId = adminApplication.mosque_id;
        if (!mosqueId) {
            // This case handles if an application somehow has no mosque ID
            await adminApplication.deleteOne(); // Still remove the invalid application
            return res.status(400).json({ error: 'Application is invalid (missing mosque ID) but has been removed.' });
        }

        // 3. Generate a new verification code and expiry date (30 days)
        const newCode = crypto.randomBytes(8).toString('hex').toUpperCase();
        const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // 4. Update the associated mosque with the new code
        const updatedMosque = await Mosque.findByIdAndUpdate(
            mosqueId,
            {
                verification_code: newCode,
                verification_code_expires: expiryDate
            },
            { new: true } // Return the updated document
        );

        // This is an edge case, but good to handle if the mosque was deleted
        if (!updatedMosque) {
            return res.status(404).json({ error: 'Associated mosque not found.' });
        }

        // 5. Now that the code is changed, safely delete the application
        await adminApplication.deleteOne();

        // 6. Send a more informative success response
        res.json({
            message: 'Admin application rejected. The mosque verification code has been regenerated for security.',
            rejected_admin_id: adminApplication._id,
            mosque_details: {
                id: updatedMosque._id,
                name: updatedMosque.name,
                new_verification_code: updatedMosque.verification_code // The super admin might need to see the new code
            }
        });

    } catch (err) {
        console.error(err); // Log the actual error for debugging
        res.status(500).json({ error: 'Server error during rejection process' });
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

        const mosque_admin = await Admin.findOneAndDelete({ mosque_id: req.params.id })

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
            .sort({ createdAt: 1 });

        const adminDetails = approvedAdmins.map(admin => ({
            ...admin.toObject(),
            verification_status: admin.verification_code_used === admin.mosque_id?.verification_code ? 'valid' : 'invalid'
        }));

        res.json({ approved_admins: adminDetails });
    } catch (err) {
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
        }).select('name email verification_code_used status createdAt');

        res.json({
            mosque: {
                id: mosque._id,
                name: mosque.name,
                verification_code: mosque.verification_code,
                code_expires: mosque.verification_code_expires,
                code_expired: new Date() > mosque.verification_code_expires
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
        const { name, location, description, contact_phone, contact_email, admin_instructions } = req.body;

        const mosque = await Mosque.findByIdAndUpdate(
            req.params.id,
            {
                name,
                location,
                description,
                contact_phone,
                contact_email,
                admin_instructions
            },
            { new: true }
        );

        if (!mosque) return res.status(404).json({ error: 'Mosque not found' });
        res.json({ message: 'Mosque details updated', mosque });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
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

module.exports = router;