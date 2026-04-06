const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key';

/**
 * Authentication Middleware
 */

// Verify JWT Token
const verifyToken = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.redirect('/auth/login');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.clearCookie('token');
    res.redirect('/auth/login');
  }
};

// Check if user is authenticated
const authMiddleware = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.redirect('/auth/login');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    res.locals.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.clearCookie('token');
    res.redirect('/auth/login');
  }
};

// Check if user is Admin
const adminMiddleware = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).send('Access denied. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    
    if (decoded.role !== 'admin') {
      return res.status(403).send('Access denied. Admin privileges required.');
    }

    req.user = decoded;
    res.locals.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).send('Invalid or expired token.');
  }
};

// Check if user is Student
const studentMiddleware = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.redirect('/auth/login');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    
    if (decoded.role !== 'student') {
      return res.status(403).send('Access denied. Student access required.');
    }

    req.user = decoded;
    res.locals.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.clearCookie('token');
    res.redirect('/auth/login');
  }
};

module.exports = {
  verifyToken,
  authMiddleware,
  adminMiddleware,
  studentMiddleware
};
