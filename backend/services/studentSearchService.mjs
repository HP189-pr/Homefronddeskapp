import { Op } from 'sequelize';
import { Enrollment } from '../models/enrollment.mjs';
import { StudentProfile } from '../models/student_profile.mjs';
import { Institute } from '../models/institute.mjs';
import { CourseMain } from '../models/course_main.mjs';
import { CourseSub } from '../models/course_sub.mjs';
import { Verification } from '../models/docrec/transcript.mjs';
import ProvisionalRequest from '../models/docrec/provisional.mjs';
import MigrationRequest from '../models/docrec/migration.mjs';
import { InstLetterStudent, InstLetterMain } from '../models/docrec/instLetter.mjs';
import { StudentDegree } from '../models/student_degree.mjs';

const SEARCH_CACHE_TTL_MS = Number(process.env.STUDENT_SEARCH_CACHE_TTL_MS || 60 * 1000);
const SEARCH_CACHE_MAX = Number(process.env.STUDENT_SEARCH_CACHE_MAX || 500);
const studentSearchCache = new Map();

function isMissingSchemaError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('does not exist') || msg.includes('unknown column');
}

async function safeOrFallback(run, fallback, scope) {
  try {
    return await run();
  } catch (err) {
    if (isMissingSchemaError(err)) {
      console.warn(`[student-search] ${scope} skipped: ${err.message}`);
      return fallback;
    }
    throw err;
  }
}

function cacheKey(rawQuery) {
  return String(rawQuery || '').trim().toLowerCase();
}

function pruneCache() {
  const now = Date.now();
  for (const [key, value] of studentSearchCache.entries()) {
    if (!value || value.expiresAt <= now) studentSearchCache.delete(key);
  }
  while (studentSearchCache.size > SEARCH_CACHE_MAX) {
    const first = studentSearchCache.keys().next().value;
    if (!first) break;
    studentSearchCache.delete(first);
  }
}

function getCached(query) {
  const key = cacheKey(query);
  if (!key) return null;
  const entry = studentSearchCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    studentSearchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(query, data) {
  const key = cacheKey(query);
  if (!key) return;
  studentSearchCache.set(key, {
    data,
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
  });
  pruneCache();
}

function normalizeWorkflowStatus(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  if (['done', 'issued', 'sent', 'completed', 'post', 'mail'].includes(raw)) return 'DONE';
  if (['in_progress', 'in progress', 'progress', 'processing'].includes(raw)) return 'IN_PROGRESS';
  if (['cancel', 'cancelled', 'canceled'].includes(raw)) return 'CANCEL';
  if (['correction'].includes(raw)) return 'CORRECTION';
  if (['pending'].includes(raw)) return 'PENDING';
  return raw.toUpperCase();
}

async function resolveEnrollment(searchText) {
  const query = String(searchText || '').trim();
  if (!query) return null;

  const exactEnrollment = await Enrollment.findOne({
    where: { enrollment_no: { [Op.iLike]: query } },
  });
  if (exactEnrollment) return exactEnrollment;

  const exactTemp = await Enrollment.findOne({
    where: { temp_enroll_no: { [Op.iLike]: query } },
  });
  if (exactTemp) return exactTemp;

  return Enrollment.findOne({
    where: {
      [Op.or]: [
        { enrollment_no: { [Op.iLike]: `%${query}%` } },
        { temp_enroll_no: { [Op.iLike]: `%${query}%` } },
        { student_name: { [Op.iLike]: `%${query}%` } },
      ],
    },
    order: [['admission_date', 'DESC'], ['id', 'DESC']],
  });
}

function enrollmentKeys(enrollment) {
  const values = [enrollment?.enrollment_no, enrollment?.temp_enroll_no]
    .map((v) => String(v || '').trim())
    .filter(Boolean);
  return [...new Set(values)];
}

export async function searchStudentProfile(searchText) {
  const enrollment = await resolveEnrollment(searchText);
  if (!enrollment) return null;

  const keys = enrollmentKeys(enrollment);
  const enrollmentNo = String(enrollment.enrollment_no || '').trim();
  const tempEnrollNo = String(enrollment.temp_enroll_no || '').trim();

  const [profile, institute, mainCourse, subCourse] = await Promise.all([
    safeOrFallback(() => StudentProfile.findOne({
      where: {
        [Op.or]: [
          enrollmentNo ? { enrollment_no: { [Op.iLike]: enrollmentNo } } : null,
          tempEnrollNo ? { temp_enroll_no: { [Op.iLike]: tempEnrollNo } } : null,
        ].filter(Boolean),
      },
    }), null, 'student_profile'),
    safeOrFallback(() => Institute.findOne({ where: { institute_id: enrollment.institute_id } }), null, 'institute'),
    safeOrFallback(() => CourseMain.findOne({ where: { maincourse_id: enrollment.maincourse_id } }), null, 'course_main'),
    safeOrFallback(() => CourseSub.findOne({ where: { subcourse_id: enrollment.subcourse_id } }), null, 'course_sub'),
  ]);

  const enrollmentWhere = {
    [Op.or]: keys.flatMap((key) => [
      { enrollment_no: { [Op.iLike]: key } },
      { student_name_dg: { [Op.iLike]: `%${key}%` } },
    ]),
  };

  const [verificationRows, provisionalRows, migrationRows, instStudentRows, degreeRows] = await Promise.all([
    safeOrFallback(() => Verification.findAll({
      where: {
        [Op.or]: [
          ...keys.map((key) => ({ enrollment_no: { [Op.iLike]: key } })),
          ...keys.map((key) => ({ second_enrollment_id: { [Op.iLike]: key } })),
        ],
      },
      order: [['doc_rec_date', 'DESC'], ['id', 'DESC']],
      limit: 200,
    }), [], 'verification'),
    safeOrFallback(() => ProvisionalRequest.findAll({
      where: { [Op.or]: keys.map((key) => ({ enrollment_no: { [Op.iLike]: key } })) },
      order: [['prv_date', 'DESC'], ['id', 'DESC']],
      limit: 200,
    }), [], 'provisional'),
    safeOrFallback(() => MigrationRequest.findAll({
      where: { [Op.or]: keys.map((key) => ({ enrollment_no: { [Op.iLike]: key } })) },
      order: [['mg_date', 'DESC'], ['id', 'DESC']],
      limit: 200,
    }), [], 'migration'),
    safeOrFallback(() => InstLetterStudent.findAll({
      where: {
        [Op.or]: [
          ...keys.map((key) => ({ enrollment_no: { [Op.iLike]: key } })),
          ...keys.map((key) => ({ enrollment_no_text: { [Op.iLike]: key } })),
        ],
      },
      order: [['id', 'DESC']],
      limit: 200,
    }), [], 'inst_verification_student'),
    safeOrFallback(() => StudentDegree.findAll({
      where: enrollmentWhere,
      order: [['id', 'DESC']],
      limit: 200,
    }), [], 'student_degree'),
  ]);

  const instDocRecIds = [...new Set(instStudentRows.map((row) => row.doc_rec_id).filter(Boolean))];
  const instMainRows = instDocRecIds.length
    ? await safeOrFallback(
        () => InstLetterMain.findAll({
          where: { [Op.or]: instDocRecIds.map((docRecId) => ({ doc_rec_id: docRecId })) },
          order: [['id', 'DESC']],
        }),
        [],
        'inst_verification_main',
      )
    : [];
  const instMainByDocRec = new Map(instMainRows.map((row) => [String(row.doc_rec_id), row]));

  const general = {
    student_name: enrollment.student_name || profile?.name_adhar || '',
    enrollment_no: enrollment.enrollment_no || '',
    temp_enrollment_no: enrollment.temp_enroll_no || '',
    batch: enrollment.batch || null,
    admission_date: enrollment.admission_date || null,
    enrollment_date: enrollment.createdat || null,
    institute_name: institute?.institute_name || null,
    institute_code: institute?.institute_code || null,
    institute_city: institute?.institute_city || null,
    institute_address: institute?.institute_address || null,
    maincourse: mainCourse?.course_name || null,
    subcourse: subCourse?.subcourse_name || null,
    gender: profile?.gender || null,
    category: profile?.category || null,
    aadhar_no: profile?.aadhar_no || null,
    abc_id: profile?.abc_id || null,
    contact_no: profile?.contact_no || null,
    email: profile?.email || null,
  };

  const services = {
    verification: verificationRows.map((row) => ({
      id: row.id,
      doc_rec_id: row.doc_rec_id,
      date: row.doc_rec_date,
      status: normalizeWorkflowStatus(row.status),
      final_no: row.final_no,
      tr_count: row.tr_count,
      ms_count: row.ms_count,
      dg_count: row.dg_count,
      vr_done_date: row.updatedat,
      pay_rec_no: row.pay_rec_no,
      eca_name: null,
      eca_ref_no: null,
      eca_send_date: row.eca_send_date,
      eca_status: normalizeWorkflowStatus(row.eca_status),
    })),
    provisional: provisionalRows.map((row) => ({
      id: row.id,
      doc_rec_id: row.doc_rec_id,
      date: row.prv_date,
      status: normalizeWorkflowStatus(row.prv_status),
      final_no: row.prv_number,
      prv_number: row.prv_number,
      prv_date: row.prv_date,
      remark: row.doc_remark,
    })),
    migration: migrationRows.map((row) => ({
      id: row.id,
      doc_rec_id: row.doc_rec_id,
      date: row.mg_date,
      status: normalizeWorkflowStatus(row.mg_status),
      final_no: row.mg_number,
      mg_number: row.mg_number,
      mg_date: row.mg_date,
      remark: row.doc_remark,
    })),
    institutional_verification: instStudentRows.map((row) => {
      const parent = instMainByDocRec.get(String(row.doc_rec_id || ''));
      return {
        id: row.id,
        doc_rec_id: row.doc_rec_id,
        date: parent?.inst_veri_date || parent?.doc_rec_date || null,
        status: normalizeWorkflowStatus(parent?.iv_status),
        remark: parent?.rec_inst_name || row.verification_status || null,
      };
    }),
    degree: degreeRows.map((row) => ({
      id: row.id,
      dg_sr_no: row.dg_sr_no,
      enrollment_no: row.enrollment_no,
      student_name_dg: row.student_name_dg,
      degree_name: row.degree_name,
      specialisation: row.specialisation,
      passing_year: row.last_exam_year,
      exam_month: row.last_exam_month,
      exam_year: row.last_exam_year,
      class_obtain: row.class_obtain,
      convocation_no: row.convocation_no,
      convocation_period: row.seat_last_exam,
    })),
  };

  const fees = {
    total_fees: Number(profile?.fees || 0),
    hostel_required: !!profile?.hostel_required,
  };

  return { general, services, fees };
}

export async function searchStudentProfileCached(searchText) {
  const cached = getCached(searchText);
  if (cached) return cached;

  const payload = await searchStudentProfile(searchText);
  if (payload) setCached(searchText, payload);
  return payload;
}

export function clearStudentSearchCache() {
  studentSearchCache.clear();
}

export default {
  searchStudentProfile,
  searchStudentProfileCached,
  clearStudentSearchCache,
};
