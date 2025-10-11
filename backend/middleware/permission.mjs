// backend/middleware/permissions.js
export function isAuthenticated(req, res, next) {
  if (!req.user) return res.status(401).json({ detail: 'Authentication required' });
  return next();
}

export function isLeaveManager(req, res, next) {
  const u = req.user;
  if (!u) return res.status(401).json({ detail: 'Authentication required' });
  if (u.is_staff || u.is_superuser) return next();
  const groups = (u.groups || []).map(g => String(g).toLowerCase());
  if (groups.includes('leave_management')) return next();
  return res.status(403).json({ detail: 'Requires leave management permission' });
}

export function isOwnerOrHR(req, res, next) {
  const u = req.user;
  if (!u) return res.status(401).json({ detail: 'Authentication required' });
  if (u.is_staff || u.is_superuser) return next();
  // allow authenticated users (object-level ownership enforced in controllers)
  if (u.username) return next();
  return res.status(403).json({ detail: 'Forbidden' });
}
