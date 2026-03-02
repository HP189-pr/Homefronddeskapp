// backend/routes/userRoutes.mjs
import express from 'express';
import { User } from '../models/user.mjs';
import UserProfile from '../models/userProfile.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { buildProfilePhotoUrl } from '../utils/secureMedia.mjs';

const router = express.Router();

// GET /api/users
// Returns a list of users (safe fields only)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const where = {};
    // optional: allow filtering by userid query
    if (req.query.userid) {
      where.userid = req.query.userid.toString().toLowerCase();
    }
    const users = await User.findAll({ where, attributes: { exclude: ['usrpassword'] }, order: [['id', 'ASC']] });
    const ids = users.map((u) => u.id).filter(Boolean);
    const profiles = ids.length ? await UserProfile.findAll({ where: { userId: ids } }) : [];
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const enriched = users.map((u) => {
      const safe = u.get({ plain: true });
      const profile = profileMap.get(u.id);
      const pic = u.usrpic || profile?.profile_pic || null;
      return {
        ...safe,
        profile_picture: pic,
        profile_picture_url: buildProfilePhotoUrl(u.userid),
        photoUrl: buildProfilePhotoUrl(u.userid),
      };
    });

    res.json({ users: enriched });
  } catch (e) {
    next(e);
  }
});

export default router;
