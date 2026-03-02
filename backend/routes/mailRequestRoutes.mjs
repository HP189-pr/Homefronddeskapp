import express from 'express';
import {
  listMailRequestsHandler,
  updateMailRequestHandler,
  refreshMailRequestVerificationHandler,
  bulkRefreshMailRequestsHandler,
  syncMailFromSheet,
} from '../controllers/googlesync_controller.mjs';

const router = express.Router();

router.get('/', listMailRequestsHandler);
router.patch('/:id/', updateMailRequestHandler);
router.patch('/:id', updateMailRequestHandler);
router.post('/:id/refresh-verification/', refreshMailRequestVerificationHandler);
router.post('/:id/refresh-verification', refreshMailRequestVerificationHandler);
router.post('/bulk-refresh/', bulkRefreshMailRequestsHandler);
router.post('/bulk-refresh', bulkRefreshMailRequestsHandler);
router.post('/sync-from-sheet/', syncMailFromSheet);
router.post('/sync-from-sheet', syncMailFromSheet);

export default router;
