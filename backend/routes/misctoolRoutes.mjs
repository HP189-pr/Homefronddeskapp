// backend/routes/misctoolRoutes.mjs
import express from 'express';
import {
  getAllHolidays,
  getHolidayById,
  getRecentHolidays,
  getUpcomingHolidays,
  getAllBirthdays,
  getRecentBirthdays,
  getUpcomingBirthdays,
} from '../controllers/misctoolcontroller.mjs';

const router = express.Router();

// Holidays
router.get('/holidays', getAllHolidays);
router.get('/holidays/:hdid', getHolidayById);
router.get('/holidays/recent', getRecentHolidays);
router.get('/holidays/upcoming', getUpcomingHolidays);

// Birthdays
router.get('/birthdays', getAllBirthdays);
router.get('/birthdays/recent', getRecentBirthdays);
router.get('/birthdays/upcoming', getUpcomingBirthdays);

export default router;
