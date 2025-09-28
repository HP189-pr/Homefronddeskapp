import express from 'express';
import { createLog, getLogs, getUserLogs } from '../controllers/logController.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import requireAdmin from '../middleware/requireAdmin.mjs';

const router = express.Router();

// Public-ish endpoint to create logs (authenticated preferred)
router.post('/', requireAuth, createLog);

// Admin endpoints
router.get('/', requireAdmin, getLogs);
router.get('/users/:id', requireAdmin, getUserLogs);

export default router;
