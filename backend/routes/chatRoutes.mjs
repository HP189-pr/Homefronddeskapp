import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mime from 'mime-types';
import { requireAuth } from '../middleware/auth.mjs';
import { ChatMessage } from '../models/chat_message.mjs';
import { encryptText, decryptText } from '../utils/chatCrypto.mjs';
import { logAction } from '../utils/logAction.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MEDIA_ROOT = path.resolve(__dirname, '../media');
const CHAT_DIR = path.join(MEDIA_ROOT, 'chats');
fs.mkdirSync(CHAT_DIR, { recursive: true });

// Multer storage for chats
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CHAT_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${base}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router = express.Router();

// --- In-memory presence map (process-local). Consider Redis for multi-instance.
const PRESENCE_TTL_MS = 30 * 1000; // 30s considered online
const presence = new Map(); // userId -> lastSeen epoch ms

function nowMs() { return Date.now(); }
function markOnline(userId) { if (userId) presence.set(userId, nowMs()); }
function isOnline(userId) { const ts = presence.get(userId); return !!(ts && nowMs() - ts < PRESENCE_TTL_MS); }
function getPresenceList() {
  const out = [];
  for (const [uid, ts] of presence.entries()) {
    out.push({ userid: uid, last_seen: ts, online: nowMs() - ts < PRESENCE_TTL_MS });
  }
  return out;
}

// Heartbeat from clients to mark themselves online
router.post('/ping', requireAuth, async (req, res) => {
  try { markOnline(req.user?.id); return res.json({ ok: true, now: nowMs() }); } catch { return res.json({ ok: true }); }
});

// Presence list (lightweight)
router.get('/presence', requireAuth, async (req, res) => {
  try { return res.json({ presence: getPresenceList() }); } catch (e) { return res.json({ presence: [] }); }
});

// Send a message (with optional file)
router.post('/send', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const from = req.user?.id;
    const to = parseInt(req.body?.to_userid, 10);
    if (!from || !to) return res.status(400).json({ error: 'Missing to_userid' });
    // mark sender online on activity
    markOnline(from);
  const text = (req.body?.text || '').toString();
    let fileRec = { file_name: null, file_path: null, file_mime: null, file_size: null };
    if (req.file) {
      const relPath = path.relative(MEDIA_ROOT, req.file.path).replace(/\\/g, '/');
      fileRec = {
        file_name: req.file.originalname,
        file_path: relPath, // e.g. chats/filename.ext
        file_mime: mime.lookup(req.file.path) || req.file.mimetype || null,
        file_size: req.file.size || null,
      };
    }
    const row = await ChatMessage.create({ from_userid: from, to_userid: to, text: text ? encryptText(text) : null, ...fileRec });
    try { await logAction(req, 'chat.send', { to_userid: to, hasFile: !!req.file, file: fileRec.file_name }); } catch {}
    // Return with decrypted text for the sender's immediate view
  const payload = row.toJSON();
  if (payload && typeof payload.text === 'string') payload.text = decryptText(payload.text);
    // Add recipient online hint (not persisted)
    payload.recipientOnline = isOnline(to);
    res.json(payload);
  } catch (e) { next(e); }
});

// List message history with another user (supports pagination)
router.get('/history/:userid', requireAuth, async (req, res, next) => {
  try {
    const me = req.user?.id;
    const other = parseInt(req.params.userid, 10);
    const limit = Math.min(200, parseInt(req.query.limit || '100', 10));
    const offset = Math.max(0, parseInt(req.query.offset || '0', 10));
    const { Op } = await import('sequelize');
    const rows = await ChatMessage.findAll({
      where: {
        [Op.or]: [
          { from_userid: me, to_userid: other, hide_for_sender: false },
          { from_userid: other, to_userid: me, hide_for_receiver: false },
        ],
      },
      order: [['createdat','ASC']],
      limit, offset,
    });
    const out = rows.map(r => {
      const o = r.toJSON();
      if (o && typeof o.text === 'string') o.text = decryptText(o.text);
      return o;
    });
    res.json({ messages: out });
  } catch (e) { next(e); }
});

// List file history with another user (sent and received)
router.get('/files/:userid', requireAuth, async (req, res, next) => {
  try {
    const me = req.user?.id;
    const other = parseInt(req.params.userid, 10);
    const { Op } = await import('sequelize');
    const rows = await ChatMessage.findAll({
      where: {
        [Op.or]: [
          { from_userid: me, to_userid: other, hide_for_sender: false },
          { from_userid: other, to_userid: me, hide_for_receiver: false },
        ],
        file_path: { [Op.ne]: null },
      },
      order: [['createdat','DESC']],
    });
    // No need to decrypt files; only filenames may be present
    res.json({ files: rows });
  } catch (e) { next(e); }
});

// Clear chat history (soft hide) - type: all | sent | received | files | messages
router.post('/clear/:userid', requireAuth, async (req, res, next) => {
  try {
    const me = req.user?.id;
    const other = parseInt(req.params.userid, 10);
    const type = String(req.body?.type || 'all');
    const { Op } = await import('sequelize');

    const whereSent = { from_userid: me, to_userid: other };
    const whereRecv = { from_userid: other, to_userid: me };
    const updates = [];
    if (type === 'all' || type === 'messages') {
      updates.push(ChatMessage.update({ hide_for_sender: true }, { where: { ...whereSent } }));
      updates.push(ChatMessage.update({ hide_for_receiver: true }, { where: { ...whereRecv } }));
    }
    if (type === 'files') {
      updates.push(ChatMessage.update({ hide_for_sender: true }, { where: { ...whereSent, file_path: { [Op.ne]: null } } }));
      updates.push(ChatMessage.update({ hide_for_receiver: true }, { where: { ...whereRecv, file_path: { [Op.ne]: null } } }));
    }
    if (type === 'sent') {
      updates.push(ChatMessage.update({ hide_for_sender: true }, { where: whereSent }));
    }
    if (type === 'received') {
      updates.push(ChatMessage.update({ hide_for_receiver: true }, { where: whereRecv }));
    }
    await Promise.all(updates);
    try { await logAction(req, 'chat.clear', { other, type }); } catch {}
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
