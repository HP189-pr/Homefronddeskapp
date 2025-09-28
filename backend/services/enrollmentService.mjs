// backend/services/enrollmentService.mjs
import { Op } from 'sequelize';
import { Enrollment } from '../models/enrollment.mjs';

export async function findByEnrollmentNo(enrollment_no) {
  // case-insensitive exact match
  return Enrollment.findOne({ where: { enrollment_no: { [Op.iLike]: String(enrollment_no) } } });
}

export async function findById(id) {
  return Enrollment.findByPk(id);
}

export async function createEnrollment(payload) {
  return Enrollment.create(payload);
}

export async function updateEnrollment(id, payload) {
  const rec = await Enrollment.findByPk(id);
  if (!rec) return null;
  await rec.update(payload);
  return rec;
}

export async function removeEnrollment(id) {
  const rec = await Enrollment.findByPk(id);
  if (!rec) return false;
  await rec.destroy();
  return true;
}

export async function advancedSearch(filters = {}, page = 1, limit = 25) {
  const where = {};
  if (filters.batch) where.batch = { [Op.in]: filters.batch };
  if (filters.instituteIds) where.institute_id = { [Op.in]: filters.instituteIds };
  if (filters.maincourseIds) where.maincourse_id = { [Op.in]: filters.maincourseIds };
  if (filters.subcourseIds) where.subcourse_id = { [Op.in]: filters.subcourseIds };

  const offset = (page - 1) * limit;

  const result = await Enrollment.findAndCountAll({
    where,
    limit,
    offset,
    order: [['admission_date', 'DESC']],
  });

  return { count: result.count, rows: result.rows };
}

export async function searchFlexible(query, limit = 50) {
  const q = String(query || '').trim();
  if (!q) return { count: 0, rows: [] };

  const rows = await Enrollment.findAll({
    where: {
      [Op.or]: [
        { enrollment_no: { [Op.iLike]: q } }, // exact (case-insensitive)
        { student_name: { [Op.iLike]: `%${q}%` } }, // contains (case-insensitive)
      ],
    },
    limit,
    order: [['admission_date', 'DESC']],
  });
  return { count: rows.length, rows };
}
