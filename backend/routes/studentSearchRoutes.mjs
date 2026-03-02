import express from 'express';
import { searchStudentHandler } from '../controllers/studentSearchController.mjs';

const router = express.Router();

router.get('/search', searchStudentHandler);
router.get('/search/', searchStudentHandler);

export default router;
