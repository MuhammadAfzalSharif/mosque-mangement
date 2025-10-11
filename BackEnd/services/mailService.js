const nodemailer = require('nodemailer');
require('dotenv').config();

// Gmail SMTP Transporter (Production-Level)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // e.g., 'yourapp@gmail.com'
    pass: process.env.GMAIL_APP_PASSWORD, // Use App Password (not regular password) from Google
  },
});

// Mosque-Themed Email Template
const generateResetEmailTemplate = (code, name, userType) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - Mosque Management System</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%); padding: 40px 20px; min-height: 100vh;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1); overflow: hidden;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%); padding: 30px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">🕌</div>
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">
            Mosque Management System
          </h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 5px 0 0 0; font-size: 16px;">
            Password Reset Request
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #065f46; margin: 0 0 10px 0; font-size: 22px;">
              Assalamu Alaikum ${name}
            </h2>
            <p style="color: #6b7280; margin: 0; font-size: 16px;">
              We received a request to reset your ${userType} password
            </p>
          </div>

          <!-- Reset Code Box -->
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 2px solid #059669; border-radius: 15px; padding: 30px; text-align: center; margin: 30px 0;">
            <p style="color: #065f46; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">
              Your Password Reset Code:
            </p>
            <div style="font-size: 36px; font-weight: bold; color: #059669; letter-spacing: 8px; font-family: 'Courier New', monospace; background: white; padding: 15px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);">
              ${code}
            </div>
          </div>

          <!-- Instructions -->
          <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 10px; padding: 20px; margin: 20px 0;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 20px; margin-right: 10px;">⏰</span>
              <strong style="color: #92400e; font-size: 16px;">Important Instructions:</strong>
            </div>
            <ul style="color: #92400e; margin: 0; padding-left: 20px; font-size: 14px;">
              <li style="margin-bottom: 5px;">This code expires in <strong>15 minutes</strong></li>
              <li style="margin-bottom: 5px;">Use this code to reset your password</li>
              <li style="margin-bottom: 5px;">If you didn't request this, ignore this email</li>
              <li>You can only request one reset per hour</li>
            </ul>
          </div>

          <!-- Security Notice -->
          <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 10px; padding: 15px; margin: 20px 0;">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 18px; margin-right: 8px;">🔐</span>
              <strong style="color: #dc2626; font-size: 14px;">Security Notice:</strong>
            </div>
            <p style="color: #dc2626; margin: 0; font-size: 13px;">
              Never share this code with anyone. Our team will never ask for your password or reset code.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #065f46; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
            Jazakallah Khair 🤲
          </p>
          <p style="color: #6b7280; margin: 0; font-size: 14px;">
            Mosque Management System Team
          </p>
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
`;

// Send Reset Email
const sendPasswordResetEmail = async (email, name, code, userType) => {
  try {
    const mailOptions = {
      from: `"🕌 Mosque Management System" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `🕌 Password Reset Code - ${userType === 'admin' ? 'Admin' : 'Super Admin'} Portal`,
      html: generateResetEmailTemplate(code, name, userType),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send reset email. Please try again later.');
  }
};

// Verify SMTP Connection (for testing)
const verifyConnection = async () => {
  try {
    await transporter.verify();
    console.log('SMTP Server connection verified successfully');
    return true;
  } catch (error) {
    console.error('SMTP Server connection failed:', error);
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
  verifyConnection
};