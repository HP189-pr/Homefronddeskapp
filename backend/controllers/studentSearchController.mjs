import { searchStudentProfileCached } from '../services/studentSearchService.mjs';

export async function searchStudentHandler(req, res, next) {
  try {
    const query = String(req.query?.enrollment || req.query?.q || '').trim();
    if (!query) return res.status(400).json({ error: 'enrollment query is required' });

    const payload = await searchStudentProfileCached(query);
    if (!payload) return res.status(404).json({ error: 'Student not found' });
    return res.json(payload);
  } catch (err) {
    return next(err);
  }
}

export default {
  searchStudentHandler,
};
