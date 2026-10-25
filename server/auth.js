const crypto = require('crypto');
const { getDb } = require('./db');

function createSession(userId, organizationId) {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const stmt = db.prepare(`
    INSERT INTO sessions (token, user_id, organization_id, expires_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(token, userId, organizationId, expiresAt);

  return { token, expiresAt };
}

function destroySession(token) {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.headers['x-auth-token'] || req.query.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Required: No session token provided in Authorization header.'
    });
  }

  const db = getDb();
  const session = db.prepare(`
    SELECT s.*, u.name, u.email, u.role, u.organization_id, o.name as organization_name, o.slug as organization_slug
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    JOIN organizations o ON s.organization_id = o.id
    WHERE s.token = ?
  `).get(token);

  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Failed: Invalid or expired session token.'
    });
  }

  if (new Date(session.expires_at) < new Date()) {
    destroySession(token);
    return res.status(401).json({
      success: false,
      error: 'Session Expired: Please log in again.'
    });
  }

  req.user = {
    id: session.user_id,
    name: session.name,
    email: session.email,
    role: session.role,
    organization_id: session.organization_id
  };

  req.organization = {
    id: session.organization_id,
    name: session.organization_name,
    slug: session.organization_slug
  };

  req.organizationId = session.organization_id;

  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Permission Denied: User role '${req.user.role}' is not authorized. Allowed roles: ${allowedRoles.join(', ')}.`
      });
    }

    next();
  };
}

module.exports = {
  createSession,
  destroySession,
  authenticate,
  requireRole
};
