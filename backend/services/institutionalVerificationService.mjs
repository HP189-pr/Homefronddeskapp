import { Op, fn, col, where as sqlWhere } from 'sequelize';
import InstitutionalVerification from '../models/institutional_verification.mjs';

function twoDigitYear(d = new Date()) { return String(d.getFullYear()).slice(-2); }

async function generateNextInstitutionalNumber() {
  const yy = twoDigitYear();
  const prefix = `02-${yy}`;
  const last = await InstitutionalVerification.findOne({
    where: sqlWhere(fn('LOWER', col('institutional_verification_number')), { [Op.like]: `${prefix}%`.toLowerCase() }),
    order: [[col('institutional_verification_number'), 'DESC']],
  });
  let seq = 0;
  if (last?.institutional_verification_number) {
    const parts = last.institutional_verification_number.split('-');
    const num = parseInt(parts[1]?.slice(2), 10);
    if (!Number.isNaN(num)) seq = num;
  }
  const padded = String(seq + 1).padStart(4, '0');
  return `${prefix}${padded}`; // e.g., 02-250001
}

export async function listInstitutionals(params = {}) {
  const { q, status, enrollment_no, ivyearautonumber, limit = 50, offset = 0 } = params;
  const where = {};
  if (status) where.status = status;
  if (enrollment_no) where.enrollment_no = enrollment_no;
  if (ivyearautonumber) where.ivyearautonumber = ivyearautonumber;
  if (q) {
    const like = `%${q.toString().toLowerCase()}%`;
    where[Op.or] = [
      sqlWhere(fn('LOWER', col('institutional_verification_number')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('institution_name')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('city')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('enrollment_no')), { [Op.like]: like }),
    ];
  }
  return InstitutionalVerification.findAll({ where, limit, offset, order: [['id','DESC']] });
}

export async function getInstitutional(id) { return InstitutionalVerification.findByPk(id); }

export async function createInstitutional(payload) {
  const data = { ...payload };
  if (data.status === 'done' && !data.institutional_verification_number) {
    data.institutional_verification_number = await generateNextInstitutionalNumber();
  }
  if (data.status === 'done' && !data.institutional_verification_number) {
    const err = new Error('institutional_verification_number required when status is done');
    err.status = 400; throw err;
  }
  if (!data.iv_scan_copy && data.institutional_verification_number) {
    data.iv_scan_copy = `${data.institutional_verification_number}.pdf`;
  }
  return InstitutionalVerification.create(data);
}

export async function updateInstitutional(id, payload) {
  const row = await InstitutionalVerification.findByPk(id); if (!row) return null;
  const prev = row.toJSON(); const data = { ...payload };
  if (data.status === 'done' && !prev.institutional_verification_number && !data.institutional_verification_number) {
    data.institutional_verification_number = await generateNextInstitutionalNumber();
  }
  if ((data.status || prev.status) === 'done' && !(data.institutional_verification_number || prev.institutional_verification_number)) {
    const err = new Error('institutional_verification_number required when status is done');
    err.status = 400; throw err;
  }
  const next = { ...prev, ...data };
  if (!next.iv_scan_copy && next.institutional_verification_number) next.iv_scan_copy = `${next.institutional_verification_number}.pdf`;
  await row.update(next); return row;
}

export default { listInstitutionals, getInstitutional, createInstitutional, updateInstitutional };
