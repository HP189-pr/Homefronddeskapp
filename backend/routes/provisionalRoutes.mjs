import express from 'express';
import * as ctrl from '../controllers/provisionalController.mjs';

const router = express.Router();

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);

export default router;
