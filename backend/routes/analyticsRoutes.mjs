import express from 'express';
import * as ctrl from '../controllers/analyticsController.mjs';

const router = express.Router();

router.get(['/enrollment-stats', '/enrollment-stats/'], ctrl.enrollmentStats);

export default router;