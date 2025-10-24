import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import cors from 'cors';

// Import routes
import authRoutes from './routes/auth.js';
import mosqueRoutes from './routes/mosque.js';
import superadminRoutes from './routes/superadmin.js';
import adminRoutes from './routes/admin.js';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// 🧠 Configure CORS
app.use(cors({
    origin: isProduction
        ? ['https://pakmasjid.vercel.app']
        : ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ✅ Health route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        environment: isProduction ? 'production' : 'development',
        timestamp: new Date().toISOString(),
    });
});

// 🧩 ROUTES
app.use('/api', authRoutes);
app.use('/api/mosques', mosqueRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/admin', adminRoutes);

// 🧠 Optimized MongoDB connection for serverless environments
let isConnected = false;

async function connectToDatabase() {
    if (isConnected) return;
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        isConnected = conn.connections[0].readyState === 1;
        console.log('✅ MongoDB connected');
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err);
    }
}

// Connect immediately (for local dev)
if (!isProduction) {
    connectToDatabase();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`⚡ Server running locally on port ${PORT}`));
}

// For Vercel serverless mode
app.use(async (req, res, next) => {
    if (!isConnected) await connectToDatabase();
    next();
});

export default app;
