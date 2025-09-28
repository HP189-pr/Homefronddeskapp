import { Op, fn, col, where as sqlWhere } from 'sequelize';
import ProvisionalRequest from '../models/provisional_request.mjs';

function twoDigitYear(d = new Date()) { return String(d.getFullYear()).slice(-2); }

async function generateNextProvisionalNumber() {
  const yy = twoDigitYear();
  const prefix = `03-${yy}`;
  const last = await ProvisionalRequest.findOne({
    where: sqlWhere(fn('LOWER', col('provisional_number')), { [Op.like]: `${prefix}%`.toLowerCase() }),
    order: [[col('provisional_number'), 'DESC']],
  });
  let seq = 0;
  if (last?.provisional_number) {
    const parts = last.provisional_number.split('-');
    const num = parseInt(parts[1]?.slice(2), 10);
    if (!Number.isNaN(num)) seq = num;
  }
  const padded = String(seq + 1).padStart(4, '0');
  return `${prefix}${padded}`; // e.g., 03-250001
}

export async function listProvisionals(params = {}) {
  const { q, status, enrollment_no, limit = 50, offset = 0 } = params;
  const where = {};
  if (status) where.status = status;
  if (enrollment_no) where.enrollment_no = enrollment_no;
  if (q) {
    const like = `%${q.toString().toLowerCase()}%`;
    where[Op.or] = [
      sqlWhere(fn('LOWER', col('provisional_number')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('enrollment_no')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('studentname')), { [Op.like]: like }),
    ];
  }
  return ProvisionalRequest.findAll({ where, limit, offset, order: [['id','DESC']] });
}

export async function getProvisional(id) { return ProvisionalRequest.findByPk(id); }

export async function createProvisional(payload) {
  const data = { ...payload };
  if (data.status === 'done' && !data.provisional_number) {
    data.provisional_number = await generateNextProvisionalNumber();
  }
  if (data.status === 'done' && !data.provisional_number) {
    const err = new Error('provisional_number required when status is done');
    err.status = 400; throw err;
  }
  if (!data.provisional_scan_copy && data.provisional_number) {
    data.provisional_scan_copy = `${data.provisional_number}.pdf`;
  }
  return ProvisionalRequest.create(data);
}

export async function updateProvisional(id, payload) {
  const row = await ProvisionalRequest.findByPk(id); if (!row) return null;
  const prev = row.toJSON(); const data = { ...payload };
  if (data.status === 'done' && !prev.provisional_number && !data.provisional_number) {
    data.provisional_number = await generateNextProvisionalNumber();
  }
  if ((data.status || prev.status) === 'done' && !(data.provisional_number || prev.provisional_number)) {
    const err = new Error('provisional_number required when status is done');
    err.status = 400; throw err;
  }
  const next = { ...prev, ...data };
  if (!next.provisional_scan_copy && next.provisional_number) next.provisional_scan_copy = `${next.provisional_number}.pdf`;
  await row.update(next); return row;
}

export default { listProvisionals, getProvisional, createProvisional, updateProvisional };
