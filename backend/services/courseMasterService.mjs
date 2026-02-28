import { MainBranch } from '../models/main_branch.mjs';
import { SubBranch } from '../models/sub_branch.mjs';
import { InstituteCourseOffering } from '../models/institute_course_offering.mjs';

export async function listMainBranches() {
  return MainBranch.findAll({ order: [['id', 'ASC']] });
}

export async function createMainBranch(payload = {}) {
  const { maincourse_id, course_name, course_code } = payload;
  if (!maincourse_id) throw new Error('maincourse_id required');
  return MainBranch.create({ maincourse_id, course_name, course_code });
}

export async function listSubBranches(filter = {}) {
  const where = {};
  const mc = filter.maincourse_id || filter.maincourse;
  if (mc) where.maincourse_id = mc;
  return SubBranch.findAll({ where, order: [['id', 'ASC']] });
}

export async function createSubBranch(payload = {}) {
  const { maincourse_id, subcourse_id, subcourse_name } = payload;
  if (!maincourse_id || !subcourse_id) throw new Error('maincourse_id and subcourse_id required');
  return SubBranch.create({ maincourse_id, subcourse_id, subcourse_name });
}

export async function listInstituteCourseOfferings(filter = {}) {
  const where = {};
  ['institute_id', 'maincourse_id', 'subcourse_id'].forEach((k) => { if (filter[k]) where[k] = filter[k]; });
  return InstituteCourseOffering.findAll({ where, order: [['id', 'ASC']] });
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