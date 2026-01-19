import { Op, fn, col, where as sqlWhere, literal } from 'sequelize';
import Verification from '../models/docrec/verification.mjs';

// Note: docrec verification model uses fields like:
// - final_no (instead of verification_no)
// - doc_rec_id (instead of vryearautonumber)
// - student_name, enrollment_no
// - status enum: IN_PROGRESS, PENDING, CORRECTION, CANCEL, DONE

export async function listVerifications(params = {}) {
  const { q, status, enrollment_no, vryearautonumber, limit = 50, offset = 0 } = params;
  const where = {};
  if (status) {
    const map = { 'in-progress': 'IN_PROGRESS', pending: 'PENDING', done: 'DONE', cancel: 'CANCEL', correction: 'CORRECTION' };
    where.status = map[String(status).toLowerCase()] || status;
  }
  if (vryearautonumber) where.doc_rec_id = vryearautonumber;
  if (enrollment_no) {
    // docrec stores enrollment in enrollment_no/second_enrollment_id
    where[Op.or] = [
      { enrollment_no: enrollment_no },
      { second_enrollment_id: enrollment_no },
    ];
  }
  if (q) {
    const like = `%${q.toString().toLowerCase()}%`;
    where[Op.or] = [
      sqlWhere(fn('LOWER', col('final_no')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('enrollment_id')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('student_name')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('pay_rec_no')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('doc_rec_id')), { [Op.like]: like }),
    ];
  }
  const rows = await Verification.findAll({
    where,
    limit,
    offset,
    order: [
      [literal("CASE WHEN final_no IS NULL OR final_no = '' THEN 1 ELSE 0 END"), 'ASC'],
      ['final_no', 'DESC'],
      [fn('COALESCE', col('doc_rec_id'), ''), 'DESC'],
      ['id', 'DESC'],
    ],
  });
  // Shape for frontend compatibility
  return rows.map((r) => {
    const o = r.toJSON();
    return {
      ...o,
      verification_no: o.final_no || null,
      vryearautonumber: o.doc_rec_id || null,
      enrollment_no: o.enrollment_no || null,
      studentname: o.student_name || null,
      remark: o.vr_remark || null,
      status: (o.status || '').toString().toLowerCase() || o.status,
    };
  });
}

export async function getVerification(id) {
  const row = await Verification.findByPk(id);
  if (!row) return null;
  const o = row.toJSON();
  return {
    ...o,
    verification_no: o.final_no || null,
    vryearautonumber: o.doc_rec_id || null,
    enrollment_no: o.enrollment_no || null,
    studentname: o.student_name || null,
    remark: o.vr_remark || null,
    status: (o.status || '').toString().toLowerCase() || o.status,
  };
}

export async function createVerification(_payload) {
  // Not implemented against docrec model (needs full mapping). Keep placeholder.
  const err = new Error('Not implemented');
  err.status = 501; throw err;
}

export async function updateVerification() {
  const err = new Error('Not implemented');
  err.status = 501; throw err;
}

export default {
  listVerifications,
  getVerification,
  createVerification,
  updateVerification,
};
