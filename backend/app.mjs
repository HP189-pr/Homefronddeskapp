// backend/app.mjs
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load .env early
dotenv.config();

import { jwtMiddleware } from './middleware/auth.mjs';
import authRoutes from './routes/authRoutes.mjs';
import userRoutes from './routes/userRoutes.mjs';
import errorHandler from './middleware/errorHandler.mjs';
import { sequelize } from './db.mjs'; // init/connect upfront
import misctoolRoutes from './routes/misctoolRoutes.mjs';
import logRoutes from './routes/logRoutes.mjs';
import mastersRoutes from './routes/mastersRoutes.mjs';
import enrollmentRoutes from './routes/enrollmentRoutes.mjs';
import degreeRoutes from './routes/degreeRoutes.mjs';

// Register models so Sequelize sees them (ensure these files exist)
import './models/index.mjs'; // registers models: user, module, menu, institute, role, permission, etc.

// Admin route protection + admin routes
import requireAdmin from './middleware/requireAdmin.mjs';
import adminRoutes from './routes/adminRoutes.mjs';
import profileRoutes from './routes/profileRoutes.mjs';
import verificationRoutes from './routes/verificationRoutes.mjs';
import migrationRoutes from './routes/migrationRoutes.mjs';
import provisionalRoutes from './routes/provisionalRoutes.mjs';
import institutionalVerificationRoutes from './routes/institutionalVerificationRoutes.mjs';
import documentReceiptRoutes from './routes/documentReceiptRoutes.mjs';
import verificationPublicRoutes from './routes/verificationPublicRoutes.mjs';
import { normalizeDMYDates } from './utils/dateFormat.mjs';
import chatRoutes from './routes/chatRoutes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();


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

// Public / auth routes
app.use('/api/auth', authRoutes);
// Serve media (profile pictures, logs, tmp)
app.use('/media', express.static(path.resolve(__dirname, './media')));

// Example user routes
app.use('/api/users', userRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/degrees', degreeRoutes);
app.use('/api', mastersRoutes);
app.use('/api/profile', profileRoutes);

// --- Admin routes ---
app.use('/api/admin', requireAdmin, adminRoutes);
app.use('/api/admin/verifications', requireAdmin, verificationRoutes);
app.use('/api/verifications', verificationPublicRoutes);
app.use('/api/admin/migrations', requireAdmin, migrationRoutes);
app.use('/api/admin/provisionals', requireAdmin, provisionalRoutes);
app.use('/api/admin/institutionals', requireAdmin, institutionalVerificationRoutes);
app.use('/api/admin/doc-receipts', requireAdmin, documentReceiptRoutes);
app.use('/api', misctoolRoutes);
app.use('/api/chat', chatRoutes);
// Logs
app.use('/api/logs', logRoutes);

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
