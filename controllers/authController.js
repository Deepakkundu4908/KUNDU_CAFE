const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const storage = require('../storage');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../config/email');

/**
 * Authentication Controller with JWT
 */

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'your_jwt_secret_key',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

const getBaseUrl = (req) => {
  if (process.env.APP_URL && process.env.APP_URL.trim()) {
    return process.env.APP_URL.trim().replace(/\/$/, '');
  }

  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = forwardedProto || req.protocol || 'http';
  return `${protocol}://${req.get('host')}`;
};

// User Registration
exports.signup = async (req, res) => {
  try {
    const { username, email, password, passwordConfirm } = req.body;

    // Validation
    if (!username || !email || !password || !passwordConfirm) {
      return res.status(400).render('signup', {
        message: 'Please provide all required fields',
        user: null
      });
    }

    // Check if passwords match
    if (password !== passwordConfirm) {
      return res.status(400).render('signup', {
        message: 'Passwords do not match',
        user: null
      });
    }

    if (password.length < 6) {
      return res.status(400).render('signup', {
        message: 'Password must be at least 6 characters long',
        user: null
      });
    }

    const users = await storage.getUsers();

    // Check if user already exists
    if (users.find(u => u.email === email)) {
      return res.status(400).render('signup', {
        message: 'Email is already registered',
        user: null
      });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const newUser = {
      id: Date.now(),
      username,
      email,
      collegeEmail: null,
      collegeId: null,
      password: hashedPassword,
      role: 'student'
    };

    await storage.createUser(newUser);

    // Send welcome email
    sendWelcomeEmail(email, username, `${getBaseUrl(req)}/auth/login`).catch((error) => {
      console.error('Welcome email error:', error);
    });

    // Generate token
    const token = generateToken(newUser);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(201).redirect('/');
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).render('signup', {
      message: 'An error occurred during signup',
      user: null
    });
  }
};

// User Login with JWT
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).render('login', {
        message: 'Please provide email and password',
        user: null
      });
    }

    const users = await storage.getUsers();
    const user = users.find(u => u.email === email);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).render('login', {
        message: 'Invalid email or password',
        user: null
      });
    }

    // Generate JWT Token
    const token = generateToken(user);

    // Set secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.redirect('/');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).render('login', {
      message: 'An error occurred during login',
      user: null
    });
  }
};

// User Logout
exports.logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
};

// Render login page
exports.getLogin = (req, res) => {
  res.render('login', { user: null, message: null });
};

// Render signup page
exports.getSignup = (req, res) => {
  res.render('signup', { user: null, message: null });
};

// Forgot Password - Send Reset Email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).render('forgot-password', {
        message: 'Please provide an email address',
        user: null
      });
    }

    const users = await storage.getUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(404).render('forgot-password', {
        message: 'No user found with this email address',
        user: null
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with reset token
    const updatedUsers = users.map(u => {
      if (u.id === user.id) {
        return {
          ...u,
          resetPasswordToken: resetTokenHash,
          resetPasswordExpire: resetExpire
        };
      }
      return u;
    });

    await storage.saveUsers(updatedUsers);

    // Send reset email
    const resetUrl = `${getBaseUrl(req)}/auth/reset-password/${resetToken}`;
    const emailSent = await sendPasswordResetEmail(
      user.email,
      resetUrl,
      user.username
    );

    if (emailSent) {
      return res.status(200).render('forgot-password', {
        message: 'Password reset link sent to your email. Check your inbox.',
        user: null
      });
    } else {
      await storage.updateUserById(user.id, {
        resetPasswordToken: null,
        resetPasswordExpire: null
      });
      return res.status(500).render('forgot-password', {
        message: 'Error sending reset email. Please try again later.',
        user: null
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).render('forgot-password', {
      message: 'An error occurred. Please try again.',
      user: null
    });
  }
};

// Render forgot password page
exports.getForgotPassword = (req, res) => {
  res.render('forgot-password', { user: null, message: null });
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, passwordConfirm } = req.body;

    if (!password || !passwordConfirm) {
      return res.status(400).render('reset-password', {
        message: 'Please provide password and confirmation',
        token,
        user: null
      });
    }

    if (password !== passwordConfirm) {
      return res.status(400).render('reset-password', {
        message: 'Passwords do not match',
        token,
        user: null
      });
    }

    // Hash reset token to find user
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const users = await storage.getUsers();

    const user = users.find(
      u => u.resetPasswordToken === resetTokenHash && 
           new Date(u.resetPasswordExpire) > new Date()
    );

    if (!user) {
      return res.status(400).render('reset-password', {
        message: 'Password reset token is invalid or has expired',
        token,
        user: null
      });
    }

    // Update password
    const hashedPassword = bcrypt.hashSync(password, 10);

    const updatedUsers = users.map(u => {
      if (u.id === user.id) {
        return {
          ...u,
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpire: null
        };
      }
      return u;
    });

    await storage.saveUsers(updatedUsers);

    return res.status(200).render('reset-password-success', { user: null });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).render('reset-password', {
      message: 'An error occurred. Please try again.',
      token: req.params.token,
      user: null
    });
  }
};

// Render reset password page
exports.getResetPassword = (req, res) => {
  const { token } = req.params;
  res.render('reset-password', { token, user: null, message: null });
};
