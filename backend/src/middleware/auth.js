const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * 1. Verify Clerk JWT token.
 */
const requireAuth = ClerkExpressRequireAuth({
  onError: (err, _req, res) => {
    logger.warn('AUTH', 'Clerk token verification failed:', err.message);
    res.status(401).json({ error: 'Unauthenticated' });
  },
});

/**
 * 2. Hydrate req.user from MongoDB (source of truth).
 *    Must run after requireAuth.
 */
const attachUser = async (req, res, next) => {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const user = await User.findById(req.auth.userId);

    if (!user) {
      return res.status(403).json({
        error: 'User account not fully synced. Please try again in a few seconds.',
        code: 'USER_NOT_SYNCED',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('AUTH', 'attachUser failed:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * 3. Role-based access guard.
 *    Usage: requireRole('educator', 'admin')
 */
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access Denied: Insufficient permissions' });
  }
  next();
};

module.exports = { requireAuth, attachUser, requireRole };
