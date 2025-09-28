// backend/routes/enrollmentRoutes.mjs
import express from 'express';
import enrollmentController from '../controllers/enrollmentController.mjs';

const router = express.Router();

router.get('/', enrollmentController.search);
router.get('/:id', enrollmentController.getById);
router.post('/', enrollmentController.create);
router.put('/:id', enrollmentController.update);
router.delete('/:id', enrollmentController.remove);

export default router;
