import { Op, fn, col } from 'sequelize';
import { Enrollment } from '../models/enrollment.mjs';
import { CourseSub } from '../models/course_sub.mjs';

export async function enrollmentStats(rawBatches = []) {
  const batches = (Array.isArray(rawBatches) ? rawBatches : [rawBatches])
    .map((b) => parseInt(b, 10))
    .filter((b) => Number.isFinite(b));

  const where = {};
  if (batches.length) where.batch = { [Op.in]: batches };

  const rows = await Enrollment.findAll({
    attributes: ['subcourse_id', 'batch', [fn('COUNT', col('id')), 'count']],
    where,
    group: ['subcourse_id', 'batch'],
    raw: true,
  });

  const subs = await CourseSub.findAll({ attributes: ['subcourse_id', 'subcourse_name'], raw: true });
  const nameMap = new Map(subs.map((s) => [String(s.subcourse_id), s.subcourse_name || s.subcourse_id]));

  const allBatches = batches.length ? batches : Array.from(new Set(rows.map((r) => Number(r.batch)))).sort();
  const bySub = new Map();
  rows.forEach((r) => {
    const key = String(r.subcourse_id);
    if (!bySub.has(key)) bySub.set(key, { subcourse_name: nameMap.get(key) || key });
    const obj = bySub.get(key);
    obj[r.batch] = parseInt(r.count, 10) || 0;
  });

  const columns = ['subcourse_name', ...allBatches];
  const data = Array.from(bySub.values()).map((row) => {
    const out = { subcourse_name: row.subcourse_name };
    allBatches.forEach((b) => { out[b] = row[b] || 0; });
    return out;
  });

  if (data.length) {
    const total = { subcourse_name: 'GRAND TOTAL' };
    allBatches.forEach((b) => { total[b] = data.reduce((acc, r) => acc + (r[b] || 0), 0); });
    data.push(total);
  }

  return { columns, data };
}

export function enrollmentStatsCsv(columns, data) {
  const header = columns.join(',');
  const lines = data.map((r) => columns.map((c) => r[c] ?? '').join(','));
  return [header, ...lines].join('\n');
}

export default { enrollmentStats, enrollmentStatsCsv };