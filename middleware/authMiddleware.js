const jwt = require('jsonwebtoken');
const storage = require('../storage');
const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key';

/**
 * Authentication Middleware
 */

// Verify JWT Token
const verifyToken = async (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.redirect('/auth/login');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const userRecord = await storage.findUserById(decoded.id);
    if (!userRecord || userRecord.isActive === false) {
      res.clearCookie('token');
      return res.redirect('/auth/login');
    }
    req.user = userRecord;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.clearCookie('token');
    res.redirect('/auth/login');
  }
};

// Check if user is authenticated
const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.redirect('/auth/login');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const userRecord = await storage.findUserById(decoded.id);
    if (!userRecord || userRecord.isActive === false) {
      res.clearCookie('token');
      return res.redirect('/auth/login');
    }
    req.user = userRecord;
    res.locals.user = userRecord;
    storage.updateUserById(userRecord.id, { lastSeenAt: new Date() }).catch(() => {});
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.clearCookie('token');
    res.redirect('/auth/login');
  }
};

// Check if user is Admin
const adminMiddleware = async (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).send('Access denied. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    const userRecord = await storage.findUserById(decoded.id);
    if (!userRecord || userRecord.isActive === false) {
      res.clearCookie('token');
      return res.status(401).send('Invalid or deactivated account.');
    }

    if (userRecord.role !== 'admin') {
      return res.status(403).send('Access denied. Admin privileges required.');
    }

    req.user = userRecord;
    res.locals.user = userRecord;
    storage.updateUserById(userRecord.id, { lastSeenAt: new Date() }).catch(() => {});
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).send('Invalid or expired token.');
  }
};

// Check if user is Student
const studentMiddleware = async (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.redirect('/auth/login');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    const userRecord = await storage.findUserById(decoded.id);
    if (!userRecord || userRecord.isActive === false) {
      res.clearCookie('token');
      return res.redirect('/auth/login');
    }

    if (userRecord.role !== 'student') {
      return res.status(403).send('Access denied. Student access required.');
    }

    req.user = userRecord;
    res.locals.user = userRecord;
    storage.updateUserById(userRecord.id, { lastSeenAt: new Date() }).catch(() => {});
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
