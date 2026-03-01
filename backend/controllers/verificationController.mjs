import { Op, fn, col, where as sqlWhere } from 'sequelize';
import { Verification } from '../models/docrec/transcript.mjs';

const SAFE_VERIFICATION_ATTRS = [
  'id',
  'doc_rec_date',
  'doc_rec_id',
  'enrollment_no',
  'second_enrollment_id',
  'student_name',
  'status',
  'final_no',
  'mail_status',
  'pay_rec_no',
  'doc_remark',
  'createdat',
  'updatedat',
];

export async function list(req, res, next) {
  try {
    const {
      q,
      search,
      status,
      limit = 50,
      offset = 0,
      doc_rec,
      doc_rec_id,
      include_pending,
    } = req.query || {};
    const where = {};
    if (status) {
      const wanted = String(status).toLowerCase();
      where[Op.and] = [sqlWhere(fn('LOWER', col('status')), { [Op.eq]: wanted })];
    }

    const docRec = doc_rec || doc_rec_id;
    if (docRec) where.doc_rec_id = docRec;

    const searchText = String(search || q || '').trim();
    if (searchText) {
      const like = `%${searchText.toString().toLowerCase()}%`;
      where[Op.or] = [
        sqlWhere(fn('LOWER', col('student_name')), { [Op.like]: like }),
        sqlWhere(fn('LOWER', col('enrollment_no')), { [Op.like]: like }),
        sqlWhere(fn('LOWER', col('final_no')), { [Op.like]: like }),
        sqlWhere(fn('LOWER', col('doc_rec_id')), { [Op.like]: like }),
      ];
    }

    if (!searchText && !docRec && String(include_pending || '').toLowerCase() === 'true') {
      where[Op.and] = [
        ...(Array.isArray(where[Op.and]) ? where[Op.and] : []),
        sqlWhere(fn('LOWER', col('status')), { [Op.in]: ['pending', 'in_progress'] }),
      ];
    }

    const lim = Number(limit) || 50;
    const off = Number(offset) || 0;

    try {
      const rows = await Verification.findAll({
        attributes: SAFE_VERIFICATION_ATTRS,
        where,
        limit: lim,
        offset: off,
        order: [['id', 'DESC']],
      });
      return res.json({ items: rows });
    } catch (schemaErr) {
      const [rawRows] = await Verification.sequelize.query(
        'SELECT * FROM verification ORDER BY id DESC LIMIT :limit OFFSET :offset',
        {
          replacements: { limit: lim, offset: off },
        },
      );

      const docRecFilter = String(docRec || '').trim();
      const statusFilter = String(status || '').trim().toLowerCase();
      const wantPending = String(include_pending || '').toLowerCase() === 'true';

      const filtered = (rawRows || []).filter((row) => {
        const sName = String(row.student_name || '').toLowerCase();
        const sEnroll = String(row.enrollment_no || '').toLowerCase();
        const sFinal = String(row.final_no || '').toLowerCase();
        const sDoc = String(row.doc_rec_id || '').toLowerCase();
        const sStatus = String(row.status || '').toLowerCase();

        if (docRecFilter && String(row.doc_rec_id || '') !== docRecFilter) return false;
        if (statusFilter && sStatus !== statusFilter) return false;
        if (!searchText && !docRecFilter && wantPending && !['pending', 'in_progress'].includes(sStatus)) {
          return false;
        }
        if (searchText) {
          const needle = searchText.toLowerCase();
          if (![sName, sEnroll, sFinal, sDoc].some((value) => value.includes(needle))) return false;
        }
        return true;
      });

      return res.json({ items: filtered });
    }
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    try {
      const row = await Verification.findByPk(req.params.id, { attributes: SAFE_VERIFICATION_ATTRS });
      if (!row) return res.status(404).json({ error: 'Not found' });
      return res.json(row);
    } catch (schemaErr) {
      const [rows] = await Verification.sequelize.query(
        'SELECT * FROM verification WHERE id = :id LIMIT 1',
        { replacements: { id: req.params.id } },
      );
      if (!rows || !rows.length) return res.status(404).json({ error: 'Not found' });
      return res.json(rows[0]);
    }
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const row = await Verification.create(req.body || {});
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const row = await Verification.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    await row.update(req.body || {});
    res.json(row);
  } catch (err) {
    next(err);
  }
}

export default { list, getById, create, update };
