// backend/routes/misctoolRoutes.mjs
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getAllHolidays,
  getHolidayById,
  getRecentHolidays,
  getUpcomingHolidays,
  getAllBirthdays,
  getRecentBirthdays,
  getUpcomingBirthdays,
  previewExcel,
  confirmExcel,
  exportPdf,
  viewVerificationPdf,
} from '../controllers/misctoolcontroller.mjs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.resolve(__dirname, '../media/tmp');

// Multer storage to media/tmp
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TMP_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.xlsx';
    cb(null, `${unique}${ext}`);
  },
});
const fileFilter = (req, file, cb) => {
  const ok = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  if (ok.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only Excel files are allowed'));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Holidays
router.get('/holidays', getAllHolidays);
router.get('/holidays/:hdid', getHolidayById);
router.get('/holidays/recent', getRecentHolidays);
router.get('/holidays/upcoming', getUpcomingHolidays);

// Birthdays
router.get('/birthdays', getAllBirthdays);
router.get('/birthdays/recent', getRecentBirthdays);
router.get('/birthdays/upcoming', getUpcomingBirthdays);

// Excel preview and confirm
router.post('/misc/upload-excel/preview', upload.single('file'), previewExcel);
router.post('/misc/upload-excel/confirm', confirmExcel);

// PDF generation (precise mm layout). Accepts body with widthMm, heightMm, elements[]
router.post('/misc/export/pdf', exportPdf);

// Secure PDF viewing by verification id (does not expose physical path)
router.get('/files/verification/:id', viewVerificationPdf);

export default router;
