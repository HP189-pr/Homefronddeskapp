import { InstLetterMain, InstLetterStudent } from '../models/docrec/instLetter.mjs';
import DocRec from '../models/docrec/doc_rec.mjs';
import { Op, fn, col, where as sqlWhere } from 'sequelize';
import PDFDocument from 'pdfkit';

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

function normalizeDocRecInputs(payload = {}) {
  const docRecIds = [];
  const rawDocRecs = payload?.doc_recs ?? payload?.doc_rec ?? [];

  if (typeof rawDocRecs === 'string') {
    const value = rawDocRecs.trim();
    if (value) docRecIds.push(value);
  } else if (Array.isArray(rawDocRecs) || rawDocRecs instanceof Set) {
    for (const entry of rawDocRecs) {
      if (entry == null) continue;
      const value = String(entry).trim();
      if (value) docRecIds.push(value);
    }
  } else if (rawDocRecs != null) {
    const value = String(rawDocRecs).trim();
    if (value) docRecIds.push(value);
  }

  return docRecIds;
}

function normalizeIvInputs(payload = {}) {
  const values = [];
  const one = payload?.iv_record_no;
  const many = payload?.iv_record_nos;

  if (one !== undefined && one !== null && String(one).trim() !== '') values.push(one);
  if (Array.isArray(many) || many instanceof Set) {
    for (const value of many) values.push(value);
  } else if (many !== undefined && many !== null && String(many).trim() !== '') {
    values.push(many);
  }

  const ivRecordNos = [];
  for (const raw of values) {
    const parsed = Number.parseInt(String(raw).trim(), 10);
    if (Number.isFinite(parsed)) ivRecordNos.push(parsed);
  }
  return ivRecordNos;
}

function renderLetterPdf(groups = []) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const drawTableHeader = (y, credentialHeader = 'Type of Credential') => {
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('No.', 42, y, { width: 28 });
      doc.text('Candidate Name', 72, y, { width: 155 });
      doc.text('Enrollment Number', 232, y, { width: 120 });
      doc.text('Branch', 357, y, { width: 110 });
      doc.text(credentialHeader, 472, y, { width: 90, align: 'left' });
      doc.moveTo(40, y + 14).lineTo(555, y + 14).stroke('#BBBBBB');
      return y + 20;
    };

    const ensureY = (nextY, minBottom = 90) => {
      if (nextY < doc.page.height - minBottom) return nextY;
      doc.addPage();
      return 40;
    };

    groups.forEach((group, index) => {
      const main = group.main || {};
      const students = group.students || [];

      if (index > 0) doc.addPage();

      doc.font('Helvetica-Bold').fontSize(12);
      const refText = main.inst_veri_number ? `Ref: KSV/${main.inst_veri_number}` : 'Ref: N/A';
      doc.text(refText, 40, 45, { width: 280, align: 'left' });
      doc.text(main.inst_veri_date || '', 360, 45, { width: 195, align: 'right' });

      doc.font('Helvetica').fontSize(11);
      const rightHeader = ['Office of the Registrar,', 'Kadi Sarva Vishwavidyalaya,', 'Sector -15,', 'Gandhinagar- 382015'];
      let hy = 65;
      rightHeader.forEach((line) => {
        doc.text(line, 330, hy, { width: 225, align: 'right' });
        hy += 16;
      });

      let y = 138;
      const address = [
        main.rec_inst_name,
        main.rec_inst_address_1,
        main.rec_inst_address_2,
        [main.rec_inst_location, main.rec_inst_city].filter(Boolean).join(', '),
      ].filter(Boolean);
      if (main.rec_inst_pin) {
        const last = address[address.length - 1] || '';
        address[address.length - 1] = last ? `${last}-${main.rec_inst_pin}` : String(main.rec_inst_pin);
      }
      address.forEach((line, idx) => {
        doc.font(idx === 0 ? 'Helvetica-Bold' : 'Helvetica').text(String(line), 40, y);
        y += 16;
      });

      y += 10;
      const docTypes = main.doc_types || 'Certificate';
      const docLabel = String(docTypes).toLowerCase().includes('certificate') ? docTypes : `${docTypes} Certificate`;
      doc.font('Helvetica').text(`Sub: Educational Verification of ${docLabel}.`, 70, y);
      y += 18;

      let refLine = 'Ref: Your Ref';
      if (main.inst_ref_no) refLine += ` ${main.inst_ref_no}`;
      if (main.rec_by) refLine += ` ${main.rec_by}`;
      if (main.ref_date) refLine += ` Dated on ${main.ref_date}`;
      doc.text(refLine, 70, y);
      y += 24;

      doc.text(
        'Regarding the subject and reference mentioned above, we confirm that upon verification, the documents pertaining to the candidate(s) have been examined and found valid as per university records.',
        40,
        y,
        { width: 515, align: 'justify' }
      );
      y = doc.y + 14;

      const credentialHeader =
        students.find((row) => row?.type_of_credential)?.type_of_credential || 'Type of Credential';
      y = ensureY(y, 120);
      y = drawTableHeader(y, credentialHeader);

      if (!students.length) {
        y = ensureY(y, 110);
        doc.font('Helvetica').fontSize(10).text('No student records found', 72, y, { width: 400 });
        y += 18;
      } else {
        students.forEach((student, idx) => {
          y = ensureY(y, 120);
          const no = String(idx + 1);
          const name = student?.student_name || '';
          const enrollment = student?.enrollment_no || student?.enrollment_no_text || '';
          const branch = student?.iv_degree_name || student?.branch || '';
          const credential = student?.month_year || student?.type_of_credential || '';

          doc.font('Helvetica').fontSize(10);
          doc.text(no, 42, y, { width: 28 });
          doc.text(String(name), 72, y, { width: 155 });
          doc.text(String(enrollment), 232, y, { width: 120 });
          doc.text(String(branch), 357, y, { width: 110 });
          doc.text(String(credential), 472, y, { width: 90 });
          const rowBottom = Math.max(doc.y, y + 14);
          doc.moveTo(40, rowBottom + 2).lineTo(555, rowBottom + 2).stroke('#E3E3E3');
          y = rowBottom + 8;
        });
      }

      y = ensureY(y + 4, 100);
      doc.font('Helvetica').fontSize(11);
      doc.text('Remark: The above record has been verified and found correct as per university records.', 40, y, {
        width: 515,
      });
      y = doc.y + 14;
      doc.text(
        'Should you require any additional information or have further inquiries, please feel free to contact us.',
        40,
        y,
        { width: 515 }
      );
      y = doc.y + 32;
      doc.font('Helvetica-Bold').text('Registrar\nKadi Sarva Vishwavidyalaya', 40, y);

      doc.font('Helvetica').fontSize(9).text('Email: verification@ksv.ac.in | Contact: 9408801690 / 079-23244690', 40, 810, {
        width: 515,
        align: 'center',
      });
    });

    doc.end();
  });
}

export async function generateInstLetterPdf(payload = {}) {
  const docRecIds = normalizeDocRecInputs(payload);
  const ivRecordNos = normalizeIvInputs(payload);

  if (ivRecordNos.length) {
    const mains = await InstLetterMain.findAll({
      where: { iv_record_no: { [Op.in]: ivRecordNos } },
      attributes: ['doc_rec_id', 'iv_record_no'],
    });
    for (const row of mains) {
      const docRecId = row?.doc_rec_id ? String(row.doc_rec_id).trim() : '';
      if (docRecId) docRecIds.push(docRecId);
    }
  }

  const uniqueDocRecIds = [...new Set(docRecIds.filter(Boolean))];
  if (!uniqueDocRecIds.length) {
    const error = new Error(
      ivRecordNos.length
        ? 'Unable to resolve the provided iv_record_no values to DocRec IDs'
        : 'Provide at least one doc_rec / doc_recs or iv_record_no(s) entry to generate the letter'
    );
    error.statusCode = ivRecordNos.length ? 404 : 400;
    throw error;
  }

  const mains = await InstLetterMain.findAll({
    where: { doc_rec_id: { [Op.in]: uniqueDocRecIds } },
    order: [['id', 'DESC']],
  });
  const students = await InstLetterStudent.findAll({
    where: { doc_rec_id: { [Op.in]: uniqueDocRecIds } },
    order: [['sr_no', 'ASC'], ['id', 'ASC']],
  });

  const studentsByDocRec = new Map();
  for (const row of students) {
    const key = String(row.doc_rec_id || '');
    if (!studentsByDocRec.has(key)) studentsByDocRec.set(key, []);
    studentsByDocRec.get(key).push(row.toJSON ? row.toJSON() : row);
  }

  const grouped = new Map();
  for (const mainRow of mains) {
    const main = mainRow.toJSON ? mainRow.toJSON() : mainRow;
    const groupKey = String(main.inst_veri_number || main.doc_rec_id || '');
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        main,
        students: [],
      });
    }
    const group = grouped.get(groupKey);
    const sourceStudents = studentsByDocRec.get(String(main.doc_rec_id || '')) || [];
    group.students.push(...sourceStudents);
  }

  const groups = [...grouped.values()].filter((item) => item.main);
  if (!groups.length) {
    const error = new Error('Ensure the supplied doc_rec or iv_record_no values exist and have associated InstLetterMain data');
    error.statusCode = 404;
    throw error;
  }

  for (const group of groups) {
    const seen = new Set();
    group.students = group.students.filter((student) => {
      const key = String(student.id || student.enrollment_no || student.enrollment_no_text || JSON.stringify(student));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const pdfBuffer = await renderLetterPdf(groups);
  const filename = groups.length === 1
    ? `Verification_${groups[0]?.main?.inst_veri_number || uniqueDocRecIds[0]}.pdf`
    : `Verification_Multiple_Records_${uniqueDocRecIds[0] || 'batch'}.pdf`;

  return {
    buffer: pdfBuffer,
    filename,
    count: groups.length,
  };
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
  generateInstLetterPdf,
};
