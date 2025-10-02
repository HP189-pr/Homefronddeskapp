import { Op } from 'sequelize';
import { Degree } from '../models/degree.mjs';

const parseQuery = (q) => (q || '').trim().toLowerCase();

const buildWhere = (req) => {
  const { q, enrollment_no, degree_name, year, convocation_no } = req.query || {};
  const where = {};
  if (enrollment_no) where.enrollment_no = enrollment_no;
  if (degree_name) where.degree_name = degree_name;
  if (year) where.last_exam_year = year;
  if (convocation_no) where.convocation_no = convocation_no;
  if (q) {
    const v = `%${parseQuery(q)}%`;
    where[Op.or] = [
      { enrollment_no: { [Op.iLike]: v } },
      { student_name_dg: { [Op.iLike]: v } },
      { degree_name: { [Op.iLike]: v } },
      { specialisation: { [Op.iLike]: v } },
    ];
  }
  return where;
};

const search = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 200), 1000);
    const where = buildWhere(req);
    const rows = await Degree.findAll({ where, order: [['id', 'DESC']], limit });
    res.json({ rows, count: rows.length });
  } catch (err) {
    console.error('Degree.search error', err);
    res.status(500).json({ error: 'Failed to fetch degrees' });
  }
};

const getById = async (req, res) => {
  try {
    const one = await Degree.findByPk(req.params.id);
    if (!one) return res.status(404).json({ error: 'Not found' });
    res.json(one);
  } catch (err) {
    console.error('Degree.getById error', err);
    res.status(500).json({ error: 'Failed to fetch degree' });
  }
};

const create = async (req, res) => {
  try {
    const created = await Degree.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    console.error('Degree.create error', err);
    res.status(400).json({ error: err.message || 'Create failed' });
  }
};

const update = async (req, res) => {
  try {
    const one = await Degree.findByPk(req.params.id);
    if (!one) return res.status(404).json({ error: 'Not found' });
    await one.update(req.body);
    res.json(one);
  } catch (err) {
    console.error('Degree.update error', err);
    res.status(400).json({ error: err.message || 'Update failed' });
  }
};

const remove = async (req, res) => {
  try {
    const one = await Degree.findByPk(req.params.id);
    if (!one) return res.status(404).json({ error: 'Not found' });
    await one.destroy();
    res.json({ ok: true });
  } catch (err) {
    console.error('Degree.remove error', err);
    res.status(400).json({ error: err.message || 'Delete failed' });
  }
};

export default { search, getById, create, update, remove };
