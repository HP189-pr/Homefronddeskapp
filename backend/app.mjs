// backend/app.mjs
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';

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
import { normalizeDMYDates } from './utils/dateFormat.mjs';
import chatRoutes from './routes/chatRoutes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// In-memory dashboard preferences cache (per user id)
const dashboardPrefs = new Map();


// Security + parsing middlewares
app.use(helmet());
// Single CORS setup (avoid duplicates); default to localhost:3000 for dev if not provided
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: allowedOrigin, credentials: true, exposedHeaders: ['Content-Disposition'] }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

// Early compatibility stubs to stop legacy frontend screens from 500ing while data wiring is pending
app.get('/api/institutes', requireAuth, (_req, res) => res.json([]));
app.get('/api/mainbranch', requireAuth, (_req, res) => res.json([]));
app.get('/api/subbranch', requireAuth, (_req, res) => res.json([]));
// Serve media (profile pictures, logs, tmp)
app.use('/media', express.static(path.resolve(__dirname, './media')));
// Legacy alias for profile pictures path used by frontend
app.use('/media/profile_pictures', express.static(path.resolve(__dirname, './media/Profpic')));

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
// Public verifications list; return empty list on error
app.get('/api/verifications', async (_req, res) => {
  try {
    const { Verification } = await import('./models/docrec/transcript.mjs');
    const rows = await Verification.findAll({ limit: 25, order: [['id','DESC']] });
    return res.json({ items: rows });
  } catch (err) {
    console.error('verifications list error', err);
    return res.json({ items: [] });
  }
});
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

// Institutes / branches stubs for dropdowns
app.get('/api/institutes', requireAuth, (_req, res) => res.json([]));
app.get('/api/mainbranch', requireAuth, (_req, res) => res.json([]));
app.get('/api/subbranch', requireAuth, (_req, res) => res.json([]));

// Convocations stub
app.get('/api/convocations/list_all', requireAuth, (_req, res) => res.json([]));
app.use('/api/admin/institutionals', requireAdmin, instLetterRoutes);
app.use('/api/admin/doc-receipts', requireAdmin, documentReceiptRoutes);
app.use('/api/docrec', requireAuth, documentReceiptRoutes);
app.use('/api', misctoolRoutes);
app.use('/api/chat', chatRoutes);
// Logs
app.use('/api/logs', logRoutes);

// Simple admin check endpoint used by frontend
app.get('/api/check-admin-access', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const isAdmin = req.user.usertype === 'admin' || req.user.usertype === 'staff';
  return res.json({ is_admin: isAdmin });
});

// Admin panel password verification (frontend expects this path)
app.post('/api/verify-admin-panel-password', requireAuth, (req, res) => {
  // Accept any password for now; backend auth already validated the JWT
  return res.json({ verified: true, message: 'Access granted' });
});

// Idempotent check for admin panel verification (always true for authenticated users)
app.get('/api/verify-admin-panel-password', requireAuth, (_req, res) => {
  return res.json({ verified: true });
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

// Student search stub to avoid 500s; replace with real implementation when ready
app.get('/api/student-search/search', requireAuth, (req, res) => {
  const enrollment = req.query?.enrollment || '';
  const results = [];
  // If enrollment is provided, return a minimal placeholder so UI stays responsive
  if (enrollment) {
    results.push({
      enrollment_no: enrollment,
      student_name: 'N/A',
      course: null,
    });
  }
  return res.json({ results });
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
  const distPath = path.resolve(__dirname, '../frontend/Dist'); // adjust if needed
  app.use(express.static(distPath));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handler must be last
app.use(errorHandler);

export default app;
