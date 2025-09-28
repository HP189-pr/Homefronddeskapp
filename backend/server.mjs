// backend/server.mjs
import dotenv from 'dotenv';
dotenv.config();

import app from './app.mjs';
import { syncDb } from './db.mjs';

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';

// Ensure DB is in sync (safe in dev). For production, prefer migrations.
syncDb({ alter: true })
  .catch((e) => {
    console.error('DB sync failed:', e.message);
  })
  .finally(() => {
    app.listen(PORT, HOST, () => {
      const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
      console.log(`✅ Backend listening on http://${displayHost}:${PORT}`);
    });
  });
