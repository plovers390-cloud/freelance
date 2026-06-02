// ============================================
// authMiddleware.js — JWT Authentication Guard
// ============================================
// Protects routes by verifying the Bearer token
// in the Authorization header. Attaches decoded
// user payload (id, email) to req.user.
// ============================================

const jwt = require('jsonwebtoken');

/**
 * Express middleware — verifies JWT and gates access.
 *
 * Expected header format:
 *   Authorization: Bearer <token>
 *
 * On success → sets req.user = { id, email }
 * On failure → responds with 401
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Header must exist and follow "Bearer <token>" format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied. No token provided.'
      });
    }

    // Extract the token (everything after "Bearer ")
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access denied. Malformed authorization header.'
      });
    }

    // Verify and decode the token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Attach user payload to request for downstream handlers
    req.user = {
      id: decoded.id,
      email: decoded.email
    };

    next();
  } catch (err) {
    // Differentiate between expired and invalid tokens
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired. Please log in again.'
      });
    }

    return res.status(401).json({
      error: 'Invalid token. Authentication failed.'
    });
  }
};

module.exports = authMiddleware;
