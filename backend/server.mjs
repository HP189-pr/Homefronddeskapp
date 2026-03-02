// backend/server.mjs
import 'dotenv/config';

import app from './app.mjs';
import { syncDb } from './db.mjs';
import { ensurePerformanceIndexes } from './services/dbPerformanceService.mjs';

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';

// Optional DB alter sync controlled by env (default: off). Prefer migrations/scripts.
const DO_ALTER = String(process.env.DB_SYNC_ALTER || '').toLowerCase() === 'true';
const syncP = DO_ALTER
  ? syncDb({ alter: true }).catch((e) => {
      console.error('DB sync (alter) failed:', e.message);
    })
  : Promise.resolve();

syncP.finally(() => {
  ensurePerformanceIndexes().catch((err) => {
    console.warn('DB performance index bootstrap skipped:', err?.message || err);
  });

  app.listen(PORT, HOST, () => {
    const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
    console.log(`✅ Backend listening on http://${displayHost}:${PORT}`);
  });
});
