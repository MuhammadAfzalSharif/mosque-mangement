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
app.use(cors(
    { origin: ['http://localhost:5173'], credentials: true }
))

// Routes
app.use('/api', authRoutes);
app.use('/api/mosques', mosqueRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/admin', adminRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB connected');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});