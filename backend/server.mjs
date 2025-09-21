// backend/server.mjs
import dotenv from 'dotenv';
dotenv.config();

import app from './app.mjs';

const PORT = parseInt(process.env.PORT || '5000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend listening on http://localhost:${PORT}`);
});
