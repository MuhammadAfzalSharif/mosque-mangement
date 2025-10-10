require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const mosqueRoutes = require('./routes/mosque');
const superadminRoutes = require('./routes/superadmin');
const adminRoutes = require('./routes/admin');
const cors = require('cors')

const app = express();
app.use(express.json());
app.use(cookieParser()); // Add cookie parser middleware
app.use(express.urlencoded({ extended: true }))
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:3000'
    ],
    credentials: true
}))

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        overall_status: 'healthy'
    });
});

// Frontend error logging endpoint
app.post('/api/logs/frontend-error', (req, res) => {
    try {
        const errorData = req.body;
        console.error('Frontend Error:', {
            timestamp: errorData.timestamp,
            action: errorData.action,
            component: errorData.component,
            error: errorData.error,
            url: errorData.url,
            userAgent: errorData.userAgent,
            statusCode: errorData.statusCode,
            additionalData: errorData
        });

        res.json({ message: 'Error logged successfully' });
    } catch (err) {
        console.error('Failed to log frontend error:', err);
        res.status(500).json({ error: 'Failed to log error' });
    }
});

// Routes
app.use('/api', authRoutes);
app.use('/api/mosques', mosqueRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/admin', adminRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log('MongoDB connected');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});