import { Op, fn, col, where as sqlWhere } from 'sequelize';
import DocumentReceipt from '../models/document_receipt.mjs';
import Verification from '../models/verification.mjs';
import MigrationRequest from '../models/migration_request.mjs';
import ProvisionalRequest from '../models/provisional_request.mjs';
import InstitutionalVerification from '../models/institutional_verification.mjs';

function yearString(d = new Date()) { return String(d.getFullYear()); }

async function nextSeqFor(prefixCol, prefixString) {
  const last = await DocumentReceipt.findOne({
    where: sqlWhere(fn('LOWER', col(prefixCol)), { [Op.like]: `${prefixString.toLowerCase()}%` }),
    order: [[col(prefixCol), 'DESC']],
  });
  let seq = 0;
  if (last && last[prefixCol]) {
    const tail = last[prefixCol].match(/(\d{4})$/)?.[1];
    const n = parseInt(tail, 10); if (!Number.isNaN(n)) seq = n;
  }
  return String(seq + 1).padStart(4, '0');
}

async function ensureTempNumber(payload) {
  const year = yearString();
  switch (payload.doc_type) {
    case 'verification': {
      if (!payload.vryearautonumber) {
        const prefix = `vr${year}`;
        const seq = await nextSeqFor('vryearautonumber', prefix);
        payload.vryearautonumber = `${prefix}${seq}`;
      }
      break;
    }
    case 'migration': {
      if (!payload.mgyearautonumber) {
        const prefix = `mg${year}`;
        const seq = await nextSeqFor('mgyearautonumber', prefix);
        payload.mgyearautonumber = `${prefix}${seq}`;
      }
      break;
    }
    case 'provisional': {
      if (!payload.pryearautonumber) {
        const prefix = `pr${year}`;
        const seq = await nextSeqFor('pryearautonumber', prefix);
        payload.pryearautonumber = `${prefix}${seq}`;
      }
      break;
    }
    case 'institutional': {
      if (!payload.ivyearautonumber) {
        const prefix = `iv${year}`;
        const seq = await nextSeqFor('ivyearautonumber', prefix);
        payload.ivyearautonumber = `${prefix}${seq}`;
      }
      break;
    }
    case 'gtm': {
      if (!payload.gtmyearautonumber) {
        const prefix = `gtm${year}`;
        const seq = await nextSeqFor('gtmyearautonumber', prefix);
        payload.gtmyearautonumber = `${prefix}${seq}`;
      }
      break;
    }
    default: break;
  }
}

export async function listReceipts(params = {}) {
  const { q, doc_type, status, enrollment_no, limit = 50, offset = 0 } = params;
  const where = {};
  if (doc_type) where.doc_type = doc_type;
  if (status) where.status = status;
  if (enrollment_no) where.enrollment_no = enrollment_no;
  if (q) {
    const like = `%${q.toString().toLowerCase()}%`;
    where[Op.or] = [
      sqlWhere(fn('LOWER', col('enrollment_no')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('studentname')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('vryearautonumber')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('mgyearautonumber')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('pryearautonumber')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('ivyearautonumber')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('gtmyearautonumber')), { [Op.like]: like }),
    ];
  }
  return DocumentReceipt.findAll({ where, limit, offset, order: [['id','DESC']] });
}

export async function getReceipt(id) { return DocumentReceipt.findByPk(id); }

export async function createReceipt(payload) {
  const data = { ...payload };
  await ensureTempNumber(data);
  const rec = await DocumentReceipt.create(data);
  // If verification type, create a linked verification entry as in-progress
  if (rec.doc_type === 'verification') {
    try {
      await Verification.create({
        doc_rec_date: rec.doc_rec_date,
        enrollment_no: rec.enrollment_no,
        studentname: rec.studentname,
        fees_rec_no: rec.prrec_no || rec.mgrec_no || rec.ivrec_no || null,
        no_of_transcript: rec.no_of_transcript,
        no_of_marksheet_set: rec.no_of_marksheet_set,
        no_of_degree: rec.no_of_degree,
        no_of_moi: rec.no_of_moi,
        no_of_backlog: rec.no_of_backlog,
        is_eca: rec.is_eca,
        eca_agency: rec.eca_agency,
        eca_agency_other: rec.eca_agency_other,
        eca_remark: rec.eca_remark,
        vryearautonumber: rec.vryearautonumber,
        status: 'in-progress',
      });
    } catch (e) {
      // Fallback if enum doesn't include 'in-progress' yet
      try {
        await Verification.create({
          doc_rec_date: rec.doc_rec_date,
          enrollment_no: rec.enrollment_no,
          studentname: rec.studentname,
          fees_rec_no: rec.prrec_no || rec.mgrec_no || rec.ivrec_no || null,
          no_of_transcript: rec.no_of_transcript,
          no_of_marksheet_set: rec.no_of_marksheet_set,
          no_of_degree: rec.no_of_degree,
          no_of_moi: rec.no_of_moi,
          no_of_backlog: rec.no_of_backlog,
          is_eca: rec.is_eca,
          eca_agency: rec.eca_agency,
          eca_agency_other: rec.eca_agency_other,
          eca_remark: rec.eca_remark,
          vryearautonumber: rec.vryearautonumber,
          status: 'pending',
        });
      } catch (_) {
        // swallow - do not block receipt creation
      }
    }
  }
  // If migration type, create in pending
  if (rec.doc_type === 'migration') {
    try {
      await MigrationRequest.create({
        doc_rec_date: rec.doc_rec_date,
        enrollment_no: rec.enrollment_no,
        studentname: rec.studentname,
        pryearautonumber: rec.mgyearautonumber,
        status: 'pending',
      });
    } catch (_) { /* ignore */ }
  }
  // If provisional type, create in pending
  if (rec.doc_type === 'provisional') {
    try {
      await ProvisionalRequest.create({
        doc_rec_date: rec.doc_rec_date,
        enrollment_no: rec.enrollment_no,
        studentname: rec.studentname,
        pryearautonumber: rec.pryearautonumber,
        status: 'pending',
      });
    } catch (_) { /* ignore */ }
  }
  // If institutional type, create in pending
  if (rec.doc_type === 'institutional') {
    try {
      await InstitutionalVerification.create({
        doc_rec_date: rec.doc_rec_date,
        ivyearautonumber: rec.ivyearautonumber,
        institution_name: rec.institution_name,
        address1: rec.address1,
        address2: rec.address2,
        address3: rec.address3,
        city: rec.city,
        pincode: rec.pincode,
        mobile: rec.mobile,
        email: rec.email,
        payment_receipt_no: rec.ivrec_no,
        enrollment_no: rec.enrollment_no,
        studentname: rec.studentname,
        status: 'pending',
      });
    } catch (_) { /* ignore */ }
  }
  return rec;
}

export async function updateReceipt(id, payload) {
  const row = await DocumentReceipt.findByPk(id); if (!row) return null;
  const prev = row.toJSON(); const data = { ...payload };
  // Keep existing temp number; do not overwrite unless new one provided
  const next = { ...prev, ...data };
  await row.update(next);
  // Sync to Verification if type is verification
  if (row.doc_type === 'verification') {
    const where = { vryearautonumber: row.vryearautonumber };
    const found = await Verification.findOne({ where });
    const payloadV = {
      doc_rec_date: row.doc_rec_date,
      enrollment_no: row.enrollment_no,
      studentname: row.studentname,
      fees_rec_no: row.prrec_no || row.mgrec_no || row.ivrec_no || null,
      no_of_transcript: row.no_of_transcript,
      no_of_marksheet_set: row.no_of_marksheet_set,
      no_of_degree: row.no_of_degree,
      no_of_moi: row.no_of_moi,
      no_of_backlog: row.no_of_backlog,
      is_eca: row.is_eca,
      eca_agency: row.eca_agency,
      eca_agency_other: row.eca_agency_other,
      eca_remark: row.eca_remark,
      vryearautonumber: row.vryearautonumber,
    };
    if (found) {
      try { await found.update(payloadV); } catch (_) { /* ignore */ }
    } else {
      try { await Verification.create({ ...payloadV, status: 'in-progress' }); }
      catch (e) { try { await Verification.create({ ...payloadV, status: 'pending' }); } catch (_) { /* ignore */ } }
    }
  }
  // Sync migration
  if (row.doc_type === 'migration') {
    try {
      const where = { pryearautonumber: row.mgyearautonumber };
      const found = await MigrationRequest.findOne({ where });
      const payloadM = {
        doc_rec_date: row.doc_rec_date,
        enrollment_no: row.enrollment_no,
        studentname: row.studentname,
        pryearautonumber: row.mgyearautonumber,
      };
      if (found) await found.update(payloadM); else await MigrationRequest.create({ ...payloadM, status: 'pending' });
    } catch (_) { /* ignore */ }
  }
  // Sync provisional
  if (row.doc_type === 'provisional') {
    try {
      const where = { pryearautonumber: row.pryearautonumber };
      const found = await ProvisionalRequest.findOne({ where });
      const payloadP = {
        doc_rec_date: row.doc_rec_date,
        enrollment_no: row.enrollment_no,
        studentname: row.studentname,
        pryearautonumber: row.pryearautonumber,
      };
      if (found) await found.update(payloadP); else await ProvisionalRequest.create({ ...payloadP, status: 'pending' });
    } catch (_) { /* ignore */ }
  }
  // Sync institutional
  if (row.doc_type === 'institutional') {
    try {
      const where = { ivyearautonumber: row.ivyearautonumber };
      const found = await InstitutionalVerification.findOne({ where });
      const payloadI = {
        doc_rec_date: row.doc_rec_date,
        ivyearautonumber: row.ivyearautonumber,
        institution_name: row.institution_name,
        address1: row.address1,
        address2: row.address2,
        address3: row.address3,
        city: row.city,
        pincode: row.pincode,
        mobile: row.mobile,
        email: row.email,
        payment_receipt_no: row.ivrec_no,
        enrollment_no: row.enrollment_no,
        studentname: row.studentname,
      };
      if (found) await found.update(payloadI); else await InstitutionalVerification.create({ ...payloadI, status: 'pending' });
    } catch (_) { /* ignore */ }
  }
  return row;
}

export default { listReceipts, getReceipt, createReceipt, updateReceipt };
