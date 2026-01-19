import { Op, fn, col, where as sqlWhere } from 'sequelize';
import InstVerificationMain from '../models/docrec/inst_verification_main.mjs';
import InstVerificationStudent from '../models/docrec/inst_verification_student.mjs';

function twoDigitYear(d = new Date()) { return String(d.getFullYear()).slice(-2); }

async function generateNextInstitutionalNumber() {
  const yy = twoDigitYear();
  const prefix = `02-${yy}`;
  const last = await InstVerificationMain.findOne({
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
  const includeWhere = {};
  const include = [{ model: InstVerificationStudent, as: 'students', required: false, where: includeWhere }];

  // Map filters to new schema
  if (ivyearautonumber) where.doc_rec_id = ivyearautonumber;
  if (enrollment_no) includeWhere.enrollment_no = enrollment_no;
  if (status) {
    const map = { pending: 'PENDING', done: 'DONE', cancel: 'CANCEL', correction: 'CORRECTION', 'in-progress': 'IN_PROGRESS', fake: 'PENDING' };
    includeWhere.verification_status = map[String(status).toLowerCase()] || status;
  }
  if (q) {
    const like = `%${q.toString().toLowerCase()}%`;
    where[Op.or] = [
      sqlWhere(fn('LOWER', col('inst_veri_number')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('rec_inst_name')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('rec_inst_city')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('doc_rec_id')), { [Op.like]: like }),
    ];
    // Also allow search on child fields via include.where OR conditions
    includeWhere[Op.or] = [
      sqlWhere(fn('LOWER', col('students.enrollment_no')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('students.student_name')), { [Op.like]: like }),
    ];
  }
  const rows = await InstVerificationMain.findAll({ where, include, subQuery: false, limit, offset, order: [['id','DESC']] });
  // Shape response for frontend compatibility
  return rows.map((r) => {
    const row = r.toJSON();
    const first = Array.isArray(row.students) && row.students.length ? row.students[0] : null;
    return {
      ...row,
      institutional_verification_number: row.inst_veri_number,
      ivyearautonumber: row.doc_rec_id,
      enrollment_no: first?.enrollment_no || null,
      studentname: first?.student_name || null,
      status: (first?.verification_status || '').toString().toLowerCase() || '',
    };
  });
}

export async function getInstitutional(id) {
  const row = await InstVerificationMain.findByPk(id, { include: [{ model: InstVerificationStudent, as: 'students' }] });
  if (!row) return null;
  const data = row.toJSON();
  const first = Array.isArray(data.students) && data.students.length ? data.students[0] : null;
  return {
    ...data,
    institutional_verification_number: data.inst_veri_number,
    ivyearautonumber: data.doc_rec_id,
    enrollment_no: first?.enrollment_no || null,
    studentname: first?.student_name || null,
    status: (first?.verification_status || '').toString().toLowerCase() || '',
  };
}

export async function createInstitutional(payload) {
  const data = { ...payload };
  // Map fields from old payload to new main
  const main = {
    doc_rec_id: data.ivyearautonumber || data.doc_rec_id || null,
    inst_veri_number: data.institutional_verification_number || null,
    inst_veri_date: data.doc_rec_date || null,
    rec_inst_name: data.institution_name || null,
    rec_inst_address_1: data.address1 || null,
    rec_inst_address_2: data.address2 || null,
    rec_inst_location: data.address3 || null,
    rec_inst_city: data.city || null,
    rec_inst_pin: data.pincode || null,
    rec_inst_email: data.email || null,
    doc_rec_date: data.doc_rec_date || null,
    inst_ref_no: data.inst_ref_no || null,
    ref_date: data.mail_or_post_date || null,
  };
  // Generate number if requested similar to previous logic
  if ((data.status === 'done' || data.status === 'DONE') && !main.inst_veri_number) {
    main.inst_veri_number = await generateNextInstitutionalNumber();
  }
  const created = await InstVerificationMain.create(main);
  // Optional: create one student row if provided
  if (data.enrollment_no || data.studentname) {
    const statusMap = { pending: 'PENDING', done: 'DONE', cancel: 'CANCEL', correction: 'CORRECTION', 'in-progress': 'IN_PROGRESS', fake: 'PENDING' };
    await InstVerificationStudent.create({
      doc_rec_id: main.doc_rec_id,
      sr_no: 1,
      enrollment_no: data.enrollment_no || null,
      student_name: data.studentname || null,
      verification_status: statusMap[String(data.status || '').toLowerCase()] || 'PENDING',
    });
  }
  // Return shaped
  const full = await InstVerificationMain.findByPk(created.id, { include: [{ model: InstVerificationStudent, as: 'students' }] });
  const r = full.toJSON();
  const first = Array.isArray(r.students) && r.students.length ? r.students[0] : null;
  return {
    ...r,
    institutional_verification_number: r.inst_veri_number,
    ivyearautonumber: r.doc_rec_id,
    enrollment_no: first?.enrollment_no || null,
    studentname: first?.student_name || null,
    status: (first?.verification_status || '').toString().toLowerCase() || '',
  };
}

export async function updateInstitutional(id, payload) {
  const row = await InstVerificationMain.findByPk(id, { include: [{ model: InstVerificationStudent, as: 'students' }] });
  if (!row) return null;
  const prev = row.toJSON();
  const data = { ...payload };
  const nextMain = {
    ...prev,
    inst_veri_number: data.institutional_verification_number ?? prev.inst_veri_number,
    inst_veri_date: data.doc_rec_date ?? prev.inst_veri_date,
    rec_inst_name: data.institution_name ?? prev.rec_inst_name,
    rec_inst_address_1: data.address1 ?? prev.rec_inst_address_1,
    rec_inst_address_2: data.address2 ?? prev.rec_inst_address_2,
    rec_inst_location: data.address3 ?? prev.rec_inst_location,
    rec_inst_city: data.city ?? prev.rec_inst_city,
    rec_inst_pin: data.pincode ?? prev.rec_inst_pin,
    rec_inst_email: data.email ?? prev.rec_inst_email,
    doc_rec_date: data.doc_rec_date ?? prev.doc_rec_date,
  };
  if ((data.status === 'done' || data.status === 'DONE') && !nextMain.inst_veri_number) {
    nextMain.inst_veri_number = await generateNextInstitutionalNumber();
  }
  await row.update(nextMain);
  // Upsert primary student (sr_no 1)
  const statusMap = { pending: 'PENDING', done: 'DONE', cancel: 'CANCEL', correction: 'CORRECTION', 'in-progress': 'IN_PROGRESS', fake: 'PENDING' };
  const desired = {
    doc_rec_id: row.doc_rec_id,
    sr_no: 1,
    enrollment_no: data.enrollment_no ?? (prev.students?.[0]?.enrollment_no || null),
    student_name: data.studentname ?? (prev.students?.[0]?.student_name || null),
    verification_status: statusMap[String(data.status || (prev.students?.[0]?.verification_status || '')).toLowerCase()] || prev.students?.[0]?.verification_status || 'PENDING',
  };
  const existing = (prev.students || []).find((s) => s.sr_no === 1) || null;
  if (existing) {
    const srow = await InstVerificationStudent.findByPk(existing.id);
    if (srow) await srow.update(desired);
  } else {
    await InstVerificationStudent.create(desired);
  }
  const full = await InstVerificationMain.findByPk(id, { include: [{ model: InstVerificationStudent, as: 'students' }] });
  const r = full.toJSON();
  const first = Array.isArray(r.students) && r.students.length ? r.students[0] : null;
  return {
    ...r,
    institutional_verification_number: r.inst_veri_number,
    ivyearautonumber: r.doc_rec_id,
    enrollment_no: first?.enrollment_no || null,
    studentname: first?.student_name || null,
    status: (first?.verification_status || '').toString().toLowerCase() || '',
  };
}

export default { listInstitutionals, getInstitutional, createInstitutional, updateInstitutional };
