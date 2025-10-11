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
import { logAction } from '../utils/logAction.mjs';
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

// In-memory progress tracker keyed by tempFileId
// Shape: { [tempFileId]: { table, sheetName, total, processed, startedAt, done, error?, logUrl?, inserted?, failed?, cancelRequested?, canceled? } }
const UPLOAD_PROGRESS = Object.create(null);

const pickModel = (table) => {
  if (!table) return null;
  // Prefer sequelize's registry
  const mdl = sequelize?.models?.[table] || models?.[table];
  return mdl || null;
};

const getModelColumns = (mdl) => {
  const attrs = mdl.rawAttributes || {};
  // Include primary keys too (useful for update-by-id), but exclude timestamps
  const cols = Object.entries(attrs)
    .filter(([name]) => name !== 'createdAt' && name !== 'updatedAt' && name !== 'createdat' && name !== 'updatedat')
    .map(([name, def]) => ({
      name,
      allowNull: !!def.allowNull,
      type: (def.type && def.type.key) || (def.type && def.type.constructor && def.type.constructor.name) || 'UNKNOWN',
      defaultValue: def.defaultValue,
      primaryKey: !!def.primaryKey,
      autoIncrement: !!def.autoIncrement,
    }));
  return cols;
};

// Normalize a header string to a canonical key: lowercase alphanumeric only
const normalizeHeader = (h) => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

// Tokens that should be treated as null for string inputs (after trimming)
const NULLISH_TOKENS = new Set(['null', 'nil', 'na', 'n/a', '-', '--', 'none']);

// Aliases to make loose header matching friendlier (normalized keys -> model column)
const HEADER_ALIASES = {
  Degree: new Map([
    ['studentname', 'student_name_dg'],
    ['student_namedg', 'student_name_dg'],
    ['student name dg', 'student_name_dg'],
    ['institute', 'institute_name_dg'],
    ['institutename', 'institute_name_dg'],
    ['institutename_dg', 'institute_name_dg'],
    ['institute name dg', 'institute_name_dg'],
    ['college', 'institute_name_dg'],
    ['college name', 'institute_name_dg'],
    ['collegename', 'institute_name_dg'],
    ['address', 'dg_address'],
    ['gender', 'dg_gender'],
    ['class', 'class_obtain'],
    ['classobtained', 'class_obtain'],
    ['class_obt', 'class_obtain'],
    ['classobt', 'class_obtain'],
    ['grade', 'class_obtain'],
    ['language', 'course_language'],
    ['course_la', 'course_language'],
    ['languageofinstruction', 'course_language'],
    ['seatno', 'seat_last_exam'],
    ['seat number', 'seat_last_exam'],
    ['seatnumber', 'seat_last_exam'],
    ['rollno', 'seat_last_exam'],
    ['seat', 'seat_last_exam'],
    ['examyear', 'last_exam_year'],
    ['year', 'last_exam_year'],
    ['exam_year', 'last_exam_year'],
    ['passingyear', 'last_exam_year'],
    ['exammonth', 'last_exam_month'],
    ['month', 'last_exam_month'],
    ['exam_month', 'last_exam_month'],
    ['dgrecno', 'dg_rec_no'],
    ['recordno', 'dg_rec_no'],
    ['convocation', 'convocation_no'],
    ['convo', 'convocation_no'],
    ['convono', 'convocation_no'],
    ['convocation no', 'convocation_no'],
    ['dg_sr_no', 'dg_sr_no'],
    ['dg sr no', 'dg_sr_no'],
    ['dgsrno', 'dg_sr_no'],
    ['srno', 'dg_sr_no'],
    ['serialno', 'dg_sr_no'],
    ['degree', 'degree_name'],
    ['course', 'degree_name'],
    ['coursename', 'degree_name'],
    ['specialization', 'specialisation'],
    ['specialisation', 'specialisation'],
    ['specialise', 'specialisation'],
    ['branch', 'specialisation'],
    ['enrollment', 'enrollment_no'],
    ['enrollmentno', 'enrollment_no'],
    ['enrolment', 'enrollment_no'],
    ['enrolmentno', 'enrollment_no'],
  ].map(([k, v]) => [normalizeHeader(k), v])),
  Enrollment: new Map([
    ['id', 'id'],
    ['enrollment', 'enrollment_no'],
    ['enrollmentno', 'enrollment_no'],
    ['enrolment', 'enrollment_no'],
    ['enrolmentno', 'enrollment_no'],
    ['enroll_no', 'enrollment_no'],
    ['enrollno', 'enrollment_no'],
    ['studentname', 'student_name'],
    ['student name', 'student_name'],
    ['institute', 'institute_id'],
    ['institute_id', 'institute_id'],
    ['maincourse', 'maincourse_id'],
    ['maincourseid', 'maincourse_id'],
    ['subcourse', 'subcourse_id'],
    ['subcourseid', 'subcourse_id'],
    ['batchyear', 'batch'],
    ['admission', 'admission_date'],
    ['admissiondate', 'admission_date'],
    ['temp_enroll_no', 'temp_enroll_no'],
    ['tempenroll', 'temp_enroll_no'],
  ].map(([k, v]) => [normalizeHeader(k), v])),
};

// Business-rule required fields per model (override DB allowNull where needed)
const REQUIRED_FIELDS = {
  Degree: ['enrollment_no', 'student_name_dg', 'convocation_no'],
};

const mapHeaders = (headers, modelCols, tableName) => {
  const modelMap = new Map(modelCols.map((c) => [normalizeHeader(c.name), c.name]));
  const aliasMap = HEADER_ALIASES[tableName] || new Map();
  const headerToField = new Map();
  const missing = [];
  const extra = [];

  headers.forEach((h) => {
    const key = normalizeHeader(h);
    let field = modelMap.get(key);
    if (!field) {
      const aliasTo = aliasMap.get(key);
      if (aliasTo) {
        // ensure alias target exists in model
        const target = modelCols.find((c) => c.name === aliasTo);
        if (target) field = target.name;
      }
    }
    // Fuzzy partial match fallback for truncated/variant headers
    if (!field) {
      // find candidates where model name contains key or key contains model name
      const candidates = modelCols
        .map((c) => ({ c, norm: normalizeHeader(c.name) }))
        .filter(({ c, norm }) => !Array.from(headerToField.values()).includes(c.name) && (norm.includes(key) || key.includes(norm)));
      if (candidates.length) {
        // choose the closest by minimal length difference
        candidates.sort((a, b) => Math.abs(a.norm.length - key.length) - Math.abs(b.norm.length - key.length));
        field = candidates[0].c.name;
      }
    }
    if (field) headerToField.set(h, field);
    else extra.push(h);
  });

  // Required columns present?
  modelCols.forEach((c) => {
    // Do not require primary keys from Excel even if allowNull=false
    if (!c.primaryKey && !c.allowNull && c.defaultValue === undefined) {
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
    let d = new Date(val);
    if (isNaN(d) && typeof val === 'string') {
      // Fallback: replace space with 'T' for ISO parsing (e.g., '2025-09-23 20:35:19.437354')
      d = new Date(val.replace(' ', 'T'));
    }
    return isNaN(d) ? null : d;
  }
  // default string
  return String(val);
};

// Normalize ExcelJS cell values to plain JS primitives (string/number/Date/bool/null)
const excelCellToJs = (val) => {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val;
  if (typeof val !== 'object') return val;
  // Common ExcelJS patterns
  if (typeof val.text === 'string') return val.text;
  if (Array.isArray(val.richText)) return val.richText.map((rt) => rt?.text ?? '').join('');
  if (val.result !== undefined && val.result !== null) return excelCellToJs(val.result);
  if (val.hyperlink && typeof val.text === 'string') return val.text;
  // Fallback string
  try { return String(val); } catch (_) { return null; }
};

export const previewExcel = async (req, res) => {
  try {
    const { table, sheetName } = req.body; // e.g., 'Verification' (Sequelize model name)
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const tempFileId = path.parse(req.file.filename).name; // uuid without extension

    const mdl = pickModel(table);
    if (!mdl) return res.status(400).json({ error: `Unknown table/model: ${table}` });
  const columns = getModelColumns(mdl);
  // Database count before any import to show existing records
  let beforeCount = 0;
  try { beforeCount = await mdl.count(); } catch (_) { beforeCount = null; }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
  let sheet = null;
    if (sheetName) {
      sheet = workbook.getWorksheet(String(sheetName));
      if (!sheet) return res.status(400).json({ error: `Sheet '${sheetName}' not found` });
    } else {
      sheet = workbook.worksheets[0];
    }
  if (!sheet) return res.status(400).json({ error: 'No sheets found in Excel' });
  const sheetNames = workbook.worksheets.map((ws) => ws?.name).filter(Boolean);

    const headerRow = sheet.getRow(1);
    const headers = headerRow.values.filter((v) => v !== null && v !== undefined && v !== '' && v !== 0).map((v) => (typeof v === 'object' && v.text ? v.text : v));
    const { headerToField, missing, extra } = mapHeaders(headers, columns, table);
    const mapped = Array.from(headerToField.values());
    if (!mapped.length) {
      return res.status(400).json({
        error: 'No column headers matched model fields. Please check headers and sheet name.',
        expectedColumns: columns.map(c => c.name),
      });
    }

    // Build preview rows: return only a small sample to keep payload light on large files
    const totalRows = Math.max(0, sheet.rowCount - 1);
    const limit = Math.max(1, Math.min(1000, parseInt(req.body?.previewLimit, 10) || 200));
    const offset = Math.max(0, parseInt(req.body?.previewOffset, 10) || 0);
    const startRow = Math.min(sheet.rowCount, 2 + offset);
    const endRow = Math.min(sheet.rowCount, startRow + limit - 1);
    const preview = [];
    for (let r = startRow; r <= endRow; r++) {
      const row = sheet.getRow(r);
      if (!row || row.cellCount === 0) continue;
      const obj = {};
      headers.forEach((h, idx) => {
        const field = headerToField.get(h);
        if (field) obj[field] = excelCellToJs(row.getCell(idx + 1).value); // excel cells are 1-based
      });
      if (Object.keys(obj).length) preview.push(obj);
    }

    // initialize progress stub for this upload id
    UPLOAD_PROGRESS[tempFileId] = {
      table,
      sheetName: sheet?.name,
      total: totalRows,
      processed: 0,
      startedAt: Date.now(),
      done: false,
      cancelRequested: false,
      canceled: false,
      beforeCount,
    };

    const response = {
      tempFileId,
      table,
      headers,
      mappedColumns: mapped,
      missingColumns: missing,
      extraColumns: extra,
      previewRows: preview,
      totalRows,
      previewLimit: limit,
      previewOffset: offset,
      hasMore: offset + preview.length < totalRows,
      nextOffset: Math.min(totalRows, offset + preview.length),
      sheetName: sheet?.name,
      sheetNames,
      beforeCount,
    };
    try { await logAction(req, 'excel.preview', { table, sheet: sheet?.name, totalRows, mapped }); } catch {}
    return res.json(response);
  } catch (err) {
    console.error('❌ previewExcel error:', err);
    return res.status(500).json({ error: 'Failed to parse Excel' });
  }
};

export const confirmExcel = async (req, res) => {
  try {
    const startedAt = Date.now();
  const { tempFileId, table, sheetName, strictDegreeMatch = true, selectedColumns } = req.body;
    if (!tempFileId || !table) {
      return res.status(400).json({ error: 'tempFileId and table are required' });
    }
    const mdl = pickModel(table);
    if (!mdl) {
      return res.status(400).json({ error: `Unknown table/model: ${table}` });
    }
    const columns = getModelColumns(mdl);
    const headerNames = columns.map((c) => c.name);
    // Optional selected columns set to restrict updates/inserts
    let selectedColsSet = null;
    if (Array.isArray(selectedColumns) && selectedColumns.length) {
      selectedColsSet = new Set(selectedColumns.filter((s) => typeof s === 'string'));
    }

    // Find the uploaded temp file by known pattern
    const candidates = fs.readdirSync(TMP_DIR).filter((f) => f.startsWith(tempFileId + '.'));
    if (!candidates.length) {
      return res.status(404).json({ error: 'Temporary file not found or expired' });
    }
    const tmpPath = path.join(TMP_DIR, candidates[0]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(tmpPath);
    let sheet = null;
    if (sheetName) {
      sheet = workbook.getWorksheet(String(sheetName));
      if (!sheet) {
        return res.status(400).json({ error: `Sheet '${sheetName}' not found` });
      }
    } else {
      sheet = workbook.worksheets[0];
    }
    if (!sheet) {
      return res.status(400).json({ error: 'No sheets found in Excel' });
    }

    const headerRow = sheet.getRow(1);
    const headers = headerRow.values.filter((v) => v !== null && v !== undefined && v !== '' && v !== 0).map((v) => (typeof v === 'object' && v.text ? v.text : v));
    const { headerToField, missing } = mapHeaders(headers, columns, table);
    const mapped = Array.from(headerToField.values());
    if (!mapped.length) {
      // mark progress error
      if (tempFileId && UPLOAD_PROGRESS[tempFileId]) {
        UPLOAD_PROGRESS[tempFileId].done = true;
        UPLOAD_PROGRESS[tempFileId].error = 'No column headers matched model fields. Check headers/sheet.';
      }
      return res.status(400).json({ error: 'No column headers matched model fields. Check headers/sheet.' });
    }
    if (missing.length) {
      if (tempFileId && UPLOAD_PROGRESS[tempFileId]) {
        UPLOAD_PROGRESS[tempFileId].done = true;
        UPLOAD_PROGRESS[tempFileId].error = 'Missing required columns';
      }
      return res.status(400).json({ error: 'Missing required columns', missing });
    }

  const successes = [];
    const failures = [];
    let processedRows = 0;
    let insertCount = 0;
    let updateCount = 0;
    // Distinct counters for diagnostics
    const updatedIds = new Set();
    const insertedIds = new Set();
    // Degree duplicates tracker by (normalized enrollment_no + '|' + normalized convocation_no)
    const degreeKeyCounts = new Map();
    // Referential integrity: For Degree, prefetch valid enrollment_no values from Enrollment table
    let enrollmentExistsSet = null;
    // Map of normalized enrollment_no (lower/trim/no spaces) -> canonical DB enrollment_no
    let enrollmentCanonicalMap = null;
    if (table === 'Degree') {
      try {
        const enrollmentHeaderIdx = headers.findIndex((h) => headerToField.get(h) === 'enrollment_no');
        if (enrollmentHeaderIdx >= 0) {
          const idx1 = enrollmentHeaderIdx + 1; // Excel is 1-based
          const uniqueEnrolls = new Set();
          for (let r = 2; r <= sheet.rowCount; r++) {
            const row = sheet.getRow(r);
            if (!row || row.cellCount === 0) continue;
            const raw = excelCellToJs(row.getCell(idx1).value);
            if (raw !== null && raw !== undefined) {
              const s = String(raw).trim();
              if (s) uniqueEnrolls.add(s.toLowerCase().replace(/\s+/g, ''));
            }
          }
          const EnrollmentModel = pickModel('Enrollment');
          if (EnrollmentModel && uniqueEnrolls.size) {
            const exist = new Set();
            const canMap = new Map();
            const arr = Array.from(uniqueEnrolls);
            const CHUNK = 5000;
            for (let i = 0; i < arr.length; i += CHUNK) {
              const slice = arr.slice(i, i + CHUNK);
              // Compare case- and space-insensitive: LOWER(REPLACE(TRIM(enrollment_no),' ','')) IN (:slice)
              const found = await EnrollmentModel.findAll({
                where: sequelize.where(
                  sequelize.fn(
                    'LOWER',
                    sequelize.fn('REPLACE', sequelize.fn('TRIM', sequelize.col('enrollment_no')), ' ', '')
                  ),
                  { [Op.in]: slice }
                ),
                attributes: ['enrollment_no'],
              });
              for (const rec of found) {
                const v = (rec?.enrollment_no ?? '').toString().trim().toLowerCase().replace(/\s+/g, '');
                if (v) exist.add(v);
                if (v) canMap.set(v, rec.enrollment_no);
              }
            }
            enrollmentExistsSet = exist;
            enrollmentCanonicalMap = canMap;
          } else {
            enrollmentExistsSet = new Set();
            enrollmentCanonicalMap = new Map();
          }
        }
      } catch (e) {
        // If prefetch fails, default to empty set so rows will fail with clear reason
        enrollmentExistsSet = new Set();
        enrollmentCanonicalMap = new Map();
      }
    }
  // Count records before import
  let beforeCount = 0;
  try { beforeCount = await mdl.count(); } catch (_) { beforeCount = null; }

    // initialize/update progress info
    const totalRows = Math.max(0, sheet.rowCount - 1);
    if (!UPLOAD_PROGRESS[tempFileId]) {
      UPLOAD_PROGRESS[tempFileId] = { table, sheetName: sheet?.name, total: totalRows, processed: 0, startedAt, done: false, cancelRequested: false, canceled: false };
    } else {
      const existing = UPLOAD_PROGRESS[tempFileId];
      UPLOAD_PROGRESS[tempFileId] = {
        ...existing,
        table,
        sheetName: sheet?.name,
        total: totalRows,
        startedAt,
        processed: 0,
        done: false,
        // preserve cancelRequested if user already clicked stop
        cancelRequested: existing.cancelRequested === true,
        canceled: false,
      };
      delete UPLOAD_PROGRESS[tempFileId].error;
      delete UPLOAD_PROGRESS[tempFileId].logUrl;
    }

    let wasCanceled = false;
    const auditFields = new Set(['createdAt','updatedAt','createdat','updatedat']);
    const pkNames = new Set(columns.filter(c => c.primaryKey).map(c => c.name));

    const sanitizePayload = (source) => {
      const dest = {};
      for (const c of columns) {
        const name = c.name;
        if (auditFields.has(name)) continue; // do not import audit fields from Excel
        if (pkNames.has(name)) continue; // skip primary key fields in payload
        if (selectedColsSet && !selectedColsSet.has(name)) continue; // respect user-selected columns
        if (Object.prototype.hasOwnProperty.call(source, name)) {
          dest[name] = source[name];
        }
      }
      return dest;
    };
    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      if (!row || row.cellCount === 0) continue;
      const obj = {};
      headers.forEach((h, idx) => {
        const field = headerToField.get(h);
        if (field) obj[field] = excelCellToJs(row.getCell(idx + 1).value);
      });
      // Coerce types
      for (const col of columns) {
        if (Object.prototype.hasOwnProperty.call(obj, col.name)) {
          obj[col.name] = coerceValue(obj[col.name], col.type);
          // Trim strings and convert empty strings to null
          if (typeof obj[col.name] === 'string') {
            const trimmed = obj[col.name].trim();
            const lower = trimmed.toLowerCase();
            // Treat common placeholders as null
            if (!trimmed.length || NULLISH_TOKENS.has(lower)) obj[col.name] = null;
            else obj[col.name] = trimmed;
          }
        }
      }
      // For Degree: normalize and canonicalize enrollment_no value using DB mapping to satisfy FK equality
      if (table === 'Degree' && obj.enrollment_no != null && obj.enrollment_no !== '' && enrollmentCanonicalMap instanceof Map) {
        const norm = String(obj.enrollment_no).trim().toLowerCase().replace(/\s+/g, '');
        const canonical = enrollmentCanonicalMap.get(norm);
        if (canonical) obj.enrollment_no = canonical;
      }

      // Determine target record first for update vs insert
      let where = null;
      if (table === 'Degree') {
        // Track duplicates per (enrollment_no, convocation_no) key
        const degEnrRaw = obj.enrollment_no ?? '';
        const degEnrNorm = String(degEnrRaw).trim().toLowerCase().replace(/\s+/g, '');
        const degConvoNorm = obj.convocation_no != null ? String(obj.convocation_no).trim().toLowerCase() : '';
        if (degEnrNorm || degConvoNorm) {
          const dkey = `${degEnrNorm}|${degConvoNorm}`;
          degreeKeyCounts.set(dkey, (degreeKeyCounts.get(dkey) || 0) + 1);
        }
        if (obj.id != null && obj.id !== '') {
          where = { id: obj.id };
        } else if (obj.dg_sr_no != null && obj.dg_sr_no !== '') {
          where = { dg_sr_no: obj.dg_sr_no };
        } else if (obj.enrollment_no && obj.convocation_no) {
          const normEnroll = String(obj.enrollment_no).trim().toLowerCase().replace(/\s+/g, '');
          where = {
            [Op.and]: [
              // Case-insensitive match on enrollment_no
              sequelize.where(
                sequelize.fn(
                  'LOWER',
                  sequelize.fn('REPLACE', sequelize.fn('TRIM', sequelize.col('enrollment_no')), ' ', '')
                ),
                normEnroll
              ),
              { convocation_no: obj.convocation_no },
            ],
          };
        } else if (obj.enrollment_no && !strictDegreeMatch) {
          const normEnroll = String(obj.enrollment_no).trim().toLowerCase().replace(/\s+/g, '');
          where = {
            // Case-insensitive match on enrollment_no
            [Op.and]: [
              sequelize.where(
                sequelize.fn(
                  'LOWER',
                  sequelize.fn('REPLACE', sequelize.fn('TRIM', sequelize.col('enrollment_no')), ' ', '')
                ),
                normEnroll
              ),
            ],
          };
        }
      } else if (table === 'Enrollment') {
        if (obj.id != null && obj.id !== '') {
          where = { id: obj.id };
        } else if (obj.enrollment_no) {
          const normEnroll = String(obj.enrollment_no).trim().toLowerCase().replace(/\s+/g, '');
          where = {
            [Op.and]: [
              sequelize.where(
                sequelize.fn(
                  'LOWER',
                  sequelize.fn('REPLACE', sequelize.fn('TRIM', sequelize.col('enrollment_no')), ' ', '')
                ),
                normEnroll
              ),
            ],
          };
        }
      }
      const existing = where ? await mdl.findOne({ where }) : null;
      const isUpdate = !!existing;

      // Only enforce required fields when this will be an insert
      if (!isUpdate) {
        const missingRequired = columns.filter((c) => !c.primaryKey && !c.allowNull && c.defaultValue === undefined && (obj[c.name] === null || obj[c.name] === undefined || obj[c.name] === ''));
        if (missingRequired.length) {
          failures.push({ row: r, reason: `Missing required: ${missingRequired.map((c) => c.name).join(', ')}`, data: obj });
          if (UPLOAD_PROGRESS[tempFileId]) {
            UPLOAD_PROGRESS[tempFileId].failed = (UPLOAD_PROGRESS[tempFileId].failed || 0) + 1;
            UPLOAD_PROGRESS[tempFileId].processed = (UPLOAD_PROGRESS[tempFileId].processed || 0) + 1;
          }
          continue;
        }
        const reqList = REQUIRED_FIELDS[table] || [];
        const missingCustom = reqList.filter((f) => obj[f] === null || obj[f] === undefined || (typeof obj[f] === 'string' && obj[f].trim() === ''));
        if (missingCustom.length) {
          failures.push({ row: r, reason: `Missing required (business rules): ${missingCustom.join(', ')}`, data: obj });
          if (UPLOAD_PROGRESS[tempFileId]) {
            UPLOAD_PROGRESS[tempFileId].failed = (UPLOAD_PROGRESS[tempFileId].failed || 0) + 1;
            UPLOAD_PROGRESS[tempFileId].processed = (UPLOAD_PROGRESS[tempFileId].processed || 0) + 1;
          }
          continue;
        }
        // Cross-table validation for Degree on insert
        if (table === 'Degree' && enrollmentExistsSet instanceof Set) {
    const enrRaw = obj['enrollment_no'];
    const enr = (enrRaw === null || enrRaw === undefined) ? '' : String(enrRaw).trim().toLowerCase().replace(/\s+/g, '');
          if (!enr || !enrollmentExistsSet.has(enr)) {
            failures.push({ row: r, reason: `Enrollment not found for enrollment_no='${String(enrRaw ?? '').trim()}'`, data: obj });
            if (UPLOAD_PROGRESS[tempFileId]) {
              UPLOAD_PROGRESS[tempFileId].failed = (UPLOAD_PROGRESS[tempFileId].failed || 0) + 1;
              UPLOAD_PROGRESS[tempFileId].processed = (UPLOAD_PROGRESS[tempFileId].processed || 0) + 1;
            }
            continue;
          }
        }
      }

      try {
        let op = 'insert';
        let idVal = null;
        if (isUpdate) {
          const payload = sanitizePayload(obj);
          // Do not overwrite existing DB values with nulls on update
          for (const k of Object.keys(payload)) {
            if (payload[k] === null || payload[k] === undefined) delete payload[k];
          }
          const hasUpdatedAt = columns.some(c => c.name === 'updatedAt' || c.name === 'updatedat');
          if (hasUpdatedAt) {
            if (columns.some(c => c.name === 'updatedat')) payload.updatedat = new Date();
            else if (columns.some(c => c.name === 'updatedAt')) payload.updatedAt = new Date();
          }
          await existing.update(payload);
          op = 'update';
          idVal = existing?.id || null;
          if (idVal != null) updatedIds.add(idVal);
        }

        const hasExplicitId = Object.prototype.hasOwnProperty.call(obj, 'id') && obj.id != null && obj.id !== '';
        if (op === 'insert') {
          if (hasExplicitId) {
            const idStr = String(obj.id);
            throw new Error(`No existing record found to update for id=${idStr}. Remove 'id' to insert or provide a valid id.`);
          }
          const payload = sanitizePayload(obj);
          const created = await mdl.create(payload);
          idVal = created?.id || null;
          insertCount++;
          if (idVal != null) insertedIds.add(idVal);
          if (UPLOAD_PROGRESS[tempFileId]) {
            UPLOAD_PROGRESS[tempFileId].inserted = (UPLOAD_PROGRESS[tempFileId].inserted || 0) + 1;
          }
        } else {
          updateCount++;
          if (UPLOAD_PROGRESS[tempFileId]) {
            UPLOAD_PROGRESS[tempFileId].updated = (UPLOAD_PROGRESS[tempFileId].updated || 0) + 1;
          }
        }

        successes.push({ row: r, id: idVal, op, data: obj });
        processedRows++;
      } catch (e) {
        // Provide clearer DB error reasons when possible
        let reason = e?.message || 'Insert failed';
        if (e?.name === 'SequelizeValidationError' && Array.isArray(e?.errors) && e.errors.length) {
          reason = e.errors.map((er) => er.message || `${er.path} ${er.type || 'invalid'}`).join('; ');
        } else if (e?.name === 'SequelizeUniqueConstraintError' && Array.isArray(e?.errors) && e.errors.length) {
          reason = `Unique constraint: ${e.errors.map((er) => er.path).join(', ')}`;
        } else if (e?.original?.detail) {
          reason = e.original.detail;
        } else if (e?.parent?.detail) {
          reason = e.parent.detail;
        }
        failures.push({ row: r, reason, data: obj });
        if (UPLOAD_PROGRESS[tempFileId]) {
          UPLOAD_PROGRESS[tempFileId].failed = failures.length;
        }
      }

      // update progress after each row
      if (UPLOAD_PROGRESS[tempFileId]) {
        UPLOAD_PROGRESS[tempFileId].processed = processedRows + failures.length;
      }

      // Check for cancel request after processing each row
      if (UPLOAD_PROGRESS[tempFileId]?.cancelRequested) {
        wasCanceled = true;
        break;
      }
    }

  // Create log workbook
  // Create log workbook
    const logWb = new ExcelJS.Workbook();
  // Summary sheet with counts
  const summaryWs = logWb.addWorksheet('Summary');
    const okWs = logWb.addWorksheet('Success');
    const failWs = logWb.addWorksheet('Failed');
  // Optional duplicates sheet for Degree
  let dupWs = null;
  if (table === 'Degree') {
    // Build a duplicates sheet listing keys with count > 1
    const dups = Array.from(degreeKeyCounts.entries()).filter(([_, c]) => c > 1);
    if (dups.length) {
      dupWs = logWb.addWorksheet('Duplicates');
      dupWs.addRow(['Key (norm_enroll|norm_convo)', 'Count']);
      for (const [k, c] of dups) dupWs.addRow([k, c]);
    }
  }
  let afterCount = null;
  try { afterCount = await mdl.count(); } catch (_) { afterCount = null; }
  const deltaCount = (afterCount != null && beforeCount != null) ? (afterCount - beforeCount) : null;
  summaryWs.addRow(['Table', table]);
  summaryWs.addRow(['Sheet', sheet?.name || '']);
  summaryWs.addRow(['Before Count', beforeCount != null ? beforeCount : 'N/A']);
  summaryWs.addRow(['Inserted (rows)', insertCount]);
  summaryWs.addRow(['Updated (rows)', updateCount]);
  summaryWs.addRow(['Failed (rows)', failures.length]);
  summaryWs.addRow(['Distinct Updated IDs', updatedIds.size]);
  summaryWs.addRow(['Distinct Inserted IDs', insertedIds.size]);
  summaryWs.addRow(['After Count', afterCount != null ? afterCount : 'N/A']);
  summaryWs.addRow(['Delta (After - Before)', deltaCount != null ? deltaCount : 'N/A']);
  const logCols = selectedColsSet ? Array.from(selectedColsSet) : headerNames;
  okWs.addRow(['Row', 'ID', 'Op', ...logCols]);
  successes.forEach((s) => okWs.addRow([s.row, s.id, s.op || 'insert', ...logCols.map((h) => s.data[h] ?? '')]));
  failWs.addRow(['Row', 'Reason', ...logCols]);
  failures.forEach((f) => failWs.addRow([f.row, f.reason, ...logCols.map((h) => f.data[h] ?? '')]));

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = `${table}-${stamp}-${tempFileId}.xlsx`;
    const logPath = path.join(LOGS_DIR, logFile);
    await logWb.xlsx.writeFile(logPath);

    // Attempt to remove temp file (best-effort)
    try { fs.unlinkSync(tmpPath); } catch (_) {}

    const logUrl = `/media/logs/${encodeURIComponent(logFile)}`;

    // mark progress done
    if (UPLOAD_PROGRESS[tempFileId]) {
      UPLOAD_PROGRESS[tempFileId].done = true;
      UPLOAD_PROGRESS[tempFileId].logUrl = logUrl;
      UPLOAD_PROGRESS[tempFileId].inserted = insertCount;
      UPLOAD_PROGRESS[tempFileId].updated = updateCount;
      UPLOAD_PROGRESS[tempFileId].failed = failures.length;
      UPLOAD_PROGRESS[tempFileId].canceled = wasCanceled;
      UPLOAD_PROGRESS[tempFileId].beforeCount = beforeCount;
      UPLOAD_PROGRESS[tempFileId].afterCount = afterCount;
      UPLOAD_PROGRESS[tempFileId].deltaCount = deltaCount;
    }

    const payload = {
      table,
      inserted: insertCount,
      updated: updateCount,
      failed: failures.length,
      total: successes.length + failures.length,
      logUrl,
      sheetName: sheet?.name,
      sampleFailures: failures.slice(0, 15),
      durationMs: Date.now() - startedAt,
      processedRows,
      canceled: wasCanceled,
      beforeCount,
      afterCount,
      deltaCount,
    };
    try { await logAction(req, 'excel.confirm', { table, sheet: sheet?.name, inserted: insertCount, updated: updateCount, failed: failures.length, logUrl }); } catch {}
    return res.json(payload);
  } catch (err) {
    console.error('❌ confirmExcel error:', err);
    // mark error on progress if exists
    const { tempFileId } = req.body || {};
    if (tempFileId && UPLOAD_PROGRESS[tempFileId]) {
      UPLOAD_PROGRESS[tempFileId].done = true;
      UPLOAD_PROGRESS[tempFileId].error = 'Failed to import Excel';
    }
    return res.status(500).json({ error: 'Failed to import Excel' });
  }
};

// Simple polling endpoint for front-end to show live progress
export const getUploadProgress = async (req, res) => {
  try {
    const { id } = req.params; // tempFileId
    const p = id ? UPLOAD_PROGRESS[id] : null;
    if (!p) return res.json({ found: false });
    const total = Math.max(0, p.total || 0);
    const processed = Math.max(0, p.processed || 0);
    const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : (p.done ? 100 : 0);
    return res.json({
      found: true,
      table: p.table || null,
      sheetName: p.sheetName || null,
      total,
      processed,
      percent,
      startedAt: p.startedAt || null,
      done: !!p.done,
      error: p.error || null,
      logUrl: p.logUrl || null,
      inserted: p.inserted ?? null,
  updated: p.updated ?? null,
      failed: p.failed ?? null,
      cancelRequested: !!p.cancelRequested,
      canceled: !!p.canceled,
      beforeCount: p.beforeCount ?? null,
      afterCount: p.afterCount ?? null,
      deltaCount: p.deltaCount ?? null,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get progress' });
  }
};

// Allow client to request cancelation of an in-progress upload
export const cancelUpload = async (req, res) => {
  try {
    const { id } = req.params; // tempFileId
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const p = UPLOAD_PROGRESS[id];
    if (!p) return res.status(404).json({ error: 'Upload not found' });
    if (p.done) return res.json({ ok: true, alreadyDone: true });
    p.cancelRequested = true;
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to cancel' });
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
    try { await logAction(req, 'pdf.export', { filename, page: { widthMm, heightMm }, elementsCount: Array.isArray(elements) ? elements.length : 0 }); } catch {}
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
    try { await logAction(req, 'pdf.view', { verificationId: id, path: safeRel }); } catch {}
  } catch (err) {
    console.error('❌ viewVerificationPdf error:', err);
    return res.status(500).json({ error: 'Failed to stream PDF' });
  }
};

export const sampleExcel = async (req, res) => {
  try {
    const { table, sheet = 'Sheet1' } = req.query || {};
    const mdl = pickModel(table);
    if (!mdl) return res.status(400).json({ error: `Unknown table/model: ${table}` });
    const columns = getModelColumns(mdl);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(String(sheet || 'Sheet1'));
    const headers = columns.map((c) => c.name);
    ws.addRow(headers);
    // Style header row lightly
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Disposition', `attachment; filename="${table}-sample.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
    try { await logAction(req, 'excel.sample', { table, sheet }); } catch {}
  } catch (err) {
    console.error('❌ sampleExcel error:', err);
    return res.status(500).json({ error: 'Failed to generate sample Excel' });
  }
};

// Enrollment duplicate by enrollment_no and mismatch with masters
export const checkEnrollmentDuplicates = async (req, res) => {
  try {
    const EnrollmentModel = pickModel('Enrollment');
    if (!EnrollmentModel) return res.status(400).json({ error: 'Enrollment model not found' });
    const normalized = String(req.query.normalized ?? 'true').toLowerCase() !== 'false';
    const format = String(req.query.format || 'xlsx').toLowerCase();

    const normExpr = normalized
      ? sequelize.fn('LOWER', sequelize.fn('REPLACE', sequelize.fn('TRIM', sequelize.col('enrollment_no')), ' ', ''))
      : sequelize.col('enrollment_no');

    const dupGroups = await EnrollmentModel.findAll({
      where: { enrollment_no: { [Op.ne]: null } },
      attributes: [[normExpr, 'dup_key'], [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
      group: [normExpr],
      having: sequelize.literal('COUNT(id) > 1'),
      raw: true,
    });

    const keys = dupGroups.map((g) => g.dup_key).filter(Boolean);
    const details = keys.length
      ? await EnrollmentModel.findAll({
          where: sequelize.where(normExpr, { [Op.in]: keys }),
          attributes: ['id', 'enrollment_no', 'student_name', 'institute_id', 'maincourse_id', 'subcourse_id', 'batch', 'createdat', 'updatedat'],
          order: [['enrollment_no', 'ASC']],
          raw: true,
        })
      : [];

    if (format === 'json') {
      try { await logAction(req, 'analysis.enrollment.duplicates', { normalized, keys: dupGroups.length }); } catch {}
      return res.json({ duplicates: dupGroups.length, groups: dupGroups, details, normalized });
    }

    const wb = new ExcelJS.Workbook();
    const summary = wb.addWorksheet('Summary');
    const groupsWs = wb.addWorksheet('Duplicate Keys');
    const detailsWs = wb.addWorksheet('Details');
    summary.addRow(['Normalized compare', normalized ? 'Yes' : 'No']);
    summary.addRow(['Duplicate keys', dupGroups.length]);
    groupsWs.addRow(['dup_key', 'count']);
    dupGroups.forEach((g) => groupsWs.addRow([g.dup_key, Number(g.cnt)]));
    detailsWs.addRow(['dup_key', 'id', 'enrollment_no', 'student_name', 'institute_id', 'maincourse_id', 'subcourse_id', 'batch', 'createdat', 'updatedat']);
    const dupKeyOf = (enr) => (normalized ? (enr || '').toString().trim().toLowerCase().replace(/\s+/g, '') : (enr || '').toString());
    details.forEach((d) => detailsWs.addRow([dupKeyOf(d.enrollment_no), d.id, d.enrollment_no, d.student_name, d.institute_id, d.maincourse_id, d.subcourse_id, d.batch || '', d.createdat || '', d.updatedat || '']));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Disposition', 'attachment; filename="Enrollment-duplicate.xlsx"');
  try { await logAction(req, 'analysis.enrollment.duplicates', { normalized, keys: dupGroups.length }); } catch {}
  await wb.xlsx.write(res);
  res.end();
  return undefined;
  } catch (err) {
    console.error('❌ checkEnrollmentDuplicates error:', err);
    return res.status(500).json({ error: 'Failed to compute enrollment duplicates' });
  }
};

export const checkEnrollmentMismatch = async (req, res) => {
  try {
    const EnrollmentModel = pickModel('Enrollment');
    if (!EnrollmentModel) return res.status(400).json({ error: 'Enrollment model not found' });
    const format = String(req.query.format || 'xlsx').toLowerCase();

    // Build sets of valid IDs from masters
    const instIds = new Set((await pickModel('Institute')?.findAll({ attributes: ['id'], raw: true }) || []).map((r) => r.id));
    const mainIds = new Set((await pickModel('Module')?.findAll({ attributes: ['id'], raw: true }) || []).map((r) => r.id));
    const subIds = new Set((await pickModel('Path')?.findAll({ attributes: ['id'], raw: true }) || []).map((r) => r.id));

    const rows = await EnrollmentModel.findAll({
      attributes: ['id', 'enrollment_no', 'student_name', 'institute_id', 'maincourse_id', 'subcourse_id', 'batch', 'createdat', 'updatedat'],
      raw: true,
    });
    const mismatches = [];
    for (const r of rows) {
      const probs = [];
      if (r.institute_id == null || !instIds.has(Number(r.institute_id))) probs.push('institute_id invalid');
      if (r.maincourse_id == null || !mainIds.has(Number(r.maincourse_id))) probs.push('maincourse_id invalid');
      if (r.subcourse_id == null || !subIds.has(Number(r.subcourse_id))) probs.push('subcourse_id invalid');
      if (probs.length) mismatches.push({ ...r, issues: probs.join('; ') });
    }

    if (format === 'json') {
      try { await logAction(req, 'analysis.enrollment.mismatch', { count: mismatches.length }); } catch {}
      return res.json({ count: mismatches.length, details: mismatches });
    }

    const wb = new ExcelJS.Workbook();
    const summary = wb.addWorksheet('Summary');
    const detailsWs = wb.addWorksheet('Mismatches');
    summary.addRow(['Mismatched rows', mismatches.length]);
    detailsWs.addRow(['id', 'enrollment_no', 'student_name', 'institute_id', 'maincourse_id', 'subcourse_id', 'issues', 'batch', 'createdat', 'updatedat']);
    mismatches.forEach((d) => detailsWs.addRow([d.id, d.enrollment_no, d.student_name, d.institute_id, d.maincourse_id, d.subcourse_id, d.issues, d.batch || '', d.createdat || '', d.updatedat || '']));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Disposition', 'attachment; filename="Enrollment-mismatch.xlsx"');
  try { await logAction(req, 'analysis.enrollment.mismatch', { count: mismatches.length }); } catch {}
  await wb.xlsx.write(res);
  res.end();
  return undefined;
  } catch (err) {
    console.error('❌ checkEnrollmentMismatch error:', err);
    return res.status(500).json({ error: 'Failed to compute enrollment mismatches' });
  }
};
// Check duplicate enrollment_no in Degree and return Excel (default) or JSON
export const checkDegreeEnrollmentDuplicates = async (req, res) => {
  try {
    const DegreeModel = pickModel('Degree');
    if (!DegreeModel) return res.status(400).json({ error: 'Degree model not found' });
    const normalized = String(req.query.normalized ?? 'true').toLowerCase() !== 'false';
    const format = String(req.query.format || 'xlsx').toLowerCase();

    const baseWhere = { enrollment_no: { [Op.ne]: null } };
    const normExpr = normalized
      ? sequelize.fn(
          'LOWER',
          sequelize.fn('REPLACE', sequelize.fn('TRIM', sequelize.col('enrollment_no')), ' ', '')
        )
      : sequelize.col('enrollment_no');

    // Get groups with count > 1
    const dupGroups = await DegreeModel.findAll({
      where: baseWhere,
      attributes: [[normExpr, 'dup_key'], [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
      group: [normExpr],
      having: sequelize.literal('COUNT(id) > 1'),
      raw: true,
    });

    const keys = dupGroups.map((g) => g.dup_key).filter(Boolean);
    if (!keys.length) {
      if (format === 'json') return res.json({ duplicates: 0, groups: [], details: [] });
      const wb = new ExcelJS.Workbook();
      const summary = wb.addWorksheet('Summary');
      summary.addRow(['Duplicates Found', 0]);
      summary.addRow(['Normalized', normalized ? 'Yes' : 'No']);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      res.setHeader('Content-Disposition', 'attachment; filename="Degree-duplicate-enrollment.xlsx"');
      await wb.xlsx.write(res);
      return res.end();
    }

    // Determine available columns on Degree model to avoid selecting non-existent fields
    const attrNames = Object.keys(DegreeModel.rawAttributes || {});
    const hasCreatedAt = attrNames.includes('createdat') || attrNames.includes('createdAt');
    const hasUpdatedAt = attrNames.includes('updatedat') || attrNames.includes('updatedAt');
    const baseAttrs = ['id', 'enrollment_no', 'convocation_no', 'dg_sr_no', 'student_name_dg'];
    const detailAttrs = [...baseAttrs];
    if (hasCreatedAt) detailAttrs.push(attrNames.includes('createdat') ? 'createdat' : 'createdAt');
    if (hasUpdatedAt) detailAttrs.push(attrNames.includes('updatedat') ? 'updatedat' : 'updatedAt');

    // Fetch details for those keys
    const details = await DegreeModel.findAll({
      where: sequelize.where(normExpr, { [Op.in]: keys }),
      attributes: detailAttrs,
      order: [['enrollment_no', 'ASC'], ['convocation_no', 'ASC']],
      raw: true,
    });

    if (format === 'json') {
      try { await logAction(req, 'analysis.degree.duplicates', { normalized, groups: dupGroups.length }); } catch {}
      return res.json({
        duplicates: dupGroups.length,
        groups: dupGroups,
        details,
        normalized,
      });
    }

    // Build Excel
    const wb = new ExcelJS.Workbook();
    const summary = wb.addWorksheet('Summary');
    const groupsWs = wb.addWorksheet('Duplicate Keys');
    const detailsWs = wb.addWorksheet('Details');

    const dupRowTotal = details.length;
    summary.addRow(['Normalized compare', normalized ? 'Yes' : 'No']);
    summary.addRow(['Duplicate keys', dupGroups.length]);
    summary.addRow(['Rows in duplicate keys', dupRowTotal]);

    groupsWs.addRow(['dup_key', 'count']);
    dupGroups.forEach((g) => groupsWs.addRow([g.dup_key, Number(g.cnt)]));

    // Build details header dynamically based on selected attributes
    const header = ['dup_key', ...detailAttrs];
    detailsWs.addRow(header);
    const dupKeyOf = (enr) =>
      normalized
        ? (enr || '').toString().trim().toLowerCase().replace(/\s+/g, '')
        : (enr || '').toString();
    details.forEach((d) => {
      const row = [dupKeyOf(d.enrollment_no)];
      for (const a of detailAttrs) row.push(d[a] ?? '');
      detailsWs.addRow(row);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Disposition', 'attachment; filename="Degree-duplicate-enrollment.xlsx"');
  try { await logAction(req, 'analysis.degree.duplicates', { normalized, groups: dupGroups.length }); } catch {}
  await wb.xlsx.write(res);
  res.end();
  return undefined;
  } catch (err) {
    console.error('❌ checkDegreeEnrollmentDuplicates error:', err);
    return res.status(500).json({ error: 'Failed to compute duplicates' });
  }
};

// Prune duplicate Degree enrollment_no rows by deleting those with null/empty dg_sr_no within each duplicate group
export const pruneDegreeEnrollmentDuplicates = async (req, res) => {
  try {
    const DegreeModel = pickModel('Degree');
    if (!DegreeModel) return res.status(400).json({ error: 'Degree model not found' });
    const normalized = String(req.query.normalized ?? 'true').toLowerCase() !== 'false';
    const dryRun = String(req.query.dryRun ?? 'false').toLowerCase() === 'true';
    const keepOne = String(req.query.keepOne ?? 'true').toLowerCase() !== 'false';

    const normExpr = normalized
      ? sequelize.fn(
          'LOWER',
          sequelize.fn('REPLACE', sequelize.fn('TRIM', sequelize.col('enrollment_no')), ' ', '')
        )
      : sequelize.col('enrollment_no');

    // Find duplicate keys
    const dupGroups = await DegreeModel.findAll({
      where: { enrollment_no: { [Op.ne]: null } },
      attributes: [[normExpr, 'dup_key'], [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
      group: [normExpr],
      having: sequelize.literal('COUNT(id) > 1'),
      raw: true,
    });

    const keys = dupGroups.map((g) => g.dup_key).filter(Boolean);
    if (!keys.length) return res.json({ ok: true, normalized, dryRun, keepOne, groups: 0, deleted: 0, kept: 0 });

    // Fetch all rows within duplicate keys
    const rows = await DegreeModel.findAll({
      where: sequelize.where(normExpr, { [Op.in]: keys }),
      attributes: ['id', 'enrollment_no', 'convocation_no', 'dg_sr_no', 'student_name_dg'],
      raw: true,
    });

    const dupKeyOf = (enr) =>
      normalized ? (enr || '').toString().trim().toLowerCase().replace(/\s+/g, '') : (enr || '').toString();

    // Group rows by dup_key
    const byKey = new Map();
    for (const r of rows) {
      const k = dupKeyOf(r.enrollment_no);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(r);
    }

    const toDelete = [];
    const toKeep = [];
  for (const [_key, list] of byKey.entries()) {
      // Candidates to delete: dg_sr_no null or empty
      const del = list.filter((r) => r.dg_sr_no == null || String(r.dg_sr_no).trim() === '');
      const keep = list.filter((r) => !(r.dg_sr_no == null || String(r.dg_sr_no).trim() === ''));

      if (del.length && keepOne && del.length === list.length) {
        // All are null; keep the first record to avoid deleting the entire group
        const [keepFirst, ...restDel] = del;
        toKeep.push(keepFirst);
        toDelete.push(...restDel);
      } else {
        toKeep.push(...keep);
        toDelete.push(...del);
      }
    }

    let deletedCount = 0;
    if (!dryRun && toDelete.length) {
      const ids = toDelete.map((r) => r.id);
      // Chunk deletion for large sets
      const CHUNK = 5000;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        deletedCount += await DegreeModel.destroy({ where: { id: { [Op.in]: slice } } });
      }
    }

    // Build a small log workbook
    const wb = new ExcelJS.Workbook();
    const wsSum = wb.addWorksheet('Summary');
    const wsDel = wb.addWorksheet('Deleted');
    const wsKeep = wb.addWorksheet('Kept');
    wsSum.addRow(['Normalized', normalized ? 'Yes' : 'No']);
    wsSum.addRow(['Dry Run', dryRun ? 'Yes' : 'No']);
    wsSum.addRow(['Keep one if all null', keepOne ? 'Yes' : 'No']);
    wsSum.addRow(['Duplicate groups', byKey.size]);
    wsSum.addRow(['To delete (rows)', toDelete.length]);
    wsSum.addRow(['Deleted (rows)', dryRun ? 0 : deletedCount]);
    wsSum.addRow(['Kept (rows)', toKeep.length]);

    wsDel.addRow(['id', 'enrollment_no', 'convocation_no', 'dg_sr_no', 'student_name_dg']);
    toDelete.forEach((r) => wsDel.addRow([r.id, r.enrollment_no || '', r.convocation_no || '', r.dg_sr_no || '', r.student_name_dg || '']));
    wsKeep.addRow(['id', 'enrollment_no', 'convocation_no', 'dg_sr_no', 'student_name_dg']);
    toKeep.forEach((r) => wsKeep.addRow([r.id, r.enrollment_no || '', r.convocation_no || '', r.dg_sr_no || '', r.student_name_dg || '']));

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = `Degree-prune-duplicates-${stamp}.xlsx`;
    const logPath = path.join(LOGS_DIR, logFile);
    await wb.xlsx.writeFile(logPath);
    const logUrl = `/media/logs/${encodeURIComponent(logFile)}`;

    const result = {
      ok: true,
      normalized,
      dryRun,
      keepOne,
      groups: byKey.size,
      toDelete: toDelete.length,
      deleted: dryRun ? 0 : deletedCount,
      kept: toKeep.length,
      logUrl,
    };
    try { await logAction(req, 'analysis.degree.prune.enrollment', { normalized, dryRun, keepOne, toDelete: toDelete.length, deleted: deletedCount }); } catch {}
    return res.json(result);
  } catch (err) {
    console.error('❌ pruneDegreeEnrollmentDuplicates error:', err);
    return res.status(500).json({ error: 'Failed to prune duplicates' });
  }
};

// Prune duplicates where student_name_dg + enrollment_no + convocation_no all match
export const pruneDegreeExactDuplicates = async (req, res) => {
  try {
    const DegreeModel = pickModel('Degree');
    if (!DegreeModel) return res.status(400).json({ error: 'Degree model not found' });
    const normalized = String(req.query.normalized ?? 'true').toLowerCase() !== 'false';
    const dryRun = String(req.query.dryRun ?? 'false').toLowerCase() === 'true';
    const keepOne = String(req.query.keepOne ?? 'true').toLowerCase() !== 'false';

    // Build normalization expressions
    const nameExpr = normalized
      ? sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('student_name_dg')))
      : sequelize.col('student_name_dg');
    const enrExpr = normalized
      ? sequelize.fn(
          'LOWER',
          sequelize.fn('REPLACE', sequelize.fn('TRIM', sequelize.col('enrollment_no')), ' ', '')
        )
      : sequelize.col('enrollment_no');
    const convoExpr = normalized
      ? sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('convocation_no')))
      : sequelize.col('convocation_no');

    // Find duplicate triples
    const dupGroups = await DegreeModel.findAll({
      where: {
        student_name_dg: { [Op.ne]: null },
        enrollment_no: { [Op.ne]: null },
        convocation_no: { [Op.ne]: null },
      },
      attributes: [[nameExpr, 'name_key'], [enrExpr, 'enr_key'], [convoExpr, 'convo_key'], [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
      group: [nameExpr, enrExpr, convoExpr],
      having: sequelize.literal('COUNT(id) > 1'),
      raw: true,
    });

    if (!dupGroups.length) {
      return res.json({ ok: true, normalized, dryRun, keepOne, groups: 0, toDelete: 0, deleted: 0, kept: 0 });
    }

    // Prepare filters to limit detail fetch
    const nameKeys = Array.from(new Set(dupGroups.map((g) => g.name_key).filter(Boolean)));
    const enrKeys = Array.from(new Set(dupGroups.map((g) => g.enr_key).filter(Boolean)));
    const convoKeys = Array.from(new Set(dupGroups.map((g) => g.convo_key).filter(Boolean)));

    const whereAnd = [
      { student_name_dg: { [Op.ne]: null } },
      { enrollment_no: { [Op.ne]: null } },
      { convocation_no: { [Op.ne]: null } },
    ];
    // Apply IN filters using normalized expressions
    if (nameKeys.length) whereAnd.push(sequelize.where(nameExpr, { [Op.in]: nameKeys }));
    if (enrKeys.length) whereAnd.push(sequelize.where(enrExpr, { [Op.in]: enrKeys }));
    if (convoKeys.length) whereAnd.push(sequelize.where(convoExpr, { [Op.in]: convoKeys }));

    const details = await DegreeModel.findAll({
      where: { [Op.and]: whereAnd },
      attributes: ['id', 'student_name_dg', 'enrollment_no', 'convocation_no', 'dg_sr_no'],
      order: [['enrollment_no', 'ASC'], ['convocation_no', 'ASC'], ['student_name_dg', 'ASC']],
      raw: true,
    });

    // JS-side normalizers to build triple key
    const normName = (v) => (v == null ? '' : (normalized ? String(v).trim().toLowerCase() : String(v))); 
    const normEnr = (v) => (v == null ? '' : (normalized ? String(v).trim().toLowerCase().replace(/\s+/g, '') : String(v)));
    const normConvo = (v) => (v == null ? '' : (normalized ? String(v).trim().toLowerCase() : String(v)));

    const keyOf = (r) => `${normName(r.student_name_dg)}|${normEnr(r.enrollment_no)}|${normConvo(r.convocation_no)}`;

    // Group by triple key
    const byKey = new Map();
    for (const r of details) {
      const k = keyOf(r);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(r);
    }

    // Only keep those keys that were duplicates
    for (const k of Array.from(byKey.keys())) {
      const list = byKey.get(k) || [];
      if (list.length <= 1) byKey.delete(k);
    }

    if (!byKey.size) {
      return res.json({ ok: true, normalized, dryRun, keepOne, groups: 0, toDelete: 0, deleted: 0, kept: details.length });
    }

    const toDelete = [];
    const toKeep = [];
  for (const [_key, list] of byKey.entries()) {
      // Prefer keeping rows with non-empty dg_sr_no; among them, keep the one with smallest id
      const nonEmpty = list.filter((r) => !(r.dg_sr_no == null || String(r.dg_sr_no).trim() === ''));
      let keepRecord = null;
      if (nonEmpty.length) {
        keepRecord = nonEmpty.reduce((min, cur) => (min == null || cur.id < min.id ? cur : min), null);
      } else if (keepOne) {
        keepRecord = list.reduce((min, cur) => (min == null || cur.id < min.id ? cur : min), null);
      }

      if (keepRecord) {
        toKeep.push(keepRecord);
        // Delete all others in the list
        for (const r of list) {
          if (r.id !== keepRecord.id) toDelete.push(r);
        }
      } else {
        // If no keep chosen and keepOne=false, delete all
        toDelete.push(...list);
      }
    }

    let deletedCount = 0;
    if (!dryRun && toDelete.length) {
      const ids = toDelete.map((r) => r.id);
      const CHUNK = 5000;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        deletedCount += await DegreeModel.destroy({ where: { id: { [Op.in]: slice } } });
      }
    }

    // Build log workbook
    const wb = new ExcelJS.Workbook();
    const wsSum = wb.addWorksheet('Summary');
    const wsDel = wb.addWorksheet('Deleted');
    const wsKeep = wb.addWorksheet('Kept');
    wsSum.addRow(['Normalized', normalized ? 'Yes' : 'No']);
    wsSum.addRow(['Dry Run', dryRun ? 'Yes' : 'No']);
    wsSum.addRow(['Keep one', keepOne ? 'Yes' : 'No']);
    wsSum.addRow(['Duplicate groups (triple)', byKey.size]);
    wsSum.addRow(['To delete (rows)', toDelete.length]);
    wsSum.addRow(['Deleted (rows)', dryRun ? 0 : deletedCount]);
    wsSum.addRow(['Kept (rows)', toKeep.length]);

    wsDel.addRow(['id', 'student_name_dg', 'enrollment_no', 'convocation_no', 'dg_sr_no']);
    toDelete.forEach((r) => wsDel.addRow([r.id, r.student_name_dg || '', r.enrollment_no || '', r.convocation_no || '', r.dg_sr_no || '']));
    wsKeep.addRow(['id', 'student_name_dg', 'enrollment_no', 'convocation_no', 'dg_sr_no']);
    toKeep.forEach((r) => wsKeep.addRow([r.id, r.student_name_dg || '', r.enrollment_no || '', r.convocation_no || '', r.dg_sr_no || '']));

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = `Degree-prune-triple-duplicates-${stamp}.xlsx`;
    const logPath = path.join(LOGS_DIR, logFile);
    await wb.xlsx.writeFile(logPath);
    const logUrl = `/media/logs/${encodeURIComponent(logFile)}`;

    const result = {
      ok: true,
      normalized,
      dryRun,
      keepOne,
      groups: byKey.size,
      toDelete: toDelete.length,
      deleted: dryRun ? 0 : deletedCount,
      kept: toKeep.length,
      logUrl,
    };
    try { await logAction(req, 'analysis.degree.prune.triple', { normalized, dryRun, keepOne, toDelete: toDelete.length, deleted: deletedCount }); } catch {}
    return res.json(result);
  } catch (err) {
    console.error('❌ pruneDegreeExactDuplicates error:', err);
    return res.status(500).json({ error: 'Failed to prune exact duplicates' });
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
