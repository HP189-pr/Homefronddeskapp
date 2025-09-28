// backend/server.mjs
import dotenv from 'dotenv';
dotenv.config();

import app from './app.mjs';

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`✅ Backend listening on http://${displayHost}:${PORT}`);
});
