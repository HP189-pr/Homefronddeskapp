// backend/scripts/add-eca-columns-to-document-receipts.mjs
// Purpose: Ensure document_receipts has ECA-related columns expected by the Sequelize model
// Columns: is_eca (boolean, not null, default false), eca_agency (ENUM), eca_agency_other (string), eca_remark (text)

import { sequelize } from '../db.mjs';

async function colExists(table, column) {
  const sql = `
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = $1 AND column_name = $2
    LIMIT 1;`;
  const [rows] = await sequelize.query(sql, { bind: [table, column] });
  return rows.length > 0;
}

async function typeExists(typeName) {
  const sql = `SELECT 1 FROM pg_type WHERE typname = $1 LIMIT 1;`;
  const [rows] = await sequelize.query(sql, { bind: [typeName] });
  return rows.length > 0;
}

async function ensureEnumType() {
  // Match Sequelize's typical enum type naming for consistency
  const enumName = 'enum_document_receipts_eca_agency';
  const exists = await typeExists(enumName);
  if (!exists) {
    console.log(`[eca-columns] Creating enum type ${enumName}...`);
    await sequelize.query(
      `CREATE TYPE "${enumName}" AS ENUM ('WES','IQAS','ICES','ICAS','CES','ECE','PEBC','OTHER');`
    );
  } else {
    console.log(`[eca-columns] Enum type ${enumName} already exists.`);
  }
  return enumName;
}

async function addColumns() {
  const table = 'document_receipts';
  let changed = false;

  // is_eca
  if (!(await colExists(table, 'is_eca'))) {
    console.log('[eca-columns] Adding column is_eca (boolean not null default false)...');
    await sequelize.query(
      `ALTER TABLE "${table}" ADD COLUMN "is_eca" boolean NOT NULL DEFAULT false;`
    );
    changed = true;
  } else {
    console.log('[eca-columns] Column is_eca already exists.');
  }

  // eca_agency (use enum type if present/created; otherwise fallback to text with CHECK)
  if (!(await colExists(table, 'eca_agency'))) {
    const enumName = await ensureEnumType();
    console.log(`[eca-columns] Adding column eca_agency (${enumName})...`);
    await sequelize.query(
      `ALTER TABLE "${table}" ADD COLUMN "eca_agency" "${enumName}";`
    );
    changed = true;
  } else {
    console.log('[eca-columns] Column eca_agency already exists.');
  }

  // eca_agency_other
  if (!(await colExists(table, 'eca_agency_other'))) {
    console.log('[eca-columns] Adding column eca_agency_other (varchar)...');
    await sequelize.query(
      `ALTER TABLE "${table}" ADD COLUMN "eca_agency_other" varchar;`
    );
    changed = true;
  } else {
    console.log('[eca-columns] Column eca_agency_other already exists.');
  }

  // eca_remark
  if (!(await colExists(table, 'eca_remark'))) {
    console.log('[eca-columns] Adding column eca_remark (text)...');
    await sequelize.query(
      `ALTER TABLE "${table}" ADD COLUMN "eca_remark" text;`
    );
    changed = true;
  } else {
    console.log('[eca-columns] Column eca_remark already exists.');
  }

  return changed;
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('[eca-columns] Connected to PostgreSQL');

    const changed = await addColumns();
    console.log(changed
      ? '[eca-columns] Schema updated successfully.'
      : '[eca-columns] No changes needed; schema already up to date.');

    process.exit(0);
  } catch (e) {
    console.error('[eca-columns] ERROR:', e?.message || e);
    process.exit(2);
  } finally {
    try { await sequelize.close(); } catch (_) {}
  }
}

main();
