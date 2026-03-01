import { Op, fn, col, where as sqlWhere } from 'sequelize';
import DocRec from '../models/docrec/doc_rec.mjs';
import Verification from '../models/docrec/transcript.mjs';
import MigrationRequest from '../models/docrec/migration.mjs';
import ProvisionalRequest from '../models/docrec/provisional.mjs';
import { InstLetterMain, InstLetterStudent } from '../models/docrec/instLetter.mjs';

const DOCREC_SAFE_ATTRS = [
  'id',
  'apply_for',
  'doc_rec_id',
  'pay_by',
  'pay_rec_no_pre',
  'pay_rec_no',
  'pay_amount',
  'doc_rec_date',
  'created_by',
  'createdat',
  'updatedat',
];

const DOCREC_SAFE_UPDATE_FIELDS = [
  'doc_rec_date',
  'apply_for',
  'pay_by',
  'pay_rec_no_pre',
  'pay_rec_no',
  'pay_amount',
  'created_by',
];

function pickDocRecUpdatable(data = {}) {
  const out = {};
  for (const key of DOCREC_SAFE_UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      out[key] = data[key];
    }
  }
  return out;
}

// Helper: build a unified pay receipt number string for child rows
function composePayRecNo(prefix, number) {
  const a = String(prefix || '').trim();
  const b = String(number || '').trim();
  return (a + b) || null;
}

function normalizeToken(value) {
  return String(value || '').toLowerCase().replace(/[^0-9a-z]+/g, '');
}

function matchesToken(value, token) {
  if (!token) return true;
  return normalizeToken(value).includes(token);
}

export async function listReceipts(params = {}) {
  const {
    q,
    search,
    apply_for,
    student_no,
    enrollment_no,
    temp_enroll_no,
    limit = 50,
    offset = 0,
  } = params;

  const where = {};
  if (apply_for) where.apply_for = apply_for;

  const searchText = String(search || q || '').trim();
  if (searchText) {
    const like = `%${searchText.toString().toLowerCase()}%`;
    where[Op.or] = [
      sqlWhere(fn('LOWER', col('doc_rec_id')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('apply_for')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('pay_rec_no')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('pay_rec_no_pre')), { [Op.like]: like }),
    ];
  }

  const studentToken = normalizeToken(student_no || enrollment_no || temp_enroll_no);
  if (studentToken) {
    const docrecIds = new Set();

    const [verRows, mgRows, prvRows, ivRows] = await Promise.all([
      Verification.findAll({ attributes: ['doc_rec_id', 'enrollment_no', 'second_enrollment_id'] }),
      MigrationRequest.findAll({ attributes: ['doc_rec_id', 'enrollment_no'] }),
      ProvisionalRequest.findAll({ attributes: ['doc_rec_id', 'enrollment_no'] }),
      InstLetterStudent.findAll({ attributes: ['doc_rec_id', 'enrollment_no', 'enrollment_no_text'] }),
    ]);

    verRows.forEach((row) => {
      if (
        matchesToken(row.enrollment_no, studentToken) ||
        matchesToken(row.second_enrollment_id, studentToken)
      ) {
        if (row.doc_rec_id) docrecIds.add(row.doc_rec_id);
      }
    });

    mgRows.forEach((row) => {
      if (matchesToken(row.enrollment_no, studentToken)) {
        if (row.doc_rec_id) docrecIds.add(row.doc_rec_id);
      }
    });

    prvRows.forEach((row) => {
      if (matchesToken(row.enrollment_no, studentToken)) {
        if (row.doc_rec_id) docrecIds.add(row.doc_rec_id);
      }
    });

    ivRows.forEach((row) => {
      if (
        matchesToken(row.enrollment_no, studentToken) ||
        matchesToken(row.enrollment_no_text, studentToken)
      ) {
        if (row.doc_rec_id) docrecIds.add(row.doc_rec_id);
      }
    });

    if (!docrecIds.size) return [];
    where.doc_rec_id = { [Op.in]: [...docrecIds] };
  }

  const rows = await DocRec.findAll({
    attributes: DOCREC_SAFE_ATTRS,
    where,
    limit: Number(limit) || 50,
    offset: Number(offset) || 0,
    order: [['id', 'DESC']],
  });
  return rows;
}

export async function getReceipt(id) {
  return DocRec.findByPk(id, { attributes: DOCREC_SAFE_ATTRS });
}

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
    attributes: ['doc_rec_id'],
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
      tr_count: Number(data.no_of_transcript || data.tr_count || 0),
      ms_count: Number(data.no_of_marksheet || data.ms_count || 0),
      dg_count: Number(data.no_of_degree || data.dg_count || 0),
      moi_count: Number(data.no_of_moi || data.moi_count || 0),
      backlog_count: Number(data.no_of_backlog || data.backlog_count || 0),
      pay_rec_no: composePayRecNo(rec.pay_rec_no_pre, rec.pay_rec_no),
      status,
      eca_required: !!data.eca_required,
    });
  }

  // Create child row for Institutional Verification (IV)
  if (apply === 'IV') {
    await InstLetterMain.create({
      doc_rec_id: rec.doc_rec_id,
      inst_veri_date: rec.doc_rec_date || null,
      rec_inst_name: data.rec_inst_name || null,
      doc_rec_date: rec.doc_rec_date || null,
    });
  }

  return rec;
}

export async function updateReceipt(id, payload) {
  const row = await DocRec.findByPk(id, { attributes: DOCREC_SAFE_ATTRS }); if (!row) return null;
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
  const updateData = pickDocRecUpdatable(next);
  await row.update(updateData);
  return row;
}

export async function updateWithVerification(payload = {}, user = null) {
  const { doc_rec_id, doc_rec_data = {}, verification_data = {} } = payload;
  if (!doc_rec_id) {
    const e = new Error('doc_rec_id is required');
    e.status = 400;
    throw e;
  }

  const docrec = await DocRec.findOne({ where: { doc_rec_id }, attributes: DOCREC_SAFE_ATTRS });
  if (!docrec) {
    const e = new Error('DocRec not found');
    e.status = 404;
    throw e;
  }

  await docrec.update(pickDocRecUpdatable(doc_rec_data));

  const verification = await Verification.findOne({ where: { doc_rec_id } });
  if (verification) {
    const merged = { ...verification_data };
    if (user && user.id) merged.updatedby = user.id;
    await verification.update(merged);
  }

  return {
    detail: 'Updated successfully',
    doc_rec_id: docrec.doc_rec_id,
    verification_id: verification ? verification.id : null,
  };
}

export async function deleteWithVerification(payload = {}) {
  const { doc_rec_id } = payload;
  if (!doc_rec_id) {
    const e = new Error('doc_rec_id is required');
    e.status = 400;
    throw e;
  }

  const verificationCount = await Verification.destroy({ where: { doc_rec_id } });
  const docrec = await DocRec.findOne({ where: { doc_rec_id }, attributes: DOCREC_SAFE_ATTRS });
  if (!docrec) {
    const e = new Error('DocRec not found');
    e.status = 404;
    throw e;
  }
  await docrec.destroy();

  return {
    detail: 'Deleted successfully',
    doc_rec_id,
    verification_deleted: verificationCount > 0,
  };
}

export async function unifiedUpdate(payload = {}, user = null) {
  const { doc_rec_id, doc_rec: docRecData = {}, service: serviceData = {}, service_type } = payload;
  const type = String(service_type || '').trim().toUpperCase();

  if (!doc_rec_id) {
    const e = new Error('doc_rec_id is required');
    e.status = 400;
    throw e;
  }
  if (!['VR', 'PR', 'MG', 'IV'].includes(type)) {
    const e = new Error('service_type must be VR, PR, MG, or IV');
    e.status = 400;
    throw e;
  }

  const docrec = await DocRec.findOne({ where: { doc_rec_id }, attributes: DOCREC_SAFE_ATTRS });
  if (!docrec) {
    const e = new Error('DocRec not found');
    e.status = 404;
    throw e;
  }
  await docrec.update(pickDocRecUpdatable(docRecData));

  let serviceObj = null;
  if (type === 'VR') {
    serviceObj = await Verification.findOne({ where: { doc_rec_id } });
    if (serviceObj) {
      const merged = { ...serviceData };
      if (user && user.id) merged.updatedby = user.id;
      await serviceObj.update(merged);
    }
  } else if (type === 'MG') {
    serviceObj = await MigrationRequest.findOne({ where: { doc_rec_id } });
    if (serviceObj) await serviceObj.update({ ...serviceData });
  } else if (type === 'PR') {
    serviceObj = await ProvisionalRequest.findOne({ where: { doc_rec_id } });
    if (serviceObj) await serviceObj.update({ ...serviceData });
  } else if (type === 'IV') {
    serviceObj = await InstLetterMain.findOne({ where: { doc_rec_id } });
    if (serviceObj) await serviceObj.update({ ...serviceData });
  }

  return {
    detail: 'Updated successfully',
    doc_rec_id: docrec.doc_rec_id,
    service_type: type,
    service_id: serviceObj ? serviceObj.id : null,
    service_found: !!serviceObj,
  };
}

export async function unifiedDelete(payload = {}) {
  const { doc_rec_id, service_type } = payload;
  const type = String(service_type || '').trim().toUpperCase();

  if (!doc_rec_id) {
    const e = new Error('doc_rec_id is required');
    e.status = 400;
    throw e;
  }
  if (!['VR', 'PR', 'MG', 'IV'].includes(type)) {
    const e = new Error('service_type must be VR, PR, MG, or IV');
    e.status = 400;
    throw e;
  }

  let serviceDeleted = false;
  if (type === 'VR') {
    serviceDeleted = (await Verification.destroy({ where: { doc_rec_id } })) > 0;
  } else if (type === 'MG') {
    serviceDeleted = (await MigrationRequest.destroy({ where: { doc_rec_id } })) > 0;
  } else if (type === 'PR') {
    serviceDeleted = (await ProvisionalRequest.destroy({ where: { doc_rec_id } })) > 0;
  } else if (type === 'IV') {
    await InstLetterStudent.destroy({ where: { doc_rec_id } });
    serviceDeleted = (await InstLetterMain.destroy({ where: { doc_rec_id } })) > 0;
  }

  const docrec = await DocRec.findOne({ where: { doc_rec_id }, attributes: DOCREC_SAFE_ATTRS });
  if (!docrec) {
    const e = new Error('DocRec not found');
    e.status = 404;
    throw e;
  }
  await docrec.destroy();

  return {
    detail: 'Deleted successfully',
    doc_rec_id,
    service_type: type,
    service_deleted: serviceDeleted,
  };
}

export default {
  listReceipts,
  getReceipt,
  createReceipt,
  updateReceipt,
  updateWithVerification,
  deleteWithVerification,
  unifiedUpdate,
  unifiedDelete,
};
