// backend/controllers/enrollmentController.mjs
import {
  findByEnrollmentNo,
  findById,
  createEnrollment,
  updateEnrollment,
  removeEnrollment,
  advancedSearch,
  searchFlexible,
} from '../services/enrollmentService.mjs';

export default {
  async search(req, res, next) {
    try {
      // unified quick search by enrollment_no (exact, case-insensitive) or student_name (contains, case-insensitive)
      if (req.query.q) {
        const result = await searchFlexible(String(req.query.q));
        return res.json(result);
      }

      const { enrollment_no } = req.query;
      if (enrollment_no) {
        const rec = await findByEnrollmentNo(String(enrollment_no).trim());
        if (!rec) return res.status(404).json({ message: 'Enrollment not found' });
        return res.json(rec);
      }

      const filters = {
        batch: req.query.batch ? String(req.query.batch).split(',').map((s) => s.trim()) : undefined,
        instituteIds: req.query.institute_id ? String(req.query.institute_id).split(',').map((s) => s.trim()) : undefined,
        maincourseIds: req.query.maincourse_id ? String(req.query.maincourse_id).split(',').map((s) => s.trim()) : undefined,
        subcourseIds: req.query.subcourse_id ? String(req.query.subcourse_id).split(',').map((s) => s.trim()) : undefined,
      };

      const page = Math.max(1, parseInt(req.query.page || 1));
      const limit = Math.min(200, parseInt(req.query.limit || 25));

      const result = await advancedSearch(filters, page, limit);
      return res.json(result);
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const rec = await findById(req.params.id);
      if (!rec) return res.status(404).json({ message: 'Not found' });
      res.json(rec);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const created = await createEnrollment(req.body);
      return res.status(201).json(created);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const updated = await updateEnrollment(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: 'Enrollment not found' });
      res.json(updated);
    } catch (err) { next(err); }
  },

  async remove(req, res, next) {
    try {
      const ok = await removeEnrollment(req.params.id);
      if (!ok) return res.status(404).json({ message: 'Enrollment not found' });
      res.status(204).end();
    } catch (err) { next(err); }
  },
};
