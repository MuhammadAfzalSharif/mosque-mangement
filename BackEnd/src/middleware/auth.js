import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import SuperAdmin from '../models/SuperAdmin.js';

const auth = async (req, res, next) => {
    // PRIORITY: Check Authorization header FIRST (for frontend localStorage tokens)
    // Then fall back to cookies (for old sessions)
    let token = null;
    let tokenSource = 'None';

    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        tokenSource = 'Header';
    }

    // If no header token, check cookies
    if (!token && req.cookies.token) {
        token = req.cookies.token;
        tokenSource = 'Cookie';
    }

    console.log('AUTH MIDDLEWARE - Token found:', token ? 'YES' : 'NO');
    console.log('AUTH MIDDLEWARE - Token source:', tokenSource);

    if (!token) {
        console.log('AUTH MIDDLEWARE - No token, returning 401');
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('AUTH MIDDLEWARE - Decoded token:', decoded);

        // Verify user still exists in database and has correct role
        let userExists = false;

        if (decoded.role === 'super_admin') {
            const superAdmin = await SuperAdmin.findById(decoded.userId);
            userExists = !!superAdmin;
        } else if (decoded.role === 'admin') {
            const admin = await Admin.findById(decoded.userId);
            userExists = !!admin;
        }

        if (!userExists) {
            console.log('AUTH MIDDLEWARE - User no longer exists in database');
            return res.status(401).json({
                error: 'User account no longer exists',
                code: 'USER_DELETED'
            });
        }

        req.user = decoded;
        next();
    } catch (err) {
        console.log('AUTH MIDDLEWARE - Token verification failed:', err.message);
        res.status(401).json({ error: 'Token is not valid' });
    }
};


const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
};

const requireSuperAdmin = (req, res, next) => {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Super admin access required' });
    next();
};

// NEW: Middleware to block rejected admins from accessing admin features
const requireNotRejected = async (req, res, next) => {
    try {
        const admin = await Admin.findById(req.user.userId).select('status can_reapply rejection_reason');

        if (!admin) {
            return res.status(404).json({
                error: 'Admin not found',
                code: 'ADMIN_NOT_FOUND'
            });
        }

        if (admin.status === 'rejected') {
            return res.status(403).json({
                error: 'Your account has been rejected. You cannot access admin features.',
                code: 'ACCESS_DENIED_REJECTED',
                status: 'rejected',
                can_reapply: admin.can_reapply,
                rejection_reason: admin.rejection_reason,
                message: admin.can_reapply
                    ? 'You are allowed to reapply. Please submit a new application.'
                    : 'Please contact support for assistance.'
            });
        }

        if (admin.status === 'pending') {
            return res.status(403).json({
                error: 'Your application is still pending approval',
                code: 'ACCESS_DENIED_PENDING',
                status: 'pending',
                message: 'Please wait for Super Admin approval.'
            });
        }

        next();
    } catch (error) {
        console.error('Error in requireNotRejected middleware:', error);
        res.status(500).json({
            error: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
};

export { auth, requireAdmin, requireSuperAdmin, requireNotRejected };