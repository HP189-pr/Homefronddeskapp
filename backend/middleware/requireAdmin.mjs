// backend/middleware/requireAdmin.mjs
import { RoleAssignment } from '../models/roleAssignment.mjs';
import { Permission } from '../models/permission.mjs';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'change-me-secret';

export default async function requireAdmin(req, res, next) {
  try {
    // If jwtMiddleware didn't attach req.user, try inline token verification as a fallback
    if (!req.user) {
      try {
        const auth = req.headers?.authorization || req.query?.token || null;
        let token = null;
        if (typeof auth === 'string') {
          if (auth.startsWith('Bearer ')) token = auth.slice(7).trim();
          else token = auth;
        }
        if (token) {
          const payload = jwt.verify(token, SECRET);
          req.user = {
            id: payload.id ?? payload.userId ?? payload.sub,
            userid: payload.userid ?? payload.user,
            usertype: payload.usertype ?? payload.role ?? payload.usertype,
          };
        }
      } catch (e) {
        // ignore and fall-through to Unauthorized
      }
    }

    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.usertype && req.user.usertype === 'admin') return next();

    const assignments = await RoleAssignment.findAll({ where: { userid: req.user.id } });
    const roleIds = assignments.map((r) => r.roleid);
    if (roleIds.length === 0) return res.status(403).json({ error: 'Forbidden' });

    const adminPerm = await Permission.findOne({
      where: {
        roleid: roleIds,
        moduleid: null,
        menuid: null,
        instituteid: null,
      },
    });

    if (adminPerm) return next();
    return res.status(403).json({ error: 'Forbidden' });
  } catch (err) {
    return next(err);
  }
}
