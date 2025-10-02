// backend/scripts/db-validate-and-align.mjs
// Validate and align relationships between:
// - enrollment.institute_id -> institutes.institute_id
// - enrollment.maincourse_id -> course_main.maincourse_id
// - enrollment.subcourse_id -> course_sub.subcourse_id
// - course_sub.maincourse_id -> course_main.maincourse_id
// Writes an Excel log of duplicates/mismatches and applies UNIQUE/INDEX/FK when safe.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { sequelize } from '../db.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MEDIA_ROOT = path.resolve(__dirname, '../media');
const LOGS_DIR = path.join(MEDIA_ROOT, 'logs');
for (const d of [MEDIA_ROOT, LOGS_DIR]) {
  try { fs.mkdirSync(d, { recursive: true }); } catch (_) {}
}

const q = async (sql, params) => {
  const [rows] = await sequelize.query(sql, { bind: params, raw: true });
  return rows;
};

const log = (...a) => console.log('[db-validate]', ...a);
const warn = (...a) => console.warn('[db-validate][WARN]', ...a);
const err = (...a) => console.error('[db-validate][ERROR]', ...a);

async function existsUniqueConstraint(table, column) {
  const sql = `
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = $1
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) LIKE 'UNIQUE (' || quote_ident($2) || '%'
    LIMIT 1;`;
  const rows = await q(sql, [table, column]);
  return rows.length > 0;
}

async function existsForeignKey(srcTable, srcColumn, refTable, refColumn) {
  const sql = `
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class src ON src.oid = c.conrelid
    JOIN pg_class ref ON ref.oid = c.confrelid
    WHERE c.contype = 'f'
      AND src.relname = $1
      AND ref.relname = $2
      AND pg_get_constraintdef(c.oid) LIKE 'FOREIGN KEY (' || quote_ident($3) || ') REFERENCES ' || quote_ident($2) || '(' || quote_ident($4) || ')%'
    LIMIT 1;`;
  const rows = await q(sql, [srcTable, refTable, srcColumn, refColumn]);
  return rows.length > 0;
}

async function existsIndex(table, column) {
  const rows = await q(`SELECT 1 FROM pg_indexes WHERE tablename = $1 AND indexdef ILIKE '%' || quote_ident($2) || '%' LIMIT 1;`, [table, column]);
  return rows.length > 0;
}

async function duplicatesFor(table, column) {
  const sql = `
    SELECT ${column} AS value, COUNT(*)::int AS cnt
    FROM ${table}
    WHERE ${column} IS NOT NULL
    GROUP BY ${column}
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC, ${column} ASC;`;
  return q(sql);
}

async function mismatchesEnrollmentInstitute() {
  const sql = `
    SELECT e.*
    FROM enrollment e
    LEFT JOIN institutes i ON i.institute_id = e.institute_id
    WHERE e.institute_id IS NOT NULL AND i.id IS NULL;`;
  return q(sql);
}

async function mismatchesEnrollmentMainCourse() {
  const sql = `
    SELECT e.*
    FROM enrollment e
    LEFT JOIN course_main m ON m.maincourse_id = e.maincourse_id
    WHERE e.maincourse_id IS NOT NULL AND m.id IS NULL;`;
  return q(sql);
}

async function mismatchesEnrollmentSubCourse() {
  const sql = `
    SELECT e.*
    FROM enrollment e
    LEFT JOIN course_sub s ON s.subcourse_id = e.subcourse_id
    WHERE e.subcourse_id IS NOT NULL AND s.id IS NULL;`;
  return q(sql);
}

async function mismatchesCourseSubMainCourse() {
  const sql = `
    SELECT s.*
    FROM course_sub s
    LEFT JOIN course_main m ON m.maincourse_id = s.maincourse_id
    WHERE s.maincourse_id IS NOT NULL AND m.id IS NULL;`;
  return q(sql);
}

async function writeLog({
  dupsInstitutes, dupsMain, dupsSub,
  misEnrollInst, misEnrollMain, misEnrollSub, misSubMain,
  actions,
}) {
  const wb = new ExcelJS.Workbook();
  const summary = wb.addWorksheet('Summary');
  summary.addRow(['Check', 'Duplicates', 'Mismatches', 'Action']);
  const rows = [
    ['institutes.institute_id unique', dupsInstitutes.length, 0, actions['institutes.institute_id'] || ''],
    ['course_main.maincourse_id unique', dupsMain.length, 0, actions['course_main.maincourse_id'] || ''],
    ['course_sub.subcourse_id unique', dupsSub.length, 0, actions['course_sub.subcourse_id'] || ''],
    ['enrollment.institute_id -> institutes.institute_id', 0, misEnrollInst.length, actions['fk_enrollment_institute'] || ''],
    ['enrollment.maincourse_id -> course_main.maincourse_id', 0, misEnrollMain.length, actions['fk_enrollment_maincourse'] || ''],
    ['enrollment.subcourse_id -> course_sub.subcourse_id', 0, misEnrollSub.length, actions['fk_enrollment_subcourse'] || ''],
    ['course_sub.maincourse_id -> course_main.maincourse_id', 0, misSubMain.length, actions['fk_course_sub_maincourse'] || ''],
  ];
  rows.forEach(r => summary.addRow(r));

  const addSheetFromRows = (name, rows) => {
    const ws = wb.addWorksheet(name);
    if (!rows || rows.length === 0) { ws.addRow(['None']); return; }
    const headers = Object.keys(rows[0]);
    ws.addRow(headers);
    for (const r of rows) {
      ws.addRow(headers.map(h => r[h]));
    }
  };

  addSheetFromRows('Duplicates_Institutes_institute_id', dupsInstitutes);
  addSheetFromRows('Duplicates_CourseMain_maincourse_id', dupsMain);
  addSheetFromRows('Duplicates_CourseSub_subcourse_id', dupsSub);
  addSheetFromRows('Enrollment_MissingInstitute', misEnrollInst);
  addSheetFromRows('Enrollment_MissingMainCourse', misEnrollMain);
  addSheetFromRows('Enrollment_MissingSubCourse', misEnrollSub);
  addSheetFromRows('CourseSub_MissingMainCourse', misSubMain);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = `relations-align-${stamp}.xlsx`;
  const outPath = path.join(LOGS_DIR, file);
  await wb.xlsx.writeFile(outPath);
  return { outPath, file };
}

async function main() {
  try {
    await sequelize.authenticate();
    log('Connected to PostgreSQL');

    // Validate
    const dupsInstitutes = await duplicatesFor('institutes', 'institute_id');
    const dupsMain = await duplicatesFor('course_main', 'maincourse_id');
    const dupsSub = await duplicatesFor('course_sub', 'subcourse_id');

    const misEnrollInst = await mismatchesEnrollmentInstitute();
    const misEnrollMain = await mismatchesEnrollmentMainCourse();
    const misEnrollSub = await mismatchesEnrollmentSubCourse();
    const misSubMain = await mismatchesCourseSubMainCourse();

    const actions = {};

    // Apply UNIQUE when no duplicates
    if (dupsInstitutes.length === 0) {
      const has = await existsUniqueConstraint('institutes', 'institute_id');
      if (!has) {
        log('Adding UNIQUE on institutes(institute_id)...');
        await q('ALTER TABLE "institutes" ADD CONSTRAINT "institutes_institute_id_key" UNIQUE ("institute_id");');
        actions['institutes.institute_id'] = 'APPLIED';
      } else {
        actions['institutes.institute_id'] = 'EXISTED';
      }
    } else {
      actions['institutes.institute_id'] = 'BLOCKED (duplicates)';
      dupsInstitutes.slice(0, 10).forEach(r => warn(`Duplicate institute_id=${r.value} cnt=${r.cnt}`));
    }

    if (dupsMain.length === 0) {
      const has = await existsUniqueConstraint('course_main', 'maincourse_id');
      if (!has) {
        log('Adding UNIQUE on course_main(maincourse_id)...');
        await q('ALTER TABLE "course_main" ADD CONSTRAINT "course_main_maincourse_id_key" UNIQUE ("maincourse_id");');
        actions['course_main.maincourse_id'] = 'APPLIED';
      } else {
        actions['course_main.maincourse_id'] = 'EXISTED';
      }
    } else {
      actions['course_main.maincourse_id'] = 'BLOCKED (duplicates)';
      dupsMain.slice(0, 10).forEach(r => warn(`Duplicate maincourse_id=${r.value} cnt=${r.cnt}`));
    }

    if (dupsSub.length === 0) {
      const has = await existsUniqueConstraint('course_sub', 'subcourse_id');
      if (!has) {
        log('Adding UNIQUE on course_sub(subcourse_id)...');
        await q('ALTER TABLE "course_sub" ADD CONSTRAINT "course_sub_subcourse_id_key" UNIQUE ("subcourse_id");');
        actions['course_sub.subcourse_id'] = 'APPLIED';
      } else {
        actions['course_sub.subcourse_id'] = 'EXISTED';
      }
    } else {
      actions['course_sub.subcourse_id'] = 'BLOCKED (duplicates)';
      dupsSub.slice(0, 10).forEach(r => warn(`Duplicate subcourse_id=${r.value} cnt=${r.cnt}`));
    }

    // Indexes on FK columns
    const idxPlans = [
      ['enrollment', 'institute_id', 'idx_enrollment_institute_id'],
      ['enrollment', 'maincourse_id', 'idx_enrollment_maincourse_id'],
      ['enrollment', 'subcourse_id', 'idx_enrollment_subcourse_id'],
      ['course_sub', 'maincourse_id', 'idx_course_sub_maincourse_id'],
    ];
    for (const [table, col, idxName] of idxPlans) {
      const has = await existsIndex(table, col);
      if (!has) {
        log(`Creating index ${idxName} on ${table}(${col})...`);
        await q(`CREATE INDEX IF NOT EXISTS "${idxName}" ON "${table}" ("${col}");`);
      }
    }

    // Apply FK only when no mismatches and parent unique exists
    const canFKEnrollInst = (misEnrollInst.length === 0) && (dupsInstitutes.length === 0);
    const canFKEnrollMain = (misEnrollMain.length === 0) && (dupsMain.length === 0);
    const canFKEnrollSub = (misEnrollSub.length === 0) && (dupsSub.length === 0);
    const canFKSubMain = (misSubMain.length === 0) && (dupsMain.length === 0);

    if (canFKEnrollInst) {
      const has = await existsForeignKey('enrollment', 'institute_id', 'institutes', 'institute_id');
      if (!has) {
        log('Adding FK enrollment(institute_id) -> institutes(institute_id)...');
        await q('ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_institute_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "institutes"("institute_id") ON UPDATE CASCADE ON DELETE RESTRICT;');
      }
      actions['fk_enrollment_institute'] = 'APPLIED';
    } else {
      actions['fk_enrollment_institute'] = 'BLOCKED (mismatches or duplicates)';
    }

    if (canFKEnrollMain) {
      const has = await existsForeignKey('enrollment', 'maincourse_id', 'course_main', 'maincourse_id');
      if (!has) {
        log('Adding FK enrollment(maincourse_id) -> course_main(maincourse_id)...');
        await q('ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_maincourse_id_fkey" FOREIGN KEY ("maincourse_id") REFERENCES "course_main"("maincourse_id") ON UPDATE CASCADE ON DELETE RESTRICT;');
      }
      actions['fk_enrollment_maincourse'] = 'APPLIED';
    } else {
      actions['fk_enrollment_maincourse'] = 'BLOCKED (mismatches or duplicates)';
    }

    if (canFKEnrollSub) {
      const has = await existsForeignKey('enrollment', 'subcourse_id', 'course_sub', 'subcourse_id');
      if (!has) {
        log('Adding FK enrollment(subcourse_id) -> course_sub(subcourse_id)...');
        await q('ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_subcourse_id_fkey" FOREIGN KEY ("subcourse_id") REFERENCES "course_sub"("subcourse_id") ON UPDATE CASCADE ON DELETE RESTRICT;');
      }
      actions['fk_enrollment_subcourse'] = 'APPLIED';
    } else {
      actions['fk_enrollment_subcourse'] = 'BLOCKED (mismatches or duplicates)';
    }

    if (canFKSubMain) {
      const has = await existsForeignKey('course_sub', 'maincourse_id', 'course_main', 'maincourse_id');
      if (!has) {
        log('Adding FK course_sub(maincourse_id) -> course_main(maincourse_id)...');
        await q('ALTER TABLE "course_sub" ADD CONSTRAINT "course_sub_maincourse_id_fkey" FOREIGN KEY ("maincourse_id") REFERENCES "course_main"("maincourse_id") ON UPDATE CASCADE ON DELETE RESTRICT;');
      }
      actions['fk_course_sub_maincourse'] = 'APPLIED';
    } else {
      actions['fk_course_sub_maincourse'] = 'BLOCKED (mismatches or duplicates)';
    }

    // Write comprehensive log
    const { outPath, file } = await writeLog({
      dupsInstitutes, dupsMain, dupsSub,
      misEnrollInst, misEnrollMain, misEnrollSub, misSubMain,
      actions,
    });
    log('Log written:', outPath);
    console.log('[db-validate] Log URL (static path):', `/media/logs/${encodeURIComponent(file)}`);

    log('Done.');
    process.exit(0);
  } catch (e) {
    err(e?.message || e);
    process.exit(2);
  } finally {
    try { await sequelize.close(); } catch (_) {}
  }
}

main();
