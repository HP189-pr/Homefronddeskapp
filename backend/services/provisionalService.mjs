import { Op, fn, col, where as sqlWhere } from 'sequelize';
import ProvisionalRequest from '../models/docrec/provisional.mjs';
import DocRec from '../models/docrec/doc_rec.mjs';

export async function listProvisionals(params = {}) {
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
    where.prv_status = map[String(status).toLowerCase()] || status;
  }
  const token = String(student_no || enrollment_no || temp_enroll_no || '').trim();
  if (token) where.enrollment_no = { [Op.iLike]: `%${token}%` };
  if (pryearautonumber || doc_rec) where.doc_rec_id = pryearautonumber || doc_rec;

  const searchText = String(search || q || '').trim();
  if (searchText) {
    const like = `%${searchText.toString().toLowerCase()}%`;
    where[Op.or] = [
      sqlWhere(fn('LOWER', col('prv_number')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('enrollment_no')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('student_name')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('doc_rec_id')), { [Op.like]: like }),
    ];
  }
  const rows = await ProvisionalRequest.findAll({
    where,
    limit: Number(limit) || 50,
    offset: Number(offset) || 0,
    order: [['id', 'DESC']],
  });
  return rows.map((r) => {
    const o = r.toJSON();
    return {
      ...o,
      provisional_number: o.prv_number || null,
      pryearautonumber: o.doc_rec_id || null,
      studentname: o.student_name || null,
      status: (o.prv_status || '').toString().toLowerCase().replace('issued','done') || o.prv_status,
    };
  });
}

export async function getProvisional(id) {
  const row = await ProvisionalRequest.findByPk(id);
  if (!row) return null;
  const o = row.toJSON();
  return {
    ...o,
    provisional_number: o.prv_number || null,
    pryearautonumber: o.doc_rec_id || null,
    studentname: o.student_name || null,
    status: (o.prv_status || '').toString().toLowerCase().replace('issued','done') || o.prv_status,
  };
}

export async function createProvisional(payload) {
  const p = { ...(payload || {}) };
  const doc_rec_id = p.doc_rec_id || p.pryearautonumber;
  const prv_number = p.prv_number || p.provisional_number;
  if (!doc_rec_id) { const e = new Error('doc_rec_id is required'); e.status = 400; throw e; }
  if (!prv_number) { const e = new Error('prv_number is required'); e.status = 400; throw e; }
  // Map status
  const statusMap = { pending: 'Pending', done: 'Issued', cancel: 'Cancelled', correction: 'Pending' };
  const statusNorm = String(p.status || '').toLowerCase();
  const prv_status = statusMap[statusNorm] || p.prv_status || 'Pending';

  // 1) prv_number unique within doc_rec_id
  const existingSameNumber = await ProvisionalRequest.findOne({ where: { doc_rec_id, prv_number } });
  if (existingSameNumber) { const e = new Error('Duplicate prv_number for this doc_rec_id'); e.status = 409; throw e; }
  // 2) Only one null/pending or done per doc_rec_id, multiple cancelled allowed
  if (prv_status === 'Issued' || prv_status === 'Pending') {
    const clash = await ProvisionalRequest.findOne({ where: { doc_rec_id, prv_status } });
    if (clash) { const e = new Error('Only one entry with this status allowed for this doc_rec_id'); e.status = 409; throw e; }
  }

  // Pull shared info from DocRec if present
  const base = await DocRec.findOne({ where: { doc_rec_id } });
  const row = await ProvisionalRequest.create({
    doc_rec_id,
    prv_number,
    prv_status,
    enrollment_no: p.enrollment_no || base?.enrollment_no || null,
    student_name: p.student_name || base?.student_name || null,
  });
  return getProvisional(row.id);
}

export async function updateProvisional(id, payload) {
  const row = await ProvisionalRequest.findByPk(id); if (!row) return null;
  const prev = row.toJSON();
  const statusMap = { pending: 'Pending', done: 'Issued', cancel: 'Cancelled', correction: 'Pending' };
  const next = { ...prev };
  if (payload.status) next.prv_status = statusMap[String(payload.status).toLowerCase()] || payload.status;
  if (payload.provisional_number) next.prv_number = payload.provisional_number;
  await row.update(next);
  return getProvisional(id);
}

export default { listProvisionals, getProvisional, createProvisional, updateProvisional };
