// backend/controllers/misctoolController.mjs
import { Holiday, Birthday } from '../models/misctool.mjs';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import mime from 'mime-types';
import models, { sequelize } from '../models/index.mjs';
import Verification from '../models/verification.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MEDIA_ROOT = path.resolve(__dirname, '../media');
const TMP_DIR = path.join(MEDIA_ROOT, 'tmp');
const LOGS_DIR = path.join(MEDIA_ROOT, 'logs');

// Ensure media subfolders exist
for (const dir of [MEDIA_ROOT, TMP_DIR, LOGS_DIR]) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
}

const mmToPt = (mm) => (mm * 72) / 25.4; // 1 inch = 25.4mm, 1 inch = 72pt

const pickModel = (table) => {
  if (!table) return null;
  // Prefer sequelize's registry
  const mdl = sequelize?.models?.[table] || models?.[table];
  return mdl || null;
};

const getModelColumns = (mdl) => {
  const attrs = mdl.rawAttributes || {};
  // Exclude auto PKs and timestamps if present
  const cols = Object.entries(attrs)
    .filter(([name, def]) => !(def.primaryKey === true) && name !== 'createdAt' && name !== 'updatedAt' && name !== 'createdat' && name !== 'updatedat')
    .map(([name, def]) => ({
      name,
      allowNull: !!def.allowNull,
      type: (def.type && def.type.key) || (def.type && def.type.constructor && def.type.constructor.name) || 'UNKNOWN',
      defaultValue: def.defaultValue,
    }));
  return cols;
};

const normalizeHeader = (h) => String(h || '').trim().toLowerCase().replace(/\s+|_/g, '');

const mapHeaders = (headers, modelCols) => {
  const modelMap = new Map(modelCols.map((c) => [normalizeHeader(c.name), c.name]));
  const headerToField = new Map();
  const missing = [];
  const extra = [];

  headers.forEach((h) => {
    const key = normalizeHeader(h);
    const field = modelMap.get(key);
    if (field) headerToField.set(h, field);
    else extra.push(h);
  });

  // Required columns present?
  modelCols.forEach((c) => {
    if (!c.allowNull && c.defaultValue === undefined) {
      const present = Array.from(headerToField.values()).includes(c.name);
      if (!present) missing.push(c.name);
    }
  });

  return { headerToField, missing, extra };
};

const coerceValue = (val, typeKey) => {
  if (val === null || val === undefined || val === '') return null;
  const t = String(typeKey || '').toUpperCase();
  if (t.includes('INTEGER') || t === 'INTEGER' || t === 'BIGINT' || t === 'SMALLINT') {
    const n = parseInt(val, 10);
    return Number.isNaN(n) ? null : n;
  }
  if (t === 'FLOAT' || t === 'DOUBLE' || t === 'DECIMAL' || t.includes('REAL')) {
    const n = parseFloat(val);
    return Number.isNaN(n) ? null : n;
  }
  if (t === 'BOOLEAN') {
    if (typeof val === 'boolean') return val;
    const s = String(val).trim().toLowerCase();
    return ['1', 'true', 'yes', 'y'].includes(s) ? true : ['0', 'false', 'no', 'n'].includes(s) ? false : null;
  }
  if (t === 'DATE' || t === 'DATEONLY') {
    if (val instanceof Date && !isNaN(val)) return val;
    const d = new Date(val);
    return isNaN(d) ? null : d;
  }
  // default string
  return String(val);
};

export const previewExcel = async (req, res) => {
  try {
    const { table } = req.body; // e.g., 'Verification' (Sequelize model name)
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const tempFileId = path.parse(req.file.filename).name; // uuid without extension

    const mdl = pickModel(table);
    if (!mdl) return res.status(400).json({ error: `Unknown table/model: ${table}` });
    const columns = getModelColumns(mdl);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const sheet = workbook.worksheets[0];
    if (!sheet) return res.status(400).json({ error: 'No sheets found in Excel' });

    const headerRow = sheet.getRow(1);
    const headers = headerRow.values.filter((v) => v !== null && v !== undefined && v !== '' && v !== 0).map((v) => (typeof v === 'object' && v.text ? v.text : v));
    const { headerToField, missing, extra } = mapHeaders(headers, columns);

    // Build sample rows (up to 20)
    const maxPreview = 20;
    const preview = [];
    for (let r = 2; r <= sheet.rowCount && preview.length < maxPreview; r++) {
      const row = sheet.getRow(r);
      if (!row || row.cellCount === 0) continue;
      const obj = {};
      headers.forEach((h, idx) => {
        const field = headerToField.get(h);
        if (field) obj[field] = row.getCell(idx + 1).value; // excel cells are 1-based
      });
      if (Object.keys(obj).length) preview.push(obj);
    }

    return res.json({
      tempFileId,
      table,
      headers,
      mappedColumns: Array.from(headerToField.values()),
      missingColumns: missing,
      extraColumns: extra,
      previewRows: preview,
      totalRows: sheet.rowCount - 1,
    });
  } catch (err) {
    console.error('❌ previewExcel error:', err);
    return res.status(500).json({ error: 'Failed to parse Excel' });
  }
};

export const confirmExcel = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { tempFileId, table } = req.body;
    if (!tempFileId || !table) {
      await t.rollback();
      return res.status(400).json({ error: 'tempFileId and table are required' });
    }
    const mdl = pickModel(table);
    if (!mdl) {
      await t.rollback();
      return res.status(400).json({ error: `Unknown table/model: ${table}` });
    }
    const columns = getModelColumns(mdl);
    const headerNames = columns.map((c) => c.name);

    // Find the uploaded temp file by known pattern
    const candidates = fs.readdirSync(TMP_DIR).filter((f) => f.startsWith(tempFileId + '.'));
    if (!candidates.length) {
      await t.rollback();
      return res.status(404).json({ error: 'Temporary file not found or expired' });
    }
    const tmpPath = path.join(TMP_DIR, candidates[0]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(tmpPath);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      await t.rollback();
      return res.status(400).json({ error: 'No sheets found in Excel' });
    }

    const headerRow = sheet.getRow(1);
    const headers = headerRow.values.filter((v) => v !== null && v !== undefined && v !== '' && v !== 0).map((v) => (typeof v === 'object' && v.text ? v.text : v));
    const { headerToField, missing } = mapHeaders(headers, columns);
    if (missing.length) {
      await t.rollback();
      return res.status(400).json({ error: 'Missing required columns', missing });
    }

    const successes = [];
    const failures = [];

    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      if (!row || row.cellCount === 0) continue;
      const obj = {};
      headers.forEach((h, idx) => {
        const field = headerToField.get(h);
        if (field) obj[field] = row.getCell(idx + 1).value;
      });
      // Coerce types
      for (const col of columns) {
        if (Object.prototype.hasOwnProperty.call(obj, col.name)) {
          obj[col.name] = coerceValue(obj[col.name], col.type);
        }
      }
      // Basic required validation
      const missingRequired = columns.filter((c) => !c.allowNull && c.defaultValue === undefined && (obj[c.name] === null || obj[c.name] === undefined || obj[c.name] === ''));
      if (missingRequired.length) {
        failures.push({ row: r, reason: `Missing required: ${missingRequired.map((c) => c.name).join(', ')}`, data: obj });
        continue;
      }
      try {
        const created = await mdl.create(obj, { transaction: t });
        successes.push({ row: r, id: created?.id || null, data: obj });
      } catch (e) {
        failures.push({ row: r, reason: e.message, data: obj });
      }
    }

    await t.commit();

    // Create log workbook
    const logWb = new ExcelJS.Workbook();
    const okWs = logWb.addWorksheet('Success');
    const failWs = logWb.addWorksheet('Failed');
    okWs.addRow(['Row', 'ID', ...headerNames]);
    successes.forEach((s) => okWs.addRow([s.row, s.id, ...headerNames.map((h) => s.data[h] ?? '')]));
    failWs.addRow(['Row', 'Reason', ...headerNames]);
    failures.forEach((f) => failWs.addRow([f.row, f.reason, ...headerNames.map((h) => f.data[h] ?? '')]));

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = `${table}-${stamp}-${tempFileId}.xlsx`;
    const logPath = path.join(LOGS_DIR, logFile);
    await logWb.xlsx.writeFile(logPath);

    // Attempt to remove temp file (best-effort)
    try { fs.unlinkSync(tmpPath); } catch (_) {}

    const logUrl = `/media/logs/${encodeURIComponent(logFile)}`;
    return res.json({
      table,
      inserted: successes.length,
      failed: failures.length,
      total: successes.length + failures.length,
      logUrl,
    });
  } catch (err) {
    try { await t.rollback(); } catch (_) {}
    console.error('❌ confirmExcel error:', err);
    return res.status(500).json({ error: 'Failed to import Excel' });
  }
};

export const exportPdf = async (req, res) => {
  try {
    const { widthMm = 210, heightMm = 297, elements = [], filename = 'document.pdf', inline = false } = req.body || {};
    const size = [mmToPt(widthMm), mmToPt(heightMm)];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${filename}"`);
    const doc = new PDFDocument({ size, margin: 0 });
    doc.pipe(res);

    // Draw elements: { type: 'text', xMm, yMm, text, fontSize }
    for (const el of elements) {
      const type = el.type || 'text';
      if (type === 'text') {
        const x = mmToPt(el.xMm || 0);
        const y = mmToPt(el.yMm || 0);
        const fontSize = el.fontSize || 10;
        doc.fontSize(fontSize).text(String(el.text ?? ''), x, y);
      }
      // Extend for lines/rects/images as needed
    }

    doc.end();
  } catch (err) {
    console.error('❌ exportPdf error:', err);
    return res.status(500).json({ error: 'PDF generation failed' });
  }
};

export const viewVerificationPdf = async (req, res) => {
  try {
    const { id } = req.params;
    // basic auth guard: require logged-in user
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const record = await Verification.findByPk(id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    if (!record.doc_scan_copy) return res.status(404).json({ error: 'No PDF linked' });

    // Ensure path stays under MEDIA_ROOT
    const safeRel = record.doc_scan_copy.replace(/^\/+/, '');
    const abs = path.resolve(MEDIA_ROOT, safeRel);
    if (!abs.startsWith(MEDIA_ROOT)) return res.status(400).json({ error: 'Invalid file path' });
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'File not found' });

    const mimeType = mime.lookup(abs) || 'application/pdf';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
    const stream = fs.createReadStream(abs);
    stream.pipe(res);
  } catch (err) {
    console.error('❌ viewVerificationPdf error:', err);
    return res.status(500).json({ error: 'Failed to stream PDF' });
  }
};

/**
 * Holidays
 */
export const getAllHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.findAll();
    res.json(holidays);
  } catch (err) {
    console.error('❌ getAllHolidays error:', err);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
};

export const getHolidayById = async (req, res) => {
  try {
    const { hdid } = req.params;
    const holiday = await Holiday.findByPk(hdid);
    if (!holiday) return res.status(404).json({ error: 'Holiday not found' });
    res.json(holiday);
  } catch (err) {
    console.error('❌ getHolidayById error:', err);
    res.status(500).json({ error: 'Failed to fetch holiday' });
  }
};

export const getRecentHolidays = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const holidays = await Holiday.findAll({
      where: { holiday_date: { [Op.lte]: today } },
      order: [['holiday_date', 'DESC']],
    });
    res.json(holidays);
  } catch (err) {
    console.error('❌ getRecentHolidays error:', err);
    res.status(500).json({ error: 'Failed to fetch recent holidays' });
  }
};

export const getUpcomingHolidays = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const holidays = await Holiday.findAll({
      where: { holiday_date: { [Op.gte]: today } },
      order: [['holiday_date', 'ASC']],
    });
    res.json(holidays);
  } catch (err) {
    console.error('❌ getUpcomingHolidays error:', err);
    res.status(500).json({ error: 'Failed to fetch upcoming holidays' });
  }
};

/**
 * Birthdays
 */
export const getAllBirthdays = async (req, res) => {
  try {
    const birthdays = await Birthday.findAll();
    res.json(birthdays);
  } catch (err) {
    console.error('❌ getAllBirthdays error:', err);
    res.status(500).json({ error: 'Failed to fetch birthdays' });
  }
};

export const getRecentBirthdays = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 15);

    const birthdays = await Birthday.findAll({
      where: { birth_date: { [Op.between]: [pastDate, today] } },
      order: [['birth_date', 'DESC']],
    });

    res.json(birthdays);
  } catch (err) {
    console.error('❌ getRecentBirthdays error:', err);
    res.status(500).json({ error: 'Failed to fetch recent birthdays' });
  }
};

export const getUpcomingBirthdays = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setMonth(today.getMonth() + 2);

    const birthdays = await Birthday.findAll({
      where: { birth_date: { [Op.between]: [today, futureDate] } },
      order: [['birth_date', 'ASC']],
    });

    res.json(birthdays);
  } catch (err) {
    console.error('❌ getUpcomingBirthdays error:', err);
    res.status(500).json({ error: 'Failed to fetch upcoming birthdays' });
  }
};
