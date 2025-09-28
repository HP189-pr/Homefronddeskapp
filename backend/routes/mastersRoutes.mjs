// backend/routes/mastersRoutes.mjs
import express from 'express';
import { Institute } from '../models/institute.mjs';
import { CourseMain } from '../models/course_main.mjs';
import { CourseSub } from '../models/course_sub.mjs';

const router = express.Router();

// List institutes
router.get('/institutes', async (req, res, next) => {
  try {
    const rows = await Institute.findAll({ order: [['institute_id', 'ASC']] });
    res.json(rows);
  } catch (e) { next(e); }
});

// List main courses
router.get('/course_main', async (req, res, next) => {
  try {
    const rows = await CourseMain.findAll({ order: [['maincourse_id', 'ASC']] });
    res.json(rows);
  } catch (e) { next(e); }
});

// List sub courses
router.get('/course_sub', async (req, res, next) => {
  try {
    const rows = await CourseSub.findAll({ order: [['subcourse_id', 'ASC']] });
    res.json(rows);
  } catch (e) { next(e); }
});

export default router;
