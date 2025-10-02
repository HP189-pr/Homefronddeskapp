import express from 'express';
import degreeController from '../controllers/degreeController.mjs';

const router = express.Router();

router.get('/', degreeController.search);
router.get('/:id', degreeController.getById);
router.post('/', degreeController.create);
router.put('/:id', degreeController.update);
router.delete('/:id', degreeController.remove);

export default router;
