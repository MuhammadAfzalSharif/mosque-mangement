const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    // First try to get token from cookie
    let token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
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

module.exports = { auth, requireAdmin, requireSuperAdmin };