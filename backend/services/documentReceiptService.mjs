import { Op, fn, col, where as sqlWhere } from 'sequelize';
import DocRec from '../models/docrec/doc_rec.mjs';
import Verification from '../models/docrec/verification.mjs';
import InstVerificationMain from '../models/docrec/inst_verification_main.mjs';

// Helper: build a unified pay receipt number string for child rows
function composePayRecNo(prefix, number) {
  const a = String(prefix || '').trim();
  const b = String(number || '').trim();
  return (a + b) || null;
}

export async function listReceipts(params = {}) {
  const { q, apply_for, limit = 50, offset = 0 } = params;
  const where = {};
  if (apply_for) where.apply_for = apply_for;
  if (q) {
    const like = `%${q.toString().toLowerCase()}%`;
    where[Op.or] = [
      sqlWhere(fn('LOWER', col('doc_rec_id')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('apply_for')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('pay_rec_no')), { [Op.like]: like }),
    ];
  }
  const rows = await DocRec.findAll({ where, limit, offset, order: [['id','DESC']] });
  return rows;
}

export async function getReceipt(id) { return DocRec.findByPk(id); }

function _prefixForApply(apply_for) {
  const map = { VR: 'vr', IV: 'iv', PR: 'pr', MG: 'mg', GT: 'gt' };
  return map[String(apply_for || '').toUpperCase()] || 'vr';
}

function _twoDigitYear(d) {
  const dt = d ? new Date(d) : new Date();
  return String(dt.getFullYear()).slice(-2);
}

export async function getNextDocRecId(params = {}) {
  const apply = String(params.apply_for || '').toUpperCase();
  const yy = _twoDigitYear(params.doc_rec_date);
  const prefix = _prefixForApply(apply);
  const pattern = `${prefix}_${yy}_`;
  const last = await DocRec.findOne({
    where: {
      apply_for: apply,
      doc_rec_id: { [Op.iLike]: `${pattern}%` },
    },
    order: [[col('doc_rec_id'), 'DESC']],
  });
  let seq = 0;
  if (last?.doc_rec_id) {
    const m = last.doc_rec_id.match(/_(\d{4})$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n)) seq = n;
    }
  }
  const next = String(seq + 1).padStart(4, '0');
  return { next_id: `${pattern}${next}` };
}

export async function createReceipt(payload) {
  const data = { ...payload };
  // Validate minimal
  const apply = String(data.apply_for || '').toUpperCase();
  if (!data.doc_rec_id) {
    // Auto-generate if not provided
    const gen = await getNextDocRecId({ apply_for: apply, doc_rec_date: data.doc_rec_date });
    data.doc_rec_id = gen.next_id;
  }
  if (!apply || !['VR','IV','PR','MG','GT'].includes(apply)) { const e = new Error('apply_for must be one of VR, IV, PR, MG, GT'); e.status = 400; throw e; }
  if (!data.pay_by) { const e = new Error('pay_by is required'); e.status = 400; throw e; }

  const rec = await DocRec.create({
    doc_rec_date: data.doc_rec_date || null,
    apply_for: apply,
    doc_rec_id: data.doc_rec_id,
    pay_by: data.pay_by,
    pay_rec_no_pre: data.pay_by === 'NA' ? null : (data.pay_rec_no_pre || null),
    pay_rec_no: data.pay_by === 'NA' ? null : (data.pay_rec_no || null),
    pay_amount: data.pay_by === 'NA' ? 0 : Number(data.pay_amount || 0),
    enrollment_no: data.enrollment_id || data.enrollment_no || null,
    student_name: data.student_name || null,
    doc_rec_remark: data.doc_rec_remark || null,
  });

  // Create child row for Verification (VR)
  if (apply === 'VR') {
    const status = 'IN_PROGRESS';
    await Verification.create({
      doc_rec_date: rec.doc_rec_date || new Date(),
      doc_rec_id: rec.doc_rec_id,
      enrollment_no: data.enrollment_id || data.enrollment_no,
      second_enrollment_id: data.second_enrollment_id || null,
      student_name: data.student_name,
      no_of_transcript: Number(data.no_of_transcript || 0),
      no_of_marksheet: Number(data.no_of_marksheet || 0),
      no_of_degree: Number(data.no_of_degree || 0),
      no_of_moi: Number(data.no_of_moi || 0),
      no_of_backlog: Number(data.no_of_backlog || 0),
      pay_rec_no: composePayRecNo(rec.pay_rec_no_pre, rec.pay_rec_no),
      status,
      eca_required: !!data.eca_required,
    });
  }

  // Create child row for Institutional Verification (IV)
  if (apply === 'IV') {
    await InstVerificationMain.create({
      doc_rec_id: rec.doc_rec_id,
      inst_veri_date: rec.doc_rec_date || null,
      rec_inst_name: data.rec_inst_name || null,
      doc_rec_date: rec.doc_rec_date || null,
    });
  }

  return rec;
}

export async function updateReceipt(id, payload) {
  const row = await DocRec.findByPk(id); if (!row) return null;
  const prev = row.toJSON();
  const next = { ...prev };
  if (payload.doc_rec_date !== undefined) next.doc_rec_date = payload.doc_rec_date;
  if (payload.pay_by !== undefined) next.pay_by = payload.pay_by;
  if (payload.pay_by === 'NA') {
    next.pay_rec_no_pre = null; next.pay_rec_no = null; next.pay_amount = 0;
  } else {
    if (payload.pay_rec_no_pre !== undefined) next.pay_rec_no_pre = payload.pay_rec_no_pre;
    if (payload.pay_rec_no !== undefined) next.pay_rec_no = payload.pay_rec_no;
    if (payload.pay_amount !== undefined) next.pay_amount = Number(payload.pay_amount || 0);
  }
  if (payload.enrollment_id !== undefined || payload.enrollment_no !== undefined) {
    next.enrollment_no = payload.enrollment_id || payload.enrollment_no || null;
  }
  if (payload.student_name !== undefined) next.student_name = payload.student_name || null;
  if (payload.doc_rec_remark !== undefined) next.doc_rec_remark = payload.doc_rec_remark || null;
  await row.update(next);
  return row;
}

export default { listReceipts, getReceipt, createReceipt, updateReceipt };
