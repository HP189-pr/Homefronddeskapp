import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'change-me-secret';

// Non-blocking middleware: decode/verify token if present, attach req.user; do NOT send 401 here.
export async function jwtMiddleware(req, res, next) {
  try {
    const auth = req.headers?.authorization || req.query?.token || null;
    let token = null;
    if (typeof auth === 'string') {
      if (auth.startsWith('Bearer ')) token = auth.slice(7).trim();
      else token = auth;
    }

    if (!token) {
      // no token provided — continue as anonymous
      return next();
    }

    try {
      const payload = jwt.verify(token, SECRET);
      // Attach a conservative user object — keep only safe fields
      req.user = {
        id: payload.id ?? payload.userId ?? payload.sub,
        userid: payload.userid ?? payload.user,
        usertype: payload.usertype ?? payload.role ?? payload.usertype,
        // attach raw payload for other uses if you want (optional)
        // raw: payload,
      };
    } catch (err) {
      // invalid token: do not block the request here (non-blocking middleware)
      // Log a helpful message for debugging
      try {
        // Avoid logging the token itself to reduce accidental secret leakage
        console.warn('Invalid JWT token provided:', err.message);
      } catch (logErr) {
        // swallow logging errors
      }
      req.user = undefined;
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

// Blocking middleware to require authentication for protected endpoints
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  return next();
}
