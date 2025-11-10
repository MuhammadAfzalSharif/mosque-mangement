import nodemailer from 'nodemailer';
import 'dotenv/config';

// Gmail SMTP Transporter (Production-Level)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // e.g., 'yourapp@gmail.com'
    pass: process.env.GMAIL_APP_PASSWORD, // Use App Password (not regular password) from Google
  },
});

// Registration Verification Email Template
const generateRegistrationEmailTemplate = (code, name, userType) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - Mosque Management System</title>
    <style>
      @media only screen and (max-width: 600px) {
        .container { width: 100% !important; padding: 10px !important; }
        .header { padding: 20px !important; }
        .content { padding: 20px !important; }
        .code-box { font-size: 28px !important; padding: 12px !important; }
        .footer { padding: 15px !important; }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%); padding: 20px; min-height: 100vh;">
      <div class="container" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); overflow: hidden;">

        <!-- Header -->
        <div class="header" style="background: linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
            Mosque Management System
          </h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px; font-weight: 400;">
            Email Verification
          </p>
        </div>

        <!-- Content -->
        <div class="content" style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #065f46; margin: 0 0 12px 0; font-size: 22px; font-weight: 600;">
              Welcome ${name}
            </h2>
            <p style="color: #64748b; margin: 0; font-size: 16px; line-height: 1.5;">
              Please verify your email address to complete your ${userType} registration
            </p>
          </div>

          <!-- Verification Code Box -->
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 2px solid #059669; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
            <p style="color: #065f46; margin: 0 0 20px 0; font-size: 16px; font-weight: 600;">
              Your Verification Code:
            </p>
            <div class="code-box" style="font-size: 36px; font-weight: 700; color: #059669; letter-spacing: 8px; font-family: 'Courier New', monospace; background: white; padding: 15px 20px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.15); border: 1px solid #d1fae5;">
              ${code}
            </div>
          </div>

          <!-- Instructions -->
          <div style="background: #fefce8; border: 1px solid #eab308; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
              Important Instructions:
            </h3>
            <ul style="color: #92400e; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
              <li style="margin-bottom: 6px;">This code expires in <strong>15 minutes</strong></li>
              <li style="margin-bottom: 6px;">Enter this code on the verification page to complete registration</li>
              <li style="margin-bottom: 6px;">The code is valid only for this registration attempt</li>
              <li>If you did not request this registration, please ignore this email</li>
            </ul>
          </div>

          <!-- Security Notice -->
          <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h4 style="color: #dc2626; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">
              Security Notice:
            </h4>
            <p style="color: #dc2626; margin: 0; font-size: 13px; line-height: 1.4;">
              Never share this verification code with anyone. Our team will never ask for your verification code.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer" style="background: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #065f46; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
            Thank you for registering
          </p>
          <p style="color: #64748b; margin: 0; font-size: 14px;">
            Mosque Management System Team
          </p>
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; margin: 0; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
`;

// Password Reset Email Template
const generateResetEmailTemplate = (code, name, userType) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - Mosque Management System</title>
    <style>
      @media only screen and (max-width: 600px) {
        .container { width: 100% !important; padding: 10px !important; }
        .header { padding: 20px !important; }
        .content { padding: 20px !important; }
        .code-box { font-size: 28px !important; padding: 12px !important; }
        .footer { padding: 15px !important; }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%); padding: 20px; min-height: 100vh;">
      <div class="container" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); overflow: hidden;">

        <!-- Header -->
        <div class="header" style="background: linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
            Mosque Management System
          </h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px; font-weight: 400;">
            Password Reset
          </p>
        </div>

        <!-- Content -->
        <div class="content" style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #065f46; margin: 0 0 12px 0; font-size: 22px; font-weight: 600;">
              Hello ${name}
            </h2>
            <p style="color: #64748b; margin: 0; font-size: 16px; line-height: 1.5;">
              We received a request to reset your ${userType} password
            </p>
          </div>

          <!-- Reset Code Box -->
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 2px solid #059669; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
            <p style="color: #065f46; margin: 0 0 20px 0; font-size: 16px; font-weight: 600;">
              Your Password Reset Code:
            </p>
            <div class="code-box" style="font-size: 36px; font-weight: 700; color: #059669; letter-spacing: 8px; font-family: 'Courier New', monospace; background: white; padding: 15px 20px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.15); border: 1px solid #d1fae5;">
              ${code}
            </div>
          </div>

          <!-- Instructions -->
          <div style="background: #fefce8; border: 1px solid #eab308; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
              Important Instructions:
            </h3>
            <ul style="color: #92400e; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
              <li style="margin-bottom: 6px;">This code expires in <strong>15 minutes</strong></li>
              <li style="margin-bottom: 6px;">Use this code to reset your password</li>
              <li style="margin-bottom: 6px;">If you didn't request this reset, ignore this email</li>
              <li>You can only request one reset per hour</li>
            </ul>
          </div>

          <!-- Security Notice -->
          <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h4 style="color: #dc2626; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">
              Security Notice:
            </h4>
            <p style="color: #dc2626; margin: 0; font-size: 13px; line-height: 1.4;">
              Never share this reset code with anyone. Our team will never ask for your password or reset code.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer" style="background: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #065f46; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
            Thank you
          </p>
          <p style="color: #64748b; margin: 0; font-size: 14px;">
            Mosque Management System Team
          </p>
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; margin: 0; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
`;

// Send Registration Verification Email
const sendRegistrationEmail = async (email, name, code, userType) => {
  try {
    const mailOptions = {
      from: `"Mosque Management System" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Email Verification - ${userType === 'admin' ? 'Admin' : 'Super Admin'} Registration`,
      html: generateRegistrationEmailTemplate(code, name, userType),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Registration verification email sent to ${email}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send verification email. Please try again later.');
  }
};

// Send Reset Email
const sendPasswordResetEmail = async (email, name, code, userType) => {
  try {
    const mailOptions = {
      from: `"Mosque Management System" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Password Reset Code - ${userType === 'admin' ? 'Admin' : 'Super Admin'} Portal`,
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

export {
  sendPasswordResetEmail,
  sendRegistrationEmail,
  verifyConnection
};