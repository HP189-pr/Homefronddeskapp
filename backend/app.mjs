// backend/app.mjs
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

import { jwtMiddleware, requireAuth } from './middleware/auth.mjs';
import authRoutes from './routes/authRoutes.mjs';
import userRoutes from './routes/userRoutes.mjs';
import errorHandler from './middleware/errorHandler.mjs';
import { sequelize } from './db.mjs'; // init/connect upfront
import misctoolRoutes from './routes/misctoolRoutes.mjs';
import logRoutes from './routes/logRoutes.mjs';
import mastersRoutes from './routes/mastersRoutes.mjs';
import enrollmentRoutes from './routes/enrollmentRoutes.mjs';
import degreeRoutes from './routes/degreeRoutes.mjs';
import leaveRoutes from './routes/leaveRoutes.mjs';
import navigationRoutes from './routes/navigationRoutes.mjs';
import courseMasterRoutes from './routes/courseMasterRoutes.mjs';
import analyticsRoutes from './routes/analyticsRoutes.mjs';

// Register models so Sequelize sees them (ensure these files exist)
import './models/index.mjs'; // registers models: user, module, menu, institute, role, permission, etc.

// Admin route protection + admin routes
import requireAdmin from './middleware/requireAdmin.mjs';
import adminRoutes from './routes/adminRoutes.mjs';
import profileRoutes from './routes/profileRoutes.mjs';
import transcriptRoutes from './routes/transcriptRoutes.mjs';
import migrationRoutes from './routes/migrationRoutes.mjs';
import provisionalRoutes from './routes/provisionalRoutes.mjs';
import instLetterRoutes from './routes/instLetter.routes.mjs';
import instVerificationRoutes from './routes/instVerificationRoutes.mjs';
import documentReceiptRoutes from './routes/documentReceiptRoutes.mjs';
import verificationPublicRoutes from './routes/verificationPublicRoutes.mjs';
import mailRequestRoutes from './routes/mailRequestRoutes.mjs';
import transcriptRequestRoutes from './routes/transcriptRequestRoutes.mjs';
import studentSearchRoutes from './routes/studentSearchRoutes.mjs';
import { normalizeDMYDates } from './utils/dateFormat.mjs';
import chatRoutes from './routes/chatRoutes.mjs';
import { User } from './models/user.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// In-memory dashboard preferences cache (per user id)
const dashboardPrefs = new Map();
const adminPanelVerification = new Map();
const ADMIN_VERIFY_TTL_MS = Number(process.env.ADMIN_VERIFY_TTL_MS || 30 * 60 * 1000);

function verifyDjangoPassword(password, encoded) {
  const parts = (encoded || '').split('$');
  if (parts.length !== 4) return false;
  const [algo, iterStr, salt, digest] = parts;
  if (!algo.startsWith('pbkdf2_')) return false;
  const iterations = parseInt(iterStr, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  try {
    const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64');
    return crypto.timingSafeEqual(Buffer.from(digest, 'base64'), Buffer.from(derived, 'base64'));
  } catch {
    return false;
  }
}

async function comparePassword(plain, hashed) {
  const hash = String(hashed || '');
  if (!hash) return false;
  if (hash.startsWith('pbkdf2_')) {
    return verifyDjangoPassword(plain, hash);
  }
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}


// Security + parsing middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
// Single CORS setup (avoid duplicates); default to localhost:3000 for dev if not provided
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: allowedOrigin, credentials: true, exposedHeaders: ['Content-Disposition'] }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_AUTH_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

const searchLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_SEARCH_WINDOW_MS || 60 * 1000),
  max: Number(process.env.RATE_LIMIT_SEARCH_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/backlogin', authLimiter);
app.use('/api/auth/verify-password', authLimiter);
app.use('/api/verify-admin-panel-password', authLimiter);
app.use('/api/student-search/search', searchLimiter);

// Normalize DD-MM-YYYY date strings in req.body and req.query to ISO YYYY-MM-DD
app.use((req, _res, next) => {
  try {
    if (req.body && typeof req.body === 'object') normalizeDMYDates(req.body);
    if (req.query && typeof req.query === 'object') normalizeDMYDates(req.query);
  } catch (e) {
    // do not block request on parser errors; just continue
  }
  next();
});

// attach DB instance for convenience
app.set('sequelize', sequelize);

// Non-blocking JWT middleware: if Authorization header present and valid, attach req.user
app.use(jwtMiddleware);

// Public / auth routes (also expose legacy /api/backlogin etc.)
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes);

// Serve media (logs, chat files, tmp). Block direct public access to profile pictures.
app.use('/media', (req, res, next) => {
  const p = String(req.path || '').toLowerCase();
  if (p.startsWith('/profpic/') || p.startsWith('/profile_pictures/')) {
    return res.status(403).json({ error: 'Profile pictures are protected' });
  }
  return next();
});
app.use('/media', express.static(path.resolve(__dirname, './media')));

// Example user routes
app.use('/api/users', userRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/degrees', degreeRoutes);
app.use('/api', mastersRoutes);
app.use('/api', navigationRoutes);
app.use('/api', courseMasterRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', leaveRoutes);
app.use('/api/profile', profileRoutes);

// --- Admin routes ---
app.use('/api/admin', requireAdmin, adminRoutes);
app.use('/api/admin/verifications', requireAdmin, transcriptRoutes);
app.use('/api/verifications', verificationPublicRoutes);
app.use('/api/verification', verificationPublicRoutes);
// Admin migrations with safe fallback
app.get('/api/admin/migrations', requireAdmin, async (req, res) => {
  try {
    const { listMigrations } = await import('./services/migrationService.mjs');
    const rows = await listMigrations(req.query || {});
    return res.json({ items: rows });
  } catch (err) {
    console.error('migrations list error', err);
    return res.json({ items: [] });
  }
});
app.use('/api/admin/migrations', requireAdmin, migrationRoutes);

// Admin provisionals with safe fallback
app.get('/api/admin/provisionals', requireAdmin, async (req, res) => {
  try {
    const { listProvisionals } = await import('./services/provisionalService.mjs');
    const rows = await listProvisionals(req.query || {});
    return res.json({ items: rows });
  } catch (err) {
    console.error('provisionals list error', err);
    return res.json({ items: [] });
  }
});
app.use('/api/admin/provisionals', requireAdmin, provisionalRoutes);

// --- Compatibility/alias routes to avoid 500s from legacy frontend paths ---

// Legacy verification path
// handled by app.use('/api/verification', verificationPublicRoutes)

// Legacy migration path
app.get('/api/migration', requireAuth, async (req, res) => {
  try {
    const { listMigrations } = await import('./services/migrationService.mjs');
    const rows = await listMigrations(req.query || {});
    return res.json({ items: rows });
  } catch (err) {
    console.error('migration alias error', err);
    return res.json({ items: [] });
  }
});

// Legacy provisional path
app.get('/api/provisional', requireAuth, async (req, res) => {
  try {
    const { listProvisionals } = await import('./services/provisionalService.mjs');
    const rows = await listProvisionals(req.query || {});
    return res.json({ items: rows });
  } catch (err) {
    console.error('provisional alias error', err);
    return res.json({ items: [] });
  }
});

app.use('/api', requireAuth, instVerificationRoutes);

// Convocations stub
app.get('/api/convocations/list_all', requireAuth, (_req, res) => res.json([]));
app.use('/api/admin/institutionals', requireAdmin, instLetterRoutes);
app.use('/api/admin/doc-receipts', requireAdmin, documentReceiptRoutes);
app.use('/api/docrec', requireAuth, documentReceiptRoutes);
app.use('/api/mail-requests', requireAuth, mailRequestRoutes);
app.use('/api/transcript-requests', requireAuth, transcriptRequestRoutes);
app.use('/api/student-search', requireAuth, studentSearchRoutes);
app.use('/api', misctoolRoutes);
app.use('/api/chat', chatRoutes);
// Logs
app.use('/api/logs', logRoutes);

// ---- Legacy compatibility endpoints (frontend expects these paths) ----
const sendList = (res, rows = []) => {
  const list = Array.isArray(rows) ? rows : [];
  return res.json({ results: list, items: list, count: list.length, num_pages: 1 });
};

// Inward / outward register compatibility
app.get(['/api/inward-register', '/api/inward-register/'], requireAuth, async (req, res) => {
  try {
    const { listInward } = await import('./services/inward-outwardService.js');
    const rows = await listInward(req.query || {});
    return sendList(res, rows);
  } catch (err) {
    console.error('inward-register list compatibility error', err);
    return sendList(res, []);
  }
});
app.get(['/api/outward-register', '/api/outward-register/'], requireAuth, async (req, res) => {
  try {
    const { listOutward } = await import('./services/inward-outwardService.js');
    const rows = await listOutward(req.query || {});
    return sendList(res, rows);
  } catch (err) {
    console.error('outward-register list compatibility error', err);
    return sendList(res, []);
  }
});
app.get(['/api/inward-register/next-number', '/api/inward-register/next-number/'], requireAuth, async (req, res) => {
  try {
    const { getNextInwardNumber } = await import('./services/inward-outwardService.js');
    const next = await getNextInwardNumber(req.query?.type || 'Gen');
    return res.json({ last_no: null, next_no: next || null });
  } catch (err) {
    console.error('inward-register next-number compatibility error', err);
    return res.json({ last_no: null, next_no: null });
  }
});
app.get(['/api/outward-register/next-number', '/api/outward-register/next-number/'], requireAuth, async (req, res) => {
  try {
    const { getNextOutwardNumber } = await import('./services/inward-outwardService.js');
    const next = await getNextOutwardNumber(req.query?.type || 'Gen');
    return res.json({ last_no: null, next_no: next || null });
  } catch (err) {
    console.error('outward-register next-number compatibility error', err);
    return res.json({ last_no: null, next_no: null });
  }
});

// Inventory/CCTV compatibility
app.get(['/api/inventory-items', '/api/inventory-items/'], requireAuth, async (req, res) => {
  try {
    const search = String(req.query?.search || '').trim().toLowerCase();
    let sql = 'SELECT id, item_name, description, created_at, updated_at FROM inventory_item';
    const replacements = {};
    if (search) {
      sql += " WHERE LOWER(item_name) LIKE :search OR LOWER(COALESCE(description, '')) LIKE :search";
      replacements.search = `%${search}%`;
    }
    sql += ' ORDER BY item_name ASC';
    const [rows] = await sequelize.query(sql, { replacements });
    return sendList(res, rows || []);
  } catch (err) {
    console.error('inventory-items list error', err);
    return sendList(res, []);
  }
});
app.post(['/api/inventory-items', '/api/inventory-items/'], requireAuth, async (req, res) => {
  try {
    const payload = req.body || {};
    const itemName = String(payload.item_name || '').trim();
    const description = payload.description ?? null;
    if (!itemName) return res.status(400).json({ detail: 'item_name is required' });
    const [rows] = await sequelize.query(
      `INSERT INTO inventory_item (item_name, description, created_at, updated_at)
       VALUES (:item_name, :description, NOW(), NOW())
       RETURNING id, item_name, description, created_at, updated_at`,
      { replacements: { item_name: itemName, description } },
    );
    return res.status(201).json(rows?.[0] || null);
  } catch (err) {
    console.error('inventory-items create error', err);
    return res.status(500).json({ detail: 'Failed to create inventory item' });
  }
});
app.put(['/api/inventory-items/:id', '/api/inventory-items/:id/'], requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payload = req.body || {};
    const itemName = String(payload.item_name || '').trim();
    const description = payload.description ?? null;
    if (!id) return res.status(400).json({ detail: 'Invalid id' });
    if (!itemName) return res.status(400).json({ detail: 'item_name is required' });
    const [rows] = await sequelize.query(
      `UPDATE inventory_item
       SET item_name = :item_name, description = :description, updated_at = NOW()
       WHERE id = :id
       RETURNING id, item_name, description, created_at, updated_at`,
      { replacements: { id, item_name: itemName, description } },
    );
    if (!rows?.length) return res.status(404).json({ detail: 'Not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('inventory-items update error', err);
    return res.status(500).json({ detail: 'Failed to update inventory item' });
  }
});
app.delete(['/api/inventory-items/:id', '/api/inventory-items/:id/'], requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ detail: 'Invalid id' });
    const [rows] = await sequelize.query('DELETE FROM inventory_item WHERE id = :id RETURNING id', { replacements: { id } });
    if (!rows?.length) return res.status(404).json({ detail: 'Not found' });
    return res.json({ ok: true, id, deleted: true });
  } catch (err) {
    console.error('inventory-items delete error', err);
    return res.status(500).json({ detail: 'Failed to delete inventory item' });
  }
});

app.get(['/api/inventory-inward', '/api/inventory-inward/'], requireAuth, async (_req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT ii.id, ii.inward_date, ii.qty, ii.details, ii.item_id AS item, itm.item_name
       FROM inventory_inward ii
       LEFT JOIN inventory_item itm ON itm.id = ii.item_id
       ORDER BY ii.inward_date DESC, ii.id DESC`,
    );
    return sendList(res, rows || []);
  } catch (err) {
    console.error('inventory-inward list error', err);
    return sendList(res, []);
  }
});
app.post(['/api/inventory-inward', '/api/inventory-inward/'], requireAuth, async (req, res) => {
  try {
    const payload = req.body || {};
    const inwardDate = payload.inward_date || null;
    const itemId = Number(payload.item || payload.item_id || 0);
    const qty = Number(payload.qty || 0);
    const details = payload.details ?? null;
    if (!inwardDate || !itemId || qty <= 0) return res.status(400).json({ detail: 'inward_date, item and positive qty are required' });

    const [rows] = await sequelize.query(
      `INSERT INTO inventory_inward (inward_date, item_id, qty, details, created_at)
       VALUES (:inward_date, :item_id, :qty, :details, NOW())
       RETURNING id, inward_date, item_id AS item, qty, details`,
      { replacements: { inward_date: inwardDate, item_id: itemId, qty, details } },
    );
    return res.status(201).json(rows?.[0] || null);
  } catch (err) {
    console.error('inventory-inward create error', err);
    return res.status(500).json({ detail: 'Failed to create inward entry' });
  }
});
app.put(['/api/inventory-inward/:id', '/api/inventory-inward/:id/'], requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payload = req.body || {};
    const inwardDate = payload.inward_date || null;
    const itemId = Number(payload.item || payload.item_id || 0);
    const qty = Number(payload.qty || 0);
    const details = payload.details ?? null;
    if (!id || !inwardDate || !itemId || qty <= 0) return res.status(400).json({ detail: 'id, inward_date, item and positive qty are required' });

    const [rows] = await sequelize.query(
      `UPDATE inventory_inward
       SET inward_date = :inward_date, item_id = :item_id, qty = :qty, details = :details
       WHERE id = :id
       RETURNING id, inward_date, item_id AS item, qty, details`,
      { replacements: { id, inward_date: inwardDate, item_id: itemId, qty, details } },
    );
    if (!rows?.length) return res.status(404).json({ detail: 'Not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('inventory-inward update error', err);
    return res.status(500).json({ detail: 'Failed to update inward entry' });
  }
});
app.delete(['/api/inventory-inward/:id', '/api/inventory-inward/:id/'], requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ detail: 'Invalid id' });
    const [rows] = await sequelize.query('DELETE FROM inventory_inward WHERE id = :id RETURNING id', { replacements: { id } });
    if (!rows?.length) return res.status(404).json({ detail: 'Not found' });
    return res.json({ ok: true, id, deleted: true });
  } catch (err) {
    console.error('inventory-inward delete error', err);
    return res.status(500).json({ detail: 'Failed to delete inward entry' });
  }
});

app.get(['/api/inventory-outward', '/api/inventory-outward/'], requireAuth, async (_req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT oo.id, oo.outward_date, oo.qty, oo.receiver, oo.received_qty, oo.remark, oo.item_id AS item, itm.item_name
       FROM inventory_outward oo
       LEFT JOIN inventory_item itm ON itm.id = oo.item_id
       ORDER BY oo.outward_date DESC, oo.id DESC`,
    );
    return sendList(res, rows || []);
  } catch (err) {
    console.error('inventory-outward list error', err);
    return sendList(res, []);
  }
});
app.post(['/api/inventory-outward', '/api/inventory-outward/'], requireAuth, async (req, res) => {
  try {
    const payload = req.body || {};
    const outwardDate = payload.outward_date || null;
    const itemId = Number(payload.item || payload.item_id || 0);
    const qty = Number(payload.qty || 0);
    const receiver = String(payload.receiver || '').trim();
    const receivedQty = payload.received_qty == null || payload.received_qty === '' ? null : Number(payload.received_qty);
    const remark = payload.remark ?? null;
    if (!outwardDate || !itemId || qty <= 0 || !receiver) return res.status(400).json({ detail: 'outward_date, item, receiver and positive qty are required' });

    const [rows] = await sequelize.query(
      `INSERT INTO inventory_outward (outward_date, item_id, qty, receiver, received_qty, remark, created_at)
       VALUES (:outward_date, :item_id, :qty, :receiver, :received_qty, :remark, NOW())
       RETURNING id, outward_date, item_id AS item, qty, receiver, received_qty, remark`,
      { replacements: { outward_date: outwardDate, item_id: itemId, qty, receiver, received_qty: receivedQty, remark } },
    );
    return res.status(201).json(rows?.[0] || null);
  } catch (err) {
    console.error('inventory-outward create error', err);
    return res.status(500).json({ detail: 'Failed to create outward entry' });
  }
});
app.put(['/api/inventory-outward/:id', '/api/inventory-outward/:id/'], requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payload = req.body || {};
    const outwardDate = payload.outward_date || null;
    const itemId = Number(payload.item || payload.item_id || 0);
    const qty = Number(payload.qty || 0);
    const receiver = String(payload.receiver || '').trim();
    const receivedQty = payload.received_qty == null || payload.received_qty === '' ? null : Number(payload.received_qty);
    const remark = payload.remark ?? null;
    if (!id || !outwardDate || !itemId || qty <= 0 || !receiver) return res.status(400).json({ detail: 'id, outward_date, item, receiver and positive qty are required' });

    const [rows] = await sequelize.query(
      `UPDATE inventory_outward
       SET outward_date = :outward_date, item_id = :item_id, qty = :qty, receiver = :receiver, received_qty = :received_qty, remark = :remark
       WHERE id = :id
       RETURNING id, outward_date, item_id AS item, qty, receiver, received_qty, remark`,
      { replacements: { id, outward_date: outwardDate, item_id: itemId, qty, receiver, received_qty: receivedQty, remark } },
    );
    if (!rows?.length) return res.status(404).json({ detail: 'Not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('inventory-outward update error', err);
    return res.status(500).json({ detail: 'Failed to update outward entry' });
  }
});
app.delete(['/api/inventory-outward/:id', '/api/inventory-outward/:id/'], requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ detail: 'Invalid id' });
    const [rows] = await sequelize.query('DELETE FROM inventory_outward WHERE id = :id RETURNING id', { replacements: { id } });
    if (!rows?.length) return res.status(404).json({ detail: 'Not found' });
    return res.json({ ok: true, id, deleted: true });
  } catch (err) {
    console.error('inventory-outward delete error', err);
    return res.status(500).json({ detail: 'Failed to delete outward entry' });
  }
});

app.get(['/api/inventory-stock-summary', '/api/inventory-stock-summary/'], requireAuth, async (_req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT
        i.id AS item_id,
        i.item_name,
        i.description,
        COALESCE((SELECT SUM(ii.qty) FROM inventory_inward ii WHERE ii.item_id = i.id), 0) AS inward_total,
        COALESCE((SELECT SUM(oo.qty) FROM inventory_outward oo WHERE oo.item_id = i.id), 0) AS outward_total,
        COALESCE((SELECT SUM(ii.qty) FROM inventory_inward ii WHERE ii.item_id = i.id), 0)
        - COALESCE((SELECT SUM(oo.qty) FROM inventory_outward oo WHERE oo.item_id = i.id), 0) AS balance
      FROM inventory_item i
      ORDER BY i.item_name ASC`,
    );
    return sendList(res, rows || []);
  } catch (err) {
    console.error('inventory-stock-summary error', err);
    return sendList(res, []);
  }
});
app.get(['/api/exam', '/api/exam/'], requireAuth, (_req, res) => sendList(res, []));
app.get(['/api/centre', '/api/centre/'], requireAuth, (_req, res) => sendList(res, []));
app.get(['/api/dvd', '/api/dvd/'], requireAuth, (_req, res) => sendList(res, []));
app.get(['/api/cctv-outward', '/api/cctv-outward/'], requireAuth, (_req, res) => sendList(res, []));

// Fee type and cash register compatibility
app.get(['/api/fee-types', '/api/fee-types/'], requireAuth, (_req, res) => sendList(res, []));
app.get(['/api/receipts/flattened', '/api/receipts/flattened/'], requireAuth, (_req, res) => sendList(res, []));
app.get(['/api/cash-register/next-receipt', '/api/cash-register/next-receipt/'], requireAuth, (_req, res) => {
  res.json({ receipt_no_full: null, next_receipt_no: null });
});

// Student fees compatibility
app.get(['/api/student-fees', '/api/student-fees/'], requireAuth, (_req, res) => sendList(res, []));
app.get(['/api/student-fees/summary', '/api/student-fees/summary/'], requireAuth, (req, res) => {
  res.json({
    student_no: req.query?.student_no || '',
    student_name: '',
    enrollment_no: '',
    temp_enroll_no: '',
    total_amount: 0,
    count: 0,
  });
});
app.get(['/api/student-fees/by-term', '/api/student-fees/by-term/'], requireAuth, (_req, res) => sendList(res, []));

// Simple admin check endpoint used by frontend
app.get('/api/check-admin-access', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const isAdmin = req.user.usertype === 'admin' || req.user.usertype === 'staff';
  return res.json({ is_admin: isAdmin });
});

// Admin panel password verification (frontend expects this path)
app.post('/api/verify-admin-panel-password', requireAuth, async (req, res, next) => {
  try {
    const candidate = String(req.body?.password || req.body?.usrpassword || '').trim();
    if (!candidate) return res.status(400).json({ verified: false, message: 'Password is required' });

    const currentUser = await User.findByPk(req.user.id);
    if (!currentUser) return res.status(401).json({ verified: false, message: 'Unauthorized' });

    let verified = await comparePassword(candidate, currentUser.usrpassword);

    if (!verified) {
      const envPlain = process.env.ADMIN_PW || '';
      const envHash = process.env.ADMIN_PW_HASH || '';
      if (envPlain && candidate === envPlain) {
        verified = true;
      } else if (envHash) {
        try {
          verified = await bcrypt.compare(candidate, envHash);
        } catch {
          verified = false;
        }
      }
    }

    if (!verified) {
      adminPanelVerification.delete(req.user.id);
      return res.status(401).json({ verified: false, message: 'Invalid password' });
    }

    adminPanelVerification.set(req.user.id, Date.now() + ADMIN_VERIFY_TTL_MS);
    return res.json({ verified: true, message: 'Access granted' });
  } catch (err) {
    return next(err);
  }
});

// Checks active server-side verification window for current user
app.get('/api/verify-admin-panel-password', requireAuth, (_req, res) => {
  const expiresAt = adminPanelVerification.get(_req.user.id) || 0;
  if (expiresAt > Date.now()) return res.json({ verified: true });
  adminPanelVerification.delete(_req.user.id);
  return res.json({ verified: false });
});

// Dashboard preferences storage (per-user, in-memory for now)
app.get('/api/dashboard-preferences', requireAuth, (req, res) => {
  try {
    if (!req.user) return res.json({ selected_modules: [] });
    const prefs = dashboardPrefs.get(req.user.id) || { selected_modules: [] };
    return res.json(prefs);
  } catch (err) {
    console.error('dashboard prefs get error', err);
    return res.json({ selected_modules: [] });
  }
});

app.put('/api/dashboard-preferences', requireAuth, (req, res) => {
  try {
    if (!req.user) return res.json({ ok: true, selected_modules: [] });
    const body = req.body || {};
    const selected = Array.isArray(body.selected_modules) ? body.selected_modules.slice(0, 4) : [];
    const prefs = { selected_modules: selected };
    dashboardPrefs.set(req.user.id, prefs);
    return res.json({ ok: true, ...prefs });
  } catch (err) {
    console.error('dashboard prefs put error', err);
    return res.json({ ok: true, selected_modules: [] });
  }
});

// --- my rights endpoint ---
app.get('/api/rights/my', async (req, res) => {
  try {
    if (!req.user) return res.json({ admin: false, permissions: [] });

    if (req.user.usertype === 'admin') {
      return res.json({ admin: true, permissions: [] });
    }

    const { RoleAssignment } = await import('./models/roleAssignment.mjs');
    const { Permission } = await import('./models/permission.mjs');

    const assignments = await RoleAssignment.findAll({ where: { userid: req.user.id } });
    const roleIds = assignments.map((r) => r.roleid);

    if (!roleIds.length) {
      return res.json({ admin: false, permissions: [] });
    }

    const permissions = await Permission.findAll({
      where: { roleid: roleIds },
      order: [['permissionid', 'ASC']],
    });

    return res.json({ admin: false, permissions });
  } catch (err) {
    console.error('GET /api/rights/my error', err);
    return res.status(500).json({ error: 'Failed to fetch rights' });
  }
});

// Health-check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// --- Serve static frontend in production only ---
if (process.env.NODE_ENV === 'production') {
  const distPathLower = path.resolve(__dirname, '../frontend/dist');
  const distPathUpper = path.resolve(__dirname, '../frontend/Dist');
  const distPath = fs.existsSync(distPathLower) ? distPathLower : distPathUpper;
  app.use(express.static(distPath));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handler must be last
app.use(errorHandler);

export default app;
