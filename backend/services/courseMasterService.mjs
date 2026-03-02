import { CourseMain } from '../models/course_main.mjs';
import { CourseSub } from '../models/course_sub.mjs';
import { InstituteCourseOffering } from '../models/institute_course_offering.mjs';
import { sequelize } from '../db.mjs';

function isMissingRelation(err) {
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('does not exist') || msg.includes('unknown column');
}

async function listMainFromLegacy() {
  const [rows] = await sequelize.query(
    `SELECT id, maincourse_id, course_code, course_name, createdat, updatedat
     FROM main_branch
     ORDER BY id ASC`,
  );
  return rows || [];
}

async function createMainInLegacy(payload) {
  const { maincourse_id, course_name, course_code } = payload;
  if (!maincourse_id) throw new Error('maincourse_id required');
  const [rows] = await sequelize.query(
    `INSERT INTO main_branch (maincourse_id, course_name, course_code, createdat, updatedat)
     VALUES (:maincourse_id, :course_name, :course_code, NOW(), NOW())
     RETURNING id, maincourse_id, course_code, course_name, createdat, updatedat`,
    {
      replacements: {
        maincourse_id: String(maincourse_id),
        course_name: course_name || null,
        course_code: course_code || null,
      },
    },
  );
  return rows?.[0] || null;
}

async function listSubFromLegacy(filter = {}) {
  const where = [];
  const replacements = {};
  const mc = filter.maincourse_id || filter.maincourse;
  if (mc !== undefined && mc !== null && String(mc).trim() !== '') {
    where.push('maincourse_id = :maincourse_id');
    replacements.maincourse_id = String(mc).trim();
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await sequelize.query(
    `SELECT id, subcourse_id, subcourse_name, maincourse_id, createdat, updatedat
     FROM sub_branch
     ${clause}
     ORDER BY id ASC`,
    { replacements },
  );
  return rows || [];
}

async function createSubInLegacy(payload) {
  const { maincourse_id, subcourse_id, subcourse_name } = payload;
  if (!maincourse_id) throw new Error('maincourse_id required');
  if (!subcourse_id) throw new Error('subcourse_id required');
  if (!subcourse_name) throw new Error('subcourse_name required');

  const [rows] = await sequelize.query(
    `INSERT INTO sub_branch (maincourse_id, subcourse_id, subcourse_name, createdat, updatedat)
     VALUES (:maincourse_id, :subcourse_id, :subcourse_name, NOW(), NOW())
     RETURNING id, subcourse_id, subcourse_name, maincourse_id, createdat, updatedat`,
    {
      replacements: {
        maincourse_id: String(maincourse_id),
        subcourse_id: String(subcourse_id),
        subcourse_name,
      },
    },
  );
  return rows?.[0] || null;
}

export async function listMainBranches() {
  try {
    return await CourseMain.findAll({ order: [['maincourse_id', 'ASC'], ['id', 'ASC']] });
  } catch (err) {
    if (!isMissingRelation(err)) throw err;
    return listMainFromLegacy();
  }
}

export async function createMainBranch(payload = {}) {
  const { maincourse_id, course_name, course_code } = payload;
  let nextMainCourseId = Number.parseInt(maincourse_id, 10);
  if (!Number.isFinite(nextMainCourseId)) {
    const max = await CourseMain.max('maincourse_id');
    nextMainCourseId = Number.isFinite(max) ? Number(max) + 1 : 1;
  }
  if (!course_name && !course_code) throw new Error('course_name or course_code required');

  try {
    return await CourseMain.create({
      maincourse_id: nextMainCourseId,
      course_name: course_name || null,
      course_code: course_code || null,
    });
  } catch (err) {
    if (!isMissingRelation(err)) throw err;
    return createMainInLegacy({
      maincourse_id: nextMainCourseId,
      course_name,
      course_code,
    });
  }
}

export async function listSubBranches(filter = {}) {
  const where = {};
  const mc = filter.maincourse_id || filter.maincourse;
  if (mc !== undefined && mc !== null && String(mc).trim() !== '') {
    const parsed = Number.parseInt(mc, 10);
    where.maincourse_id = Number.isFinite(parsed) ? parsed : mc;
  }
  try {
    return await CourseSub.findAll({ where, order: [['subcourse_id', 'ASC'], ['id', 'ASC']] });
  } catch (err) {
    if (!isMissingRelation(err)) throw err;
    return listSubFromLegacy(filter);
  }
}

export async function createSubBranch(payload = {}) {
  const { maincourse_id, subcourse_id, subcourse_name } = payload;
  if (!maincourse_id) throw new Error('maincourse_id required');
  if (!subcourse_name) throw new Error('subcourse_name required');

  let nextSubCourseId = Number.parseInt(subcourse_id, 10);
  if (!Number.isFinite(nextSubCourseId)) {
    const max = await CourseSub.max('subcourse_id');
    nextSubCourseId = Number.isFinite(max) ? Number(max) + 1 : 1;
  }

  const parsedMain = Number.parseInt(maincourse_id, 10);

  try {
    return await CourseSub.create({
      maincourse_id: Number.isFinite(parsedMain) ? parsedMain : maincourse_id,
      subcourse_id: nextSubCourseId,
      subcourse_name,
    });
  } catch (err) {
    if (!isMissingRelation(err)) throw err;
    return createSubInLegacy({
      maincourse_id,
      subcourse_id: nextSubCourseId,
      subcourse_name,
    });
  }
}

export async function listInstituteCourseOfferings(filter = {}) {
  const where = {};
  ['institute_id', 'maincourse_id', 'subcourse_id'].forEach((k) => { if (filter[k]) where[k] = filter[k]; });
  try {
    return await InstituteCourseOffering.findAll({ where, order: [['id', 'ASC']] });
  } catch (err) {
    if (!isMissingRelation(err)) throw err;
    return [];
  }
}

export async function createInstituteCourseOffering(payload = {}, userId = null) {
  const { campus, start_date, end_date, institute_id, maincourse_id, subcourse_id } = payload;
  if (!institute_id || !maincourse_id) throw new Error('institute_id and maincourse_id required');
  return InstituteCourseOffering.create({
    campus: campus || null,
    start_date,
    end_date,
    institute_id,
    maincourse_id,
    subcourse_id: subcourse_id || null,
    updatedby: userId,
  });
}

export default {
  listMainBranches,
  createMainBranch,
  listSubBranches,
  createSubBranch,
  listInstituteCourseOfferings,
  createInstituteCourseOffering,
};