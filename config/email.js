const nodemailer = require('nodemailer');

/**
 * Email Service Configuration
 */

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const getSenderAddress = () => {
  if (process.env.EMAIL_FROM && process.env.EMAIL_FROM.trim()) {
    return process.env.EMAIL_FROM.trim();
  }

  if (process.env.EMAIL_USER && process.env.EMAIL_USER.trim()) {
    return process.env.EMAIL_USER.trim();
  }

  return 'noreply@kunducafe.com';
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, resetUrl, userName) => {
  try {
    const mailOptions = {
      from: getSenderAddress(),
      to: email,
      subject: 'Password Reset Request - Kundu Cafe',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${userName},</p>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <a href="${resetUrl}" style="background-color: #6F4E37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Reset Password
        </a>
        <p>Or copy this link: ${resetUrl}</p>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>Kundu Cafe Team</p>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (email, userName, loginUrl) => {
  try {
    const mailOptions = {
      from: getSenderAddress(),
      to: email,
      subject: 'Welcome to Kundu Cafe!',
      html: `
        <h2>Welcome to Kundu Cafe, ${userName}!</h2>
        <p>Your account has been created successfully.</p>
        <p>You can now enjoy our digital canteen services:</p>
        <ul>
          <li>Browse our menu</li>
          <li>Place orders</li>
          <li>Track your orders</li>
          <li>Manage your wallet</li>
        </ul>
        <p>Login here: <a href="${loginUrl}">Kundu Cafe Login</a></p>
        <p>Best regards,<br>Kundu Cafe Team</p>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail
};
