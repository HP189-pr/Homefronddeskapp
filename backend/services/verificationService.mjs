import { Op, fn, col, where as sqlWhere, literal } from 'sequelize';
import Verification from '../models/verification.mjs';

function twoDigitYear(d = new Date()) {
  return String(d.getFullYear()).slice(-2);
}

async function generateNextVerificationNumber() {
  const yy = twoDigitYear();
  const prefix = `01-${yy}`;
  // Find latest number for this year
  const last = await Verification.findOne({
    where: sqlWhere(fn('LOWER', col('verification_no')), { [Op.like]: `${prefix}%`.toLowerCase() }),
    order: [[col('verification_no'), 'DESC']],
  });
  let seq = 0;
  if (last?.verification_no) {
    const parts = last.verification_no.split('-');
    const num = parseInt(parts[1]?.slice(2), 10);
    if (!Number.isNaN(num)) seq = num;
  }
  const next = seq + 1;
  const padded = String(next).padStart(4, '0');
  return `${prefix}${padded}`; // e.g., 01-250001
}

function applyDocPathIfMissing(payload) {
  if (!payload.doc_scan_copy && payload.verification_no) {
    payload.doc_scan_copy = `${payload.verification_no}.pdf`;
  }
}

export async function listVerifications(params = {}) {
  const { q, status, enrollment_no, limit = 50, offset = 0 } = params;
  const where = {};
  if (status) where.status = status;
  if (enrollment_no) where.enrollment_no = enrollment_no;
  if (q) {
    const like = `%${q.toString().toLowerCase()}%`;
    where[Op.or] = [
      sqlWhere(fn('LOWER', col('verification_no')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('enrollment_no')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('studentname')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('fees_rec_no')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('ref_no')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('vryearautonumber')), { [Op.like]: like }),
    ];
  }

  // Order: final number desc (nulls last), then temp number desc (nulls last), then id desc
  const rows = await Verification.findAll({
    where,
    limit,
    offset,
    order: [
      [literal("CASE WHEN verification_no IS NULL OR verification_no = '' THEN 1 ELSE 0 END"), 'ASC'],
      ['verification_no', 'DESC'],
      [fn('COALESCE', col('vryearautonumber'), ''), 'DESC'],
      ['id', 'DESC'],
    ],
  });
  return rows;
}

export async function getVerification(id) {
  return Verification.findByPk(id);
}

export async function createVerification(payload) {
  const data = { ...payload };
  // If status is done and verification_no not provided, auto-generate
  if (data.status === 'done' && !data.verification_no) {
    data.verification_no = await generateNextVerificationNumber();
  }
  // If status is done and still missing a number, reject
  if (data.status === 'done' && !data.verification_no) {
    const err = new Error('verification_no required when status is done');
    err.status = 400;
    throw err;
  }
  applyDocPathIfMissing(data);
  return Verification.create(data);
}

export async function updateVerification(id, payload) {
  const row = await Verification.findByPk(id);
  if (!row) return null;
  const prev = row.toJSON();
  const data = { ...payload };
  // Auto-generate when moving to done if missing
  if (data.status === 'done' && !prev.verification_no && !data.verification_no) {
    data.verification_no = await generateNextVerificationNumber();
  }
  if ((data.status || prev.status) === 'done' && !(data.verification_no || prev.verification_no)) {
    const err = new Error('verification_no required when status is done');
    err.status = 400;
    throw err;
  }
  // If cancel, allow null verification_no (do not clear unless explicitly set)
  if (data.status === 'cancel' && data.verification_no === undefined) {
    // leave as-is
  }
  const next = { ...prev, ...data };
  applyDocPathIfMissing(next);
  await row.update(next);
  return row;
}

export default {
  listVerifications,
  getVerification,
  createVerification,
  updateVerification,
};
