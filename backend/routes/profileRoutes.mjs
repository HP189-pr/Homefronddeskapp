import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.mjs';
import { User } from '../models/user.mjs';
import UserProfile from '../models/userProfile.mjs';

const router = express.Router();

// Storage config: save as <userid>.jpg or .png under media/Profpic
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MEDIA_DIR = path.resolve(__dirname, '../media/Profpic');

// Ensure directory exists
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, MEDIA_DIR);
  },
  filename: (req, file, cb) => {
    try {
      const userid = (req.user?.userid || '').toString().trim().toLowerCase();
      const ext = file.mimetype === 'image/png' ? '.png' : '.jpg';
      cb(null, `${userid}${ext}`);
    } catch (e) {
      cb(e);
    }
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error('Only JPEG and PNG images are allowed'));
  }
  cb(null, true);
}

const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE }, fileFilter });

// GET /api/profile -> current user's merged profile
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const me = await User.findByPk(req.user.id, { attributes: { exclude: ['usrpassword'] } });
    if (!me) return res.status(404).json({ error: 'User not found' });

    const profile = await UserProfile.findOne({ where: { userid: me.id } });
    const pic = me.usrpic || profile?.profile_pic || null;

    return res.json({
      user: me,
      profile: profile || null,
      photoUrl: pic ? `/media/Profpic/${pic}` : null,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/profile -> update user basic fields + profile + optional photo upload
router.patch('/', requireAuth, upload.single('usrpic'), async (req, res, next) => {
  try {
    const me = await User.findByPk(req.user.id);
    if (!me) return res.status(404).json({ error: 'User not found' });

    const body = req.body || {};
    // Allow updating basic fields on users table
    const allowedUser = ['first_name', 'last_name', 'email', 'phone', 'address', 'city'];
    for (const k of allowedUser) {
      if (body[k] !== undefined) me[k] = body[k];
    }

    // Handle photo upload
    if (req.file) {
      // Save filename on user.usrpic and user_profiles.profile_pic
      const filename = path.basename(req.file.filename);
      me.usrpic = filename;
    }

    await me.save();

    // Upsert into user_profiles
    let profile = await UserProfile.findOne({ where: { userid: me.id } });
    if (!profile) {
      profile = await UserProfile.create({ userid: me.id });
    }

    const allowedProfile = [
      'first_name',
      'middle_name',
      'last_name',
      'email',
      'phone',
      'actual_joining_date',
      'institute_joining_date',
    ];
    for (const k of allowedProfile) {
      if (body[k] !== undefined) profile[k] = body[k];
    }
    if (req.file) {
      profile.profile_pic = path.basename(req.file.filename);
    }
    await profile.save();

    return res.json({
      ok: true,
      user: { ...me.get(), usrpassword: undefined },
      profile,
      photoUrl: me.usrpic ? `/media/Profpic/${me.usrpic}` : null,
    });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  }
});

export default router;
