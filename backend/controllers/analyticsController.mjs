import * as svc from '../services/analyticsService.mjs';

export async function enrollmentStats(req, res, next) {
  try {
    const { columns, data } = await svc.enrollmentStats(req.query.batch ? req.query.batch : []);

    if ((req.query.export || '').toString().toLowerCase() === 'excel') {
      const csv = svc.enrollmentStatsCsv(columns, data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="Enrollment_By_Subcourse_Batch.csv"');
      return res.send(csv);
    }

    res.json({ columns, data });
  } catch (e) {
    console.error('enrollmentStats fallback:', e?.message || e);
    res.json({ columns: ['subcourse_name'], data: [] });
  }
}

export default { enrollmentStats };