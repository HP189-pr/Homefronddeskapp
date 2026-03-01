import express from 'express';
import { list, getById, create, update } from '../controllers/verificationController.mjs';

const router = express.Router();

// Public read-only routes
router.get('/', list);
router.get('/:id', getById);
router.post('/', create);
router.patch('/:id', update);

export default router;
