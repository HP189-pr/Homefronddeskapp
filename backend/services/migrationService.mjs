import { Op, fn, col, where as sqlWhere } from 'sequelize';
import MigrationRequest from '../models/docrec/migration.mjs';
import DocRec from '../models/docrec/doc_rec.mjs';

function twoDigitYear(d = new Date()) { return String(d.getFullYear()).slice(-2); }

async function _generateNextMigrationNumber() {
  const yy = twoDigitYear();
  const last = await MigrationRequest.findOne({
    where: sqlWhere(fn('LOWER', col('mg_number')), { [Op.like]: `%${yy}%` }),
    order: [[col('mg_number'), 'DESC']],
  });
  let seq = 0;
  if (last?.mg_number) {
    const tail = last.mg_number.match(/(\d{4})$/)?.[1];
    const num = parseInt(tail, 10); if (!Number.isNaN(num)) seq = num;
  }
  const next = String(seq + 1).padStart(4, '0');
  return `${yy}${next}`;
}

export async function listMigrations(params = {}) {
  const {
    q,
    search,
    status,
    enrollment_no,
    student_no,
    temp_enroll_no,
    pryearautonumber,
    doc_rec,
    limit = 50,
    offset = 0,
  } = params;
  const where = {};
  if (status) {
    const map = { pending: 'Pending', done: 'Issued', cancel: 'Cancelled', correction: 'Pending' };
    where.mg_status = map[String(status).toLowerCase()] || status;
  }
  const token = String(student_no || enrollment_no || temp_enroll_no || '').trim();
  if (token) where.enrollment_no = { [Op.iLike]: `%${token}%` };
  if (pryearautonumber || doc_rec) where.doc_rec_id = pryearautonumber || doc_rec;

  const searchText = String(search || q || '').trim();
  if (searchText) {
    const like = `%${searchText.toString().toLowerCase()}%`;
    where[Op.or] = [
      sqlWhere(fn('LOWER', col('mg_number')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('enrollment_no')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('student_name')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('doc_rec_id')), { [Op.like]: like }),
    ];
  }
  const rows = await MigrationRequest.findAll({
    where,
    limit: Number(limit) || 50,
    offset: Number(offset) || 0,
    order: [['id', 'DESC']],
  });
  return rows.map((r) => {
    const o = r.toJSON();
    return {
      ...o,
      migration_number: o.mg_number || null,
      pryearautonumber: o.doc_rec_id || null,
      studentname: o.student_name || null,
      status: (o.mg_status || '').toString().toLowerCase().replace('issued','done') || o.mg_status,
    };
  });
}

export async function getMigration(id) {
  const row = await MigrationRequest.findByPk(id);
  if (!row) return null;
  const o = row.toJSON();
  return {
    ...o,
    migration_number: o.mg_number || null,
    pryearautonumber: o.doc_rec_id || null,
    studentname: o.student_name || null,
    status: (o.mg_status || '').toString().toLowerCase().replace('issued','done') || o.mg_status,
  };
}

export async function createMigration(payload) {
  const p = { ...(payload || {}) };
  // Require doc_rec_id and mg_number for entry creation
  const doc_rec_id = p.doc_rec_id || p.pryearautonumber;
  const mg_number = p.mg_number || p.migration_number;
  if (!doc_rec_id) { const e = new Error('doc_rec_id is required'); e.status = 400; throw e; }
  if (!mg_number) { const e = new Error('mg_number is required'); e.status = 400; throw e; }

  // Map status
  const statusMap = { pending: 'Pending', done: 'Issued', cancel: 'Cancelled', correction: 'Pending' };
  const statusNorm = String(p.status || '').toLowerCase();
  const mg_status = statusMap[statusNorm] || p.mg_status || 'Pending';

  // Validations:
  // 1) mg_number unique within doc_rec_id
  const existingSameNumber = await MigrationRequest.findOne({ where: { doc_rec_id, mg_number } });
  if (existingSameNumber) { const e = new Error('Duplicate mg_number for this doc_rec_id'); e.status = 409; throw e; }
  // 2) Only one null or done per doc_rec_id (null interpreted as Pending here), allow multiple Cancelled
  if (mg_status === 'Issued' || mg_status === 'Pending') {
    const clash = await MigrationRequest.findOne({
      where: { doc_rec_id, mg_status },
    });
    if (clash) { const e = new Error('Only one entry with this status allowed for this doc_rec_id'); e.status = 409; throw e; }
  }

  // Pull shared info from DocRec if present
  const base = await DocRec.findOne({ where: { doc_rec_id } });
  const row = await MigrationRequest.create({
    doc_rec_id,
    mg_number,
    mg_status,
    enrollment_no: p.enrollment_no || base?.enrollment_no || null,
    student_name: p.student_name || base?.student_name || null,
  });
  return getMigration(row.id);
}

export async function updateMigration(id, payload) {
  const row = await MigrationRequest.findByPk(id); if (!row) return null;
  const prev = row.toJSON();
  const statusMap = { pending: 'Pending', done: 'Issued', cancel: 'Cancelled', correction: 'Pending' };
  const next = { ...prev };
  if (payload.status) next.mg_status = statusMap[String(payload.status).toLowerCase()] || payload.status;
  if (payload.migration_number) next.mg_number = payload.migration_number;
  await row.update(next);
  return getMigration(id);
}

export default { listMigrations, getMigration, createMigration, updateMigration };
