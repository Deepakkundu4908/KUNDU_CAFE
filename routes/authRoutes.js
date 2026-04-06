const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const cookieParser = require('cookie-parser');

// Middleware
router.use(cookieParser());

// Login
router.get('/login', authController.getLogin);
router.post('/login', authController.login);

// Signup with college email and ID
router.get('/signup', authController.getSignup);
router.post('/signup', authController.signup);

// Logout
router.get('/logout', authController.logout);

// Forgot Password
router.get('/forgot-password', authController.getForgotPassword);
router.post('/forgot-password', authController.forgotPassword);

// Reset Password
router.get('/reset-password/:token', authController.getResetPassword);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;
