import express from 'express';
import * as ctrl from '../controllers/transcriptController.mjs';

const router = express.Router();

router.post('/:id/resubmit', ctrl.resubmit);

export default router;
