import {
  listMailRequests,
  updateMailRequestById,
  refreshMailRequestVerificationById,
  listTranscriptRequests,
  updateTranscriptRequestById,
  deleteTranscriptRequestById,
  bulkRefreshMailVerification,
  bulkUpdateTranscriptStatus,
  importMailRequestsFromSheet,
  importTranscriptRequestsFromSheet,
} from '../services/googlesync_service.mjs';

export async function listMailRequestsHandler(req, res, next) {
  try {
    const data = await listMailRequests(req.query || {});
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function updateMailRequestHandler(req, res, next) {
  try {
    const row = await updateMailRequestById(req.params.id, req.body || {});
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

export async function refreshMailRequestVerificationHandler(req, res, next) {
  try {
    const row = await refreshMailRequestVerificationById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, id: row.id, student_verification: row.student_verification });
  } catch (err) {
    next(err);
  }
}

export async function bulkRefreshMailRequestsHandler(req, res, next) {
  try {
    const ids = Array.isArray(req.body) ? req.body : (Array.isArray(req.body?.ids) ? req.body.ids : []);
    const summary = await bulkRefreshMailVerification(ids);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

export async function listTranscriptRequestsHandler(req, res, next) {
  try {
    const data = await listTranscriptRequests(req.query || {});
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function updateTranscriptRequestHandler(req, res, next) {
  try {
    const row = await updateTranscriptRequestById(req.params.id, req.body || {});
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

export async function deleteTranscriptRequestHandler(req, res, next) {
  try {
    const summary = await deleteTranscriptRequestById(req.params.id);
    if (!summary) return res.status(404).json({ error: 'Not found' });
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

export async function bulkTranscriptStatusHandler(req, res, next) {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const mailStatus = req.body?.mail_status;
    const summary = await bulkUpdateTranscriptStatus(ids, mailStatus);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

export async function syncMailFromSheet(req, res, next) {
  try {
    const summary = await importMailRequestsFromSheet(req.body || {});
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

export async function syncTranscriptFromSheet(req, res, next) {
  try {
    const summary = await importTranscriptRequestsFromSheet(req.body || {});
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

export default {
  listMailRequestsHandler,
  updateMailRequestHandler,
  refreshMailRequestVerificationHandler,
  bulkRefreshMailRequestsHandler,
  listTranscriptRequestsHandler,
  updateTranscriptRequestHandler,
  deleteTranscriptRequestHandler,
  bulkTranscriptStatusHandler,
  syncMailFromSheet,
  syncTranscriptFromSheet,
};
