import express from 'express';
import { requireAuth } from '../middleware/auth.mjs';
import requireAdmin from '../middleware/requireAdmin.mjs';
import * as leaveCtrl from '../controllers/leaveController.mjs';

const router = express.Router();

// Public (authenticated) endpoints used by employee leave page
router.get(['/leavetype', '/leavetype/'], requireAuth, leaveCtrl.listTypes);
router.get(['/empprofile', '/empprofile/'], requireAuth, leaveCtrl.listProfiles);
router.get(['/leaveentry', '/leaveentry/'], requireAuth, leaveCtrl.listEntries);
router.post(['/leaveentry', '/leaveentry/'], requireAuth, leaveCtrl.createEntry);
router.get(['/my-leave-balance', '/my-leave-balance/'], requireAuth, leaveCtrl.myBalance);
router.get(['/leave-allocations', '/leave-allocations/'], requireAuth, leaveCtrl.listAllocations);

// Admin management endpoints
router.post(['/leavetype', '/leavetype/'], requireAdmin, leaveCtrl.createType);
router.get(['/leave-periods', '/leave-periods/'], requireAdmin, leaveCtrl.listPeriods);
router.post(['/leave-periods', '/leave-periods/'], requireAdmin, leaveCtrl.savePeriod);
router.put(['/leave-periods/:id', '/leave-periods/:id/'], requireAdmin, leaveCtrl.savePeriod);
router.post(['/empprofile', '/empprofile/'], requireAdmin, leaveCtrl.upsertProfile);
router.put(['/empprofile/:id', '/empprofile/:id/'], requireAdmin, leaveCtrl.upsertProfile);
router.post(['/leave-allocations', '/leave-allocations/'], requireAdmin, leaveCtrl.saveAllocation);
router.put(['/leave-allocations/:id', '/leave-allocations/:id/'], requireAdmin, leaveCtrl.saveAllocation);

export default router;
