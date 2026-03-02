import express from 'express';
import {
  listTranscriptRequestsHandler,
  updateTranscriptRequestHandler,
  deleteTranscriptRequestHandler,
  bulkTranscriptStatusHandler,
  syncTranscriptFromSheet,
} from '../controllers/googlesync_controller.mjs';

const router = express.Router();

router.get('/', listTranscriptRequestsHandler);
router.patch('/:id/', updateTranscriptRequestHandler);
router.patch('/:id', updateTranscriptRequestHandler);
router.delete('/:id/', deleteTranscriptRequestHandler);
router.delete('/:id', deleteTranscriptRequestHandler);
router.post('/bulk-status/', bulkTranscriptStatusHandler);
router.post('/bulk-status', bulkTranscriptStatusHandler);
router.post('/sync-from-sheet/', syncTranscriptFromSheet);
router.post('/sync-from-sheet', syncTranscriptFromSheet);

export default router;
