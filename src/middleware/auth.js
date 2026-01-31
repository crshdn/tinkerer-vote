const crypto = require('crypto');

// Admin Discord IDs
const ADMIN_IDS = [
  '103551461266296832', // Kitze
  '752150652309864489'  // Chris
];

/**
 * Check if user is authenticated
 */
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * Check if user is an admin
 */
function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!isAdmin(req.session.user.discord_id)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
}

/**
 * Check if a Discord ID belongs to an admin
 */
function isAdmin(discordId) {
  return ADMIN_IDS.includes(discordId);
}

/**
 * Generate a random state token for CSRF protection
 */
function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate state token
 */
function validateState(sessionState, receivedState) {
  if (!sessionState || !receivedState) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(sessionState),
    Buffer.from(receivedState)
  );
}

/**
 * Sanitize user input
 */
function sanitizeInput(input, maxLength = 1000) {
  if (typeof input !== 'string') {
    return '';
  }
  // Trim and limit length
  return input.trim().slice(0, maxLength);
}

module.exports = {
  requireAuth,
  requireAdmin,
  isAdmin,
  generateState,
  validateState,
  sanitizeInput,
  ADMIN_IDS
};
