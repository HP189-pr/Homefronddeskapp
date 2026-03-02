import * as svc from '../services/instLetterService.mjs';
import { mapDateKeysToDMY } from '../utils/dateFormat.mjs';

function mapMain(row) {
  if (!row) return row;
  const out = row.toJSON ? row.toJSON() : { ...row };
  const mapped = {
    ...out,
    doc_rec: out.doc_rec_id,
  };
  return mapDateKeysToDMY(mapped, ['doc_rec_date', 'inst_veri_date', 'ref_date']);
}

function mapStudent(row) {
  if (!row) return row;
  const out = row.toJSON ? row.toJSON() : { ...row };
  return {
    ...out,
    doc_rec: out.doc_rec_id,
    enrollment: out.enrollment_no || out.enrollment_no_text || null,
  };
}

export async function listMains(req, res, next) {
  try {
    const rows = await svc.listInstVerificationMains(req.query || {});
    res.json({ items: rows.map(mapMain) });
  } catch (e) {
    next(e);
  }
}

export async function getMain(req, res, next) {
  try {
    const row = await svc.getInstVerificationMain(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(mapMain(row));
  } catch (e) {
    next(e);
  }
}

export async function createMain(req, res, next) {
  try {
    const row = await svc.createInstVerificationMain(req.body || {});
    res.status(201).json(mapMain(row));
  } catch (e) {
    next(e);
  }
}

export async function updateMain(req, res, next) {
  try {
    const row = await svc.updateInstVerificationMain(req.params.id, req.body || {});
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(mapMain(row));
  } catch (e) {
    next(e);
  }
}

export async function searchRecInst(req, res, next) {
  try {
    const rows = await svc.searchRecipientInstitutes(req.query?.q || '');
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function suggestDocRec(req, res, next) {
  try {
    const out = await svc.suggestDocRecCandidates(req.query || {});
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function listStudents(req, res, next) {
  try {
    const rows = await svc.listInstVerificationStudents(req.query || {});
    res.json({ items: rows.map(mapStudent) });
  } catch (e) {
    next(e);
  }
}

export async function createStudent(req, res, next) {
  try {
    const row = await svc.createInstVerificationStudent(req.body || {});
    res.status(201).json(mapStudent(row));
  } catch (e) {
    next(e);
  }
}

export async function updateStudent(req, res, next) {
  try {
    const row = await svc.updateInstVerificationStudent(req.params.id, req.body || {});
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(mapStudent(row));
  } catch (e) {
    next(e);
  }
}

export async function deleteStudent(req, res, next) {
  try {
    const ok = await svc.deleteInstVerificationStudent(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

export async function generatePdf(req, res, next) {
  try {
    const out = await svc.generateInstLetterPdf(req.body || {});
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
    res.status(200).send(out.buffer);
  } catch (e) {
    if (e?.statusCode) {
      return res.status(e.statusCode).json({ error: e.message, detail: e.message });
    }
    next(e);
  }
}

export default {
  listMains,
  getMain,
  createMain,
  updateMain,
  searchRecInst,
  suggestDocRec,
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  generatePdf,
};
