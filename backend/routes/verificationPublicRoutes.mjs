import express from 'express';
import { list, getById } from '../controllers/verificationController.mjs';

const router = express.Router();

// Public read-only routes
router.get('/', list);
router.get('/:id', getById);

export default router;
