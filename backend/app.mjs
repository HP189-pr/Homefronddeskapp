// backend/app.mjs
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { jwtMiddleware } from './middleware/auth.mjs';
import authRoutes from './routes/authRoutes.mjs';
import userRoutes from './routes/userRoutes.mjs';
import { sequelize } from './db.mjs'; // init/connect upfront
import errorHandler from './middleware/errorHandler.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// attach DB to req optionally (avoid global if you prefer DI)
app.set('sequelize', sequelize);

app.use(jwtMiddleware); // attach req.user

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// static SPA (optional)
app.use(express.static(path.resolve(__dirname, '../Dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../Dist/index.html')));

// error handling middleware last
app.use(errorHandler);

export default app;
