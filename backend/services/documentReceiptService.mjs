import { Op, fn, col, where as sqlWhere } from 'sequelize';
import DocumentReceipt from '../models/document_receipt.mjs';
import Verification from '../models/verification.mjs';

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
    await Verification.create({
      doc_rec_date: rec.doc_rec_date,
      enrollment_no: rec.enrollment_no,
      studentname: rec.studentname,
      no_of_transcript: rec.no_of_transcript,
      no_of_marksheet_set: rec.no_of_marksheet_set,
      no_of_degree: rec.no_of_degree,
      no_of_moi: rec.no_of_moi,
      no_of_backlog: rec.no_of_backlog,
      vryearautonumber: rec.vryearautonumber,
      status: 'in-progress',
    });
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
      no_of_transcript: row.no_of_transcript,
      no_of_marksheet_set: row.no_of_marksheet_set,
      no_of_degree: row.no_of_degree,
      no_of_moi: row.no_of_moi,
      no_of_backlog: row.no_of_backlog,
      vryearautonumber: row.vryearautonumber,
    };
    if (found) {
      await found.update(payloadV);
    } else {
      await Verification.create({ ...payloadV, status: 'in-progress' });
    }
  }
  return row;
}

export default { listReceipts, getReceipt, createReceipt, updateReceipt };
