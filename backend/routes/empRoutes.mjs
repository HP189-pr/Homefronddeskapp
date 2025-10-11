// backend/routes/empRoutes.js
import express from 'express';
import * as empCtrl from '../controllers/empController.js';
import { isOwnerOrHR } from '../middleware/permissions.js';
const router = express.Router();

router.get('/', isOwnerOrHR, empCtrl.listProfiles);
router.post('/', isOwnerOrHR, empCtrl.createProfile);
router.get('/:id', isOwnerOrHR, empCtrl.getProfile);
router.put('/:id', isOwnerOrHR, empCtrl.updateProfile);
router.delete('/:id', isOwnerOrHR, empCtrl.deleteProfile);

export default router;
