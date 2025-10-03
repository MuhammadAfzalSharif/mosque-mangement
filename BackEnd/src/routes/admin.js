const express = require('express');
const Admin = require('../models/Admin');
const { auth } = require('../middleware/auth');

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

module.exports = router;