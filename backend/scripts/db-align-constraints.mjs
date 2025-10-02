// backend/scripts/db-align-constraints.mjs
// Align DB constraints to match models and desired relations
// - UNIQUE on enrollment.enrollment_no
// - INDEX on degree.enrollment_no
// - FK degree.enrollment_no -> enrollment.enrollment_no (ON UPDATE CASCADE, ON DELETE RESTRICT)
// - Enforce NOT NULL on degree.enrollment_no, degree.student_name_dg, degree.convocation_no when safe

import { sequelize } from '../db.mjs';

const q = async (sql, params) => {
  const [rows] = await sequelize.query(sql, { bind: params, raw: true });
  return rows;
};

const log = (...args) => console.log('[db-align]', ...args);
const warn = (...args) => console.warn('[db-align][WARN]', ...args);
const err = (...args) => console.error('[db-align][ERROR]', ...args);

async function existsUniqueConstraint(table, column) {
  const sql = `
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = $1
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) LIKE 'UNIQUE (' || quote_ident($2) || '%'
    LIMIT 1;
  `;
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
    LIMIT 1;
  `;
  const rows = await q(sql, [srcTable, refTable, srcColumn, refColumn]);
  return rows.length > 0;
}

async function existsIndex(table, column) {
  const sql = `
    SELECT 1
    FROM pg_indexes
    WHERE tablename = $1
      AND indexdef ILIKE '%' || quote_ident($2) || '%'
    LIMIT 1;
  `;
  const rows = await q(sql, [table, column]);
  return rows.length > 0;
}

async function countDuplicatesEnrollmentNo() {
  const sql = `
    SELECT enrollment_no, COUNT(*) AS cnt
    FROM enrollment
    WHERE enrollment_no IS NOT NULL
    GROUP BY enrollment_no
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC, enrollment_no ASC
    LIMIT 50;
  `;
  return q(sql);
}

async function countNulls(table, column) {
  const sql = `SELECT COUNT(*)::int AS c FROM ${table} WHERE ${column} IS NULL;`;
  const rows = await q(sql);
  return rows[0]?.c ?? 0;
}

async function countDegreeMismatches() {
  const sql = `
    SELECT COUNT(*)::int AS c
    FROM degree d
    LEFT JOIN enrollment e ON e.enrollment_no = d.enrollment_no
    WHERE d.enrollment_no IS NOT NULL AND e.id IS NULL;
  `;
  const rows = await q(sql);
  return rows[0]?.c ?? 0;
}

async function sampleDegreeMismatches(limit = 20) {
  const sql = `
    SELECT d.enrollment_no, COUNT(*) AS cnt
    FROM degree d
    LEFT JOIN enrollment e ON e.enrollment_no = d.enrollment_no
    WHERE d.enrollment_no IS NOT NULL AND e.id IS NULL
    GROUP BY d.enrollment_no
    ORDER BY cnt DESC
    LIMIT ${Number(limit)};
  `;
  return q(sql);
}

async function main() {
  try {
    await sequelize.authenticate();
    const version = await q('SHOW server_version;');
    log('Connected to PostgreSQL', version?.[0]?.server_version ?? '');

    // Preflight checks
    log('Preflight: checking duplicates in enrollment.enrollment_no...');
    const dups = await countDuplicatesEnrollmentNo();
    if (dups.length > 0) {
      warn(`Found ${dups.length} duplicate enrollment_no values (showing up to 50):`);
      for (const r of dups) warn(`  ${r.enrollment_no} -> ${r.cnt}`);
      throw new Error('Cannot add UNIQUE(enrollment_no) due to duplicates. Please deduplicate enrollment table first.');
    }

    log('Preflight: checking degree rows referencing missing enrollment...');
    const mismatches = await countDegreeMismatches();
    if (mismatches > 0) {
      warn(`Found ${mismatches} degree rows whose enrollment_no has no match in enrollment.`);
      const sample = await sampleDegreeMismatches(20);
      for (const r of sample) warn(`  Missing enrollment_no=${r.enrollment_no} (degree rows=${r.cnt})`);
      throw new Error('Cannot add FK until all degree.enrollment_no values exist in enrollment.');
    }

    // Apply constraints
    // 1) UNIQUE on enrollment.enrollment_no
    const hasUq = await existsUniqueConstraint('enrollment', 'enrollment_no');
    if (!hasUq) {
      log('Adding UNIQUE constraint: enrollment(enrollment_no) ...');
      await q('ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_enrollment_no_key" UNIQUE ("enrollment_no");');
      log('UNIQUE constraint added.');
    } else {
      log('UNIQUE constraint already exists on enrollment(enrollment_no).');
    }

    // 2) INDEX on degree.enrollment_no (for FK and lookups)
    const hasIdx = await existsIndex('degree', 'enrollment_no');
    if (!hasIdx) {
      log('Creating index on degree(enrollment_no) ...');
      await q('CREATE INDEX IF NOT EXISTS "idx_degree_enrollment_no" ON "degree" ("enrollment_no");');
      log('Index created (or already existed).');
    } else {
      log('Index on degree(enrollment_no) already exists.');
    }

    // 3) Enforce NOT NULLs on Degree where model requires and data permits
    const nnCols = [
      { table: 'degree', col: 'enrollment_no' },
      { table: 'degree', col: 'student_name_dg' },
      { table: 'degree', col: 'convocation_no' },
    ];
    for (const { table, col } of nnCols) {
      const nulls = await countNulls(table, col);
      if (nulls > 0) {
        warn(`Skipping NOT NULL on ${table}.${col} because ${nulls} existing rows are NULL.`);
      } else {
        log(`Setting NOT NULL on ${table}.${col} ...`);
        await q(`ALTER TABLE "${table}" ALTER COLUMN "${col}" SET NOT NULL;`);
      }
    }

    // 4) FK degree.enrollment_no -> enrollment.enrollment_no
    const hasFk = await existsForeignKey('degree', 'enrollment_no', 'enrollment', 'enrollment_no');
    if (!hasFk) {
      log('Adding FK: degree(enrollment_no) -> enrollment(enrollment_no) ...');
      await q('ALTER TABLE "degree" ADD CONSTRAINT "degree_enrollment_no_fkey" FOREIGN KEY ("enrollment_no") REFERENCES "enrollment"("enrollment_no") ON UPDATE CASCADE ON DELETE RESTRICT;');
      log('FK added.');
    } else {
      log('FK already exists for degree(enrollment_no) referencing enrollment(enrollment_no).');
    }

    log('All done.');
    process.exit(0);
  } catch (e) {
    err(e.message || e);
    process.exit(2);
  } finally {
    try { await sequelize.close(); } catch (_) {}
  }
}

main();
