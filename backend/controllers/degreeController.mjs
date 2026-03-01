import { Op } from 'sequelize';
import { Degree } from '../models/degree.mjs';
import { StudentDegree } from '../models/student_degree.mjs';

const parseQuery = (q) => (q || '').trim().toLowerCase();

const buildWhere = (req) => {
  const {
    q,
    enrollment_no,
    degree_name,
    year,
    last_exam_year,
    convocation_no,
  } = req.query || {};
  const where = {};
  if (enrollment_no) where.enrollment_no = enrollment_no;
  if (degree_name) where.degree_name = degree_name;
  if (year || last_exam_year) where.last_exam_year = year || last_exam_year;
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

const getPageInfo = (query = {}) => {
  const page = Math.max(1, Number(query.page || 1) || 1);
  const pageSize = Math.min(
    1000,
    Math.max(1, Number(query.page_size || query.limit || 200) || 200),
  );
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
};

const isMissingRelationError = (err) => {
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('relation') && msg.includes('does not exist');
};

async function findAndCountDegree(Model, where, pageSize, offset) {
  const rows = await Model.findAll({
    where,
    order: [['id', 'DESC']],
    limit: pageSize,
    offset,
  });
  const count = await Model.count({ where });
  return { rows, count };
}

const search = async (req, res) => {
  try {
    const { page, pageSize, offset } = getPageInfo(req.query || {});
    const where = buildWhere(req);

    let out;
    try {
      out = await findAndCountDegree(Degree, where, pageSize, offset);
    } catch (err) {
      if (!isMissingRelationError(err)) throw err;
      out = await findAndCountDegree(StudentDegree, where, pageSize, offset);
    }

    const numPages = Math.max(1, Math.ceil((out.count || 0) / pageSize));
    res.json({
      results: out.rows,
      rows: out.rows,
      count: out.count || 0,
      page,
      page_size: pageSize,
      num_pages: numPages,
    });
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
