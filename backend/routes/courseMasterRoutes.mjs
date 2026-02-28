import express from 'express';
import * as ctrl from '../controllers/courseMasterController.mjs';

const router = express.Router();

// Main Branch
router.get(['/mainbranch', '/mainbranch/'], ctrl.listMainBranches);
router.post(['/mainbranch', '/mainbranch/'], ctrl.createMainBranch);

// Sub Branch
router.get(['/subbranch', '/subbranch/'], ctrl.listSubBranches);
router.post(['/subbranch', '/subbranch/'], ctrl.createSubBranch);

// Institute Course Offerings
router.get(['/institute-course-offerings', '/institute-course-offerings/'], ctrl.listInstituteCourseOfferings);
router.post(['/institute-course-offerings', '/institute-course-offerings/'], ctrl.createInstituteCourseOffering);

export default router;