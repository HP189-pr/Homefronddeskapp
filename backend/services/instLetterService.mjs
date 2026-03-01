import { InstLetterMain, InstLetterStudent } from '../models/docrec/instLetter.mjs';
import DocRec from '../models/docrec/doc_rec.mjs';
import { Op, fn, col, where as sqlWhere } from 'sequelize';

export async function createLetter(payload = {}) {
  const { students, ...main } = payload;

  const record = await InstLetterMain.create(main);

  if (students?.length) {
    const rows = students.map((s) => ({ ...s, doc_rec_id: main.doc_rec_id }));
    await InstLetterStudent.bulkCreate(rows);
  }

  return record;
}

export async function getLetter(docRecId) {
  return InstLetterMain.findOne({
    where: { doc_rec_id: docRecId },
    include: [{ model: InstLetterStudent, as: 'students' }],
  });
}

export async function deleteLetter(docRecId) {
  await InstLetterStudent.destroy({ where: { doc_rec_id: docRecId } });
  return InstLetterMain.destroy({ where: { doc_rec_id: docRecId } });
}

export async function listInstVerificationMains(params = {}) {
  const { search, q, iv_record_no, inst_veri_number, doc_rec, limit = 50, ordering } = params;
  const where = {};

  if (iv_record_no) where.iv_record_no = Number(String(iv_record_no).replace(/\D/g, '')) || null;
  if (inst_veri_number) where.inst_veri_number = { [Op.iLike]: `%${inst_veri_number}%` };
  if (doc_rec) where.doc_rec_id = doc_rec;

  const text = String(search || q || '').trim();
  if (text) {
    const like = `%${text.toLowerCase()}%`;
    where[Op.or] = [
      sqlWhere(fn('LOWER', col('doc_rec_id')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('inst_veri_number')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('rec_inst_name')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('rec_inst_city')), { [Op.like]: like }),
    ];
  }

  const dir = String(ordering || '-id').startsWith('-') ? 'DESC' : 'ASC';
  const rows = await InstLetterMain.findAll({
    where,
    order: [['id', dir]],
    limit: Number(limit) || 50,
  });
  return rows;
}

export async function getInstVerificationMain(id) {
  return InstLetterMain.findByPk(id);
}

export async function createInstVerificationMain(payload = {}) {
  const body = { ...(payload || {}) };
  const doc_rec_id = body.doc_rec_key || body.doc_rec || body.doc_rec_id || null;
  const createPayload = {
    ...body,
    doc_rec_id,
  };
  delete createPayload.doc_rec;
  delete createPayload.doc_rec_key;
  return InstLetterMain.create(createPayload);
}

export async function updateInstVerificationMain(id, payload = {}) {
  const row = await InstLetterMain.findByPk(id);
  if (!row) return null;
  const body = { ...(payload || {}) };
  const doc_rec_id = body.doc_rec_key || body.doc_rec || body.doc_rec_id;
  if (doc_rec_id !== undefined) body.doc_rec_id = doc_rec_id;
  delete body.doc_rec;
  delete body.doc_rec_key;
  await row.update(body);
  return row;
}

export async function searchRecipientInstitutes(q = '') {
  const text = String(q || '').trim();
  if (text.length < 2) return [];
  const rows = await InstLetterMain.findAll({
    where: {
      rec_inst_name: { [Op.iLike]: `%${text}%` },
    },
    attributes: [
      'id',
      'rec_inst_name',
      'rec_inst_city',
      'rec_inst_address_1',
      'rec_inst_address_2',
      'rec_inst_location',
      'rec_inst_pin',
    ],
    limit: 20,
    order: [['id', 'DESC']],
  });

  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const o = row.toJSON();
    const key = String(o.rec_inst_name || '').toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: o.id,
      name: o.rec_inst_name,
      city: o.rec_inst_city,
      address: {
        rec_inst_address_1: o.rec_inst_address_1 || '',
        rec_inst_address_2: o.rec_inst_address_2 || '',
        rec_inst_location: o.rec_inst_location || '',
        rec_inst_city: o.rec_inst_city || '',
        rec_inst_pin: o.rec_inst_pin || '',
      },
    });
  }
  return out;
}

export async function suggestDocRecCandidates(params = {}) {
  const number = String(params.number || '').trim();
  if (!number) return { candidates: [] };
  const rows = await DocRec.findAll({
    where: {
      apply_for: 'IV',
      doc_rec_id: { [Op.iLike]: `%${number}%` },
    },
    attributes: ['doc_rec_id'],
    limit: 20,
    order: [['id', 'DESC']],
  });
  return { candidates: rows.map((r) => r.doc_rec_id).filter(Boolean) };
}

export async function listInstVerificationStudents(params = {}) {
  const { doc_rec, limit = 500 } = params;
  const where = {};
  if (doc_rec) where.doc_rec_id = doc_rec;
  return InstLetterStudent.findAll({ where, order: [['sr_no', 'ASC'], ['id', 'ASC']], limit: Number(limit) || 500 });
}

export async function createInstVerificationStudent(payload = {}) {
  const body = { ...(payload || {}) };
  const doc_rec_id = body.doc_rec_key || body.doc_rec || body.doc_rec_id || null;
  const enrollment_no = body.enrollment || body.enrollment_no || body.enrollment_no_text || null;
  const row = await InstLetterStudent.create({
    ...body,
    doc_rec_id,
    enrollment_no,
    enrollment_no_text: body.enrollment_no_text || enrollment_no,
  });
  return row;
}

export async function updateInstVerificationStudent(id, payload = {}) {
  const row = await InstLetterStudent.findByPk(id);
  if (!row) return null;
  const body = { ...(payload || {}) };
  const doc_rec_id = body.doc_rec_key || body.doc_rec || body.doc_rec_id;
  const enrollment_no = body.enrollment || body.enrollment_no || body.enrollment_no_text;
  if (doc_rec_id !== undefined) body.doc_rec_id = doc_rec_id;
  if (enrollment_no !== undefined) {
    body.enrollment_no = enrollment_no;
    body.enrollment_no_text = body.enrollment_no_text || enrollment_no;
  }
  delete body.doc_rec;
  delete body.doc_rec_key;
  await row.update(body);
  return row;
}

export async function deleteInstVerificationStudent(id) {
  const row = await InstLetterStudent.findByPk(id);
  if (!row) return false;
  await row.destroy();
  return true;
}

export default {
  createLetter,
  getLetter,
  deleteLetter,
  listInstVerificationMains,
  getInstVerificationMain,
  createInstVerificationMain,
  updateInstVerificationMain,
  searchRecipientInstitutes,
  suggestDocRecCandidates,
  listInstVerificationStudents,
  createInstVerificationStudent,
  updateInstVerificationStudent,
  deleteInstVerificationStudent,
};
