// backend/routes/userRoutes.mjs
import express from 'express';
import { User } from '../models/user.mjs';

const router = express.Router();

// GET /api/users
// Returns a list of users (safe fields only)
router.get('/', async (req, res, next) => {
  try {
    const where = {};
    // optional: allow filtering by userid query
    if (req.query.userid) {
      where.userid = req.query.userid.toString().toLowerCase();
    }
    const users = await User.findAll({ where, attributes: { exclude: ['usrpassword'] }, order: [['id','ASC']] });
    res.json({ users });
  } catch (e) {
    next(e);
  }
});

export default router;
