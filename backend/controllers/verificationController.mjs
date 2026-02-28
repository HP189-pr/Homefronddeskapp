import { Op, fn, col, where as sqlWhere } from 'sequelize';
import { Verification } from '../models/docrec/transcript.mjs';

export async function list(req, res, next) {
  try {
    const { q, status, limit = 50, offset = 0 } = req.query || {};
    const where = {};
    if (status) where.status = status;
    if (q) {
      const like = `%${q.toString().toLowerCase()}%`;
      where[Op.or] = [
        sqlWhere(fn('LOWER', col('student_name')), { [Op.like]: like }),
        sqlWhere(fn('LOWER', col('enrollment_no')), { [Op.like]: like }),
        sqlWhere(fn('LOWER', col('final_no')), { [Op.like]: like }),
        sqlWhere(fn('LOWER', col('doc_rec_id')), { [Op.like]: like }),
      ];
    }

    const rows = await Verification.findAll({ where, limit: Number(limit) || 50, offset: Number(offset) || 0, order: [['id','DESC']] });
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const row = await Verification.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

export default { list, getById };
