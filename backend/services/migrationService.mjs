import { Op, fn, col, where as sqlWhere } from 'sequelize';
import MigrationRequest from '../models/migration_request.mjs';
import { Setting } from '../models/path.mjs';
import { findFileRecursive } from '../utils/fsSearch.mjs';

function twoDigitYear(d = new Date()) { return String(d.getFullYear()).slice(-2); }

async function generateNextMigrationNumber() {
  const yy = twoDigitYear();
  const prefix = `--${yy}`; // No special two-digit prefix provided; keep year + sequence
  const last = await MigrationRequest.findOne({
    where: sqlWhere(fn('LOWER', col('migration_number')), { [Op.like]: `%${yy}%` }),
    order: [[col('migration_number'), 'DESC']],
  });
  let seq = 0;
  if (last?.migration_number) {
    const tail = last.migration_number.match(/(\d{4})$/)?.[1];
    const num = parseInt(tail, 10); if (!Number.isNaN(num)) seq = num;
  }
  const next = String(seq + 1).padStart(4, '0');
  return `${yy}${next}`;
}

export async function listMigrations(params = {}) {
  const { q, status, enrollment_no, limit = 50, offset = 0 } = params;
  const where = {};
  if (status) where.status = status;
  if (enrollment_no) where.enrollment_no = enrollment_no;
  if (q) {
    const like = `%${q.toString().toLowerCase()}%`;
    where[Op.or] = [
      sqlWhere(fn('LOWER', col('migration_number')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('enrollment_no')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('studentname')), { [Op.like]: like }),
    ];
  }
  return MigrationRequest.findAll({ where, limit, offset, order: [['id','DESC']] });
}

export async function getMigration(id) { return MigrationRequest.findByPk(id); }

export async function createMigration(payload) {
  const data = { ...payload };
  if (data.status === 'done' && !data.migration_number) {
    data.migration_number = await generateNextMigrationNumber();
  }
  if (data.status === 'done' && !data.migration_number) {
    const err = new Error('migration_number required when status is done');
    err.status = 400; throw err;
  }
  if (!data.migration_scan_copy && data.migration_number) {
    const base = (await Setting.findByPk('migration.doc_base'))?.value || (await Setting.findByPk('docs.base'))?.value || null;
    const filename = `${data.migration_number}.pdf`;
    if (base) {
      const found = await findFileRecursive(filename, base, { maxDepth: 4 });
      data.migration_scan_copy = found || '';
    } else {
      data.migration_scan_copy = '';
    }
  }
  return MigrationRequest.create(data);
}

export async function updateMigration(id, payload) {
  const row = await MigrationRequest.findByPk(id); if (!row) return null;
  const prev = row.toJSON(); const data = { ...payload };
  if (data.status === 'done' && !prev.migration_number && !data.migration_number) {
    data.migration_number = await generateNextMigrationNumber();
  }
  if ((data.status || prev.status) === 'done' && !(data.migration_number || prev.migration_number)) {
    const err = new Error('migration_number required when status is done');
    err.status = 400; throw err;
  }
  const next = { ...prev, ...data };
  if (!next.migration_scan_copy && next.migration_number) {
    const base = (await Setting.findByPk('migration.doc_base'))?.value || (await Setting.findByPk('docs.base'))?.value || null;
    const filename = `${next.migration_number}.pdf`;
    if (base) {
      const found = await findFileRecursive(filename, base, { maxDepth: 4 });
      next.migration_scan_copy = found || '';
    } else {
      next.migration_scan_copy = '';
    }
  }
  await row.update(next); return row;
}

export default { listMigrations, getMigration, createMigration, updateMigration };
