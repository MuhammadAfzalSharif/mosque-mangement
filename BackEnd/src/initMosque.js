// This script creates initial data: mosque with verification code, super admin, and approved admin
require('dotenv').config();
const mongoose = require('mongoose');
const Mosque = require('./models/Mosque');
const SuperAdmin = require('./models/SuperAdmin');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mosque_db';

async function initData() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Create initial mosque with verification code if none exists
        const mosqueCount = await Mosque.countDocuments();
        let mosque;
        if (mosqueCount === 0) {
            // Generate unique verification code
            const verificationCode = crypto.randomBytes(8).toString('hex').toUpperCase();

            mosque = new Mosque({
                name: 'Central Grand Mosque',
                location: '123 Main Street, New York, NY 10001',
                description: 'A beautiful mosque serving the local Muslim community with daily prayers, Islamic education, and community services.',
                prayer_times: {
                    fajr: '05:30',
                    dhuhr: '12:45',
                    asr: '16:15',
                    maghrib: '19:20',
                    isha: '20:45',
                    jummah: '13:00'
                },
                verification_code: verificationCode,
                verification_code_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                contact_phone: '+1-555-0123',
                contact_email: 'info@centralmosque.org',
                admin_instructions: `To become an admin of Central Grand Mosque, please contact the mosque management at +1-555-0123 or info@centralmosque.org to obtain the verification code. Only authorized mosque staff can provide this code.`
            });
            await mosque.save();
            console.log('✅ Initial mosque created:', mosque.name);
            console.log('🔐 Verification Code:', verificationCode);
            console.log('📞 Contact Phone:', mosque.contact_phone);
            console.log('📧 Contact Email:', mosque.contact_email);
        } else {
            mosque = await Mosque.findOne();
            console.log('✅ Mosque already exists:', mosque.name);
            if (mosque.verification_code) {
                console.log('🔐 Existing Verification Code:', mosque.verification_code);
            }
        }        // Create initial super admin if none exists
        const superAdminCount = await SuperAdmin.countDocuments();
        if (superAdminCount === 0) {
            const hashedPassword = await bcrypt.hash('superadmin123', 10);
            const superAdmin = new SuperAdmin({
                email: 'superadmin@example.com',
                password: hashedPassword
            });
            await superAdmin.save();
            console.log('✅ Initial super admin created:', superAdmin.email);
            console.log('🔑 Super admin password: superadmin123');
        } else {
            const superAdmin = await SuperAdmin.findOne();
            console.log('✅ Super admin already exists:', superAdmin.email);
        }

        // Create initial approved admin for the mosque if none exists
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
            const hashedAdminPassword = await bcrypt.hash('admin123', 10);
            const admin = new Admin({
                name: 'Ahmed Ali',
                email: 'ahmed@centralmosque.org',
                password: hashedAdminPassword,
                mosque_id: mosque._id,
                status: 'approved',
                verification_code_used: mosque.verification_code
            });
            await admin.save();
            console.log('✅ Initial approved admin created:', admin.email);
            console.log('🔑 Admin password: admin123');
            console.log('🕌 Admin manages mosque:', mosque.name);
            console.log('✅ Admin status: APPROVED (pre-approved by super admin)');
            console.log('🔐 Verification code used:', mosque.verification_code);
        } else {
            const admin = await Admin.findOne();
            console.log('✅ Admin already exists:', admin.email);
            console.log('📊 Admin status:', admin.status);
        }

        console.log('\n🎉 === INITIALIZATION COMPLETE ===');
        console.log('📁 MongoDB Database: mosque_db');
        console.log('📋 Collections created: mosques, superadmins, admins');

        console.log('\n👥 LOGIN CREDENTIALS:');
        console.log('1. 👑 Super Admin: superadmin@example.com / superadmin123');
        console.log('2. 🕌 Mosque Admin: ahmed@centralmosque.org / admin123 (APPROVED)');

        console.log('\n🔐 VERIFICATION SYSTEM:');
        console.log(`3. 🔑 Mosque Verification Code: ${mosque.verification_code}`);
        console.log(`4. 📞 Contact for verification: ${mosque.contact_phone}`);
        console.log(`5. 📧 Email for verification: ${mosque.contact_email}`);

        console.log('\n🌐 TEST ENDPOINTS:');
        console.log('6. 📋 View all mosques: GET /api/mosques');
        console.log('7. 🕐 View prayer times: GET /api/mosques/<mosque_id>/prayer-times');
        console.log('8. 📝 Admin registration: POST /api/admin/register (requires verification code)');

        console.log('\n📝 ADMIN REGISTRATION PROCESS:');
        console.log('• Only users with the verification code can apply as admin');
        console.log('• Contact mosque management to get the verification code');
        console.log('• Super admin approves/rejects applications');
        console.log('• One admin per mosque policy enforced');

    } catch (error) {
        console.error('Error during initialization:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

initData();