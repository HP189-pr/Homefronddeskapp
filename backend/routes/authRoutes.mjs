import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Op, fn, col, where as sqlWhere } from 'sequelize';
import { User } from '../models/user.mjs';

const router = express.Router();

// DEV-ONLY: quick auto login for local development to avoid frequent re-auth
// POST /api/auth/dev-login
// Guarded by NODE_ENV !== 'production' and optional ALLOW_DEV_LOGIN flag
router.post('/dev-login', async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (process.env.ALLOW_DEV_LOGIN && process.env.ALLOW_DEV_LOGIN !== '1') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { userid, role } = req.body || {};
    const desiredId = (userid || '').toString().trim().toLowerCase();
    const desiredRole = (role || '').toString().trim().toLowerCase();

    let safeUser = null;
    try {
      // Prefer a real user from DB when possible
      if (desiredId) {
        const u = await User.findOne({
          where: {
            [Op.or]: [
              sqlWhere(fn('LOWER', col('userid')), desiredId),
              sqlWhere(fn('LOWER', col('usercode')), desiredId),
            ],
          },
        });
        if (u) {
          const tmp = { ...u.get() };
          delete tmp.usrpassword;
          safeUser = tmp;
        }
      }
      if (!safeUser) {
        const admin = await User.findOne({
          where: {
            [Op.or]: [
              { usertype: 'admin' },
              sqlWhere(fn('LOWER', col('userid')), 'admin'),
              sqlWhere(fn('LOWER', col('usercode')), 'admin'),
            ],
          },
        });
        if (admin) {
          const tmp = { ...admin.get() };
          delete tmp.usrpassword;
          safeUser = tmp;
        }
      }
    } catch (_) {
      // ignore
    }

    if (!safeUser) {
      // Fallback stub user when DB not available or admin not found
      safeUser = {
        id: 0,
        userid: desiredId || 'dev',
        usertype: desiredRole || 'admin',
        name: 'Dev User',
      };
    }

    const token = jwt.sign(
      { id: safeUser.id, userid: safeUser.userid, usertype: safeUser.usertype },
      process.env.JWT_SECRET || 'change-me-secret',
      { expiresIn: process.env.DEV_TOKEN_EXPIRES_IN || '7d' },
    );

    return res.json({ token, user: safeUser });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/login
// Accepts { userid, password } (preferred) or legacy { identifier, usrpassword }
router.post('/login', async (req, res, next) => {
  try {
    const { userid, password, identifier, usrpassword } = req.body || {};
    const id = (userid || identifier || '').toString().trim().toLowerCase();
    const pw = (password || usrpassword || '').toString();

    if (!id || !pw) return res.status(400).json({ error: 'Missing credentials' });

    // Try to find user by userid or usercode (case-insensitive)
    const user = await User.findOne({
      where: {
        [Op.or]: [
          sqlWhere(fn('LOWER', col('userid')), id),
          sqlWhere(fn('LOWER', col('usercode')), id),
        ],
      },
    });

    if (!user) {
      // Fallback: preserve original simple admin check for quick local setups
      if (id === 'admin' && (pw === process.env.ADMIN_PW || pw === 'ChangeMe123')) {
        const token = jwt.sign({ id: 1, userid: 'admin', usertype: 'admin' }, process.env.JWT_SECRET || 'change-me-secret', { expiresIn: '8h' });
        return res.json({ token, user: { userid: 'admin', usertype: 'admin' } });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password with bcrypt-stored hash (usrpassword)
    const match = await bcrypt.compare(pw, user.usrpassword);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    // Build safe user object (exclude password)
    const safe = { ...user.get() };
    delete safe.usrpassword;

    const token = jwt.sign({ id: safe.id, userid: safe.userid, usertype: safe.usertype }, process.env.JWT_SECRET || 'change-me-secret', { expiresIn: '8h' });
    return res.json({ token, user: safe });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/verify-password
// Body: { password } or { usrpassword }
// Requires a valid JWT (jwtMiddleware should have attached req.user)
router.post('/verify-password', async (req, res, next) => {
  try {
    // Debug info: log header presence and req.user for troubleshooting
    try {
      console.debug('verify-password: Authorization header present=', !!req.headers?.authorization, 'len=', req.headers?.authorization?.length || 0);
      console.debug('verify-password: req.user=', !!req.user);
    } catch (logErr) {
      // ignore logging errors
    }

    let current = req.user;
    // If jwtMiddleware didn't attach req.user, try to verify the Authorization header here as a fallback
    if ((!current || !current.id) && req.headers?.authorization) {
      try {
        const authHeader = req.headers.authorization;
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader;
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'change-me-secret');
        current = {
          id: payload.id ?? payload.userId ?? payload.sub,
          userid: payload.userid ?? payload.user,
          usertype: payload.usertype ?? payload.role ?? payload.usertype,
        };
      } catch (err) {
        // ignore and fall-through to unauthorized response
        console.debug('verify-password fallback token verify failed:', err.message);
      }
    }

    if (!current || !current.id) return res.status(401).json({ error: 'Unauthorized' });

    const { password, usrpassword } = req.body || {};
    const pw = (password || usrpassword || '').toString();
    if (!pw) return res.status(400).json({ error: 'Missing password' });

    // load user from DB
    const user = await User.findByPk(current.id);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // First, check user's own password as before
    const match = await bcrypt.compare(pw, user.usrpassword);
    if (match) return res.json({ ok: true });

    // If not matching the user's DB password, allow verifying using environment admin password.
    // Support either plaintext ADMIN_PW or bcrypt hash ADMIN_PW_HASH in env.
    const envPlain = process.env.ADMIN_PW || '';
    const envHash = process.env.ADMIN_PW_HASH || '';

    if (envPlain && pw === envPlain) {
      return res.json({ ok: true });
    }

    if (envHash) {
      try {
        const okHash = await bcrypt.compare(pw, envHash);
        if (okHash) return res.json({ ok: true });
      } catch (e) {
        // Non-fatal: log in non-prod only
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Error comparing ADMIN_PW_HASH:', e && e.message ? e.message : e);
        }
      }
    }

    // If we reach here, neither user password nor env admin password matched
    return res.status(401).json({ error: 'Incorrect password' });
  } catch (err) {
    return next(err);
  }
});

export default router;
