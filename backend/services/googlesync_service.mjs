import { Op, fn, col, where as sqlWhere } from 'sequelize';
import TranscriptRequest from '../models/transcript_request.mjs';
import GoogleFormSubmission from '../models/mail_request.mjs';

function getBoolEnv(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase());
}

const GOOGLE_SYNC_ENABLED = getBoolEnv('GOOGLE_SYNC_ENABLED', false);

export function normalizeListPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function parseIntSafe(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function listMailRequests(query = {}) {
  const { search = '', mail_status, page = 1, page_size = 50 } = query;

  const limit = Math.min(Math.max(parseIntSafe(page_size, 50), 1), 200);
  const currentPage = Math.max(parseIntSafe(page, 1), 1);
  const offset = (currentPage - 1) * limit;

  const where = {};
  const status = GoogleFormSubmission.normalizeStatus(mail_status);
  if (mail_status != null && String(mail_status).trim() !== '') where.mail_status = status;

  const searchText = String(search || '').trim();
  if (searchText) {
    const like = `%${searchText.toLowerCase()}%`;
    where[Op.or] = [
      sqlWhere(fn('LOWER', col('enrollment_no')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('student_name')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('rec_institute_name')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('rec_official_mail')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('rec_ref_id')), { [Op.like]: like }),
    ];
  }

  const { count, rows } = await GoogleFormSubmission.findAndCountAll({
    where,
    order: [['submitted_at', 'DESC'], ['id', 'DESC']],
    offset,
    limit,
  });

  const numPages = Math.max(1, Math.ceil((count || 0) / limit));
  return {
    count,
    num_pages: numPages,
    page: currentPage,
    page_size: limit,
    results: rows,
    items: rows,
  };
}

export async function updateMailRequestById(id, payload = {}) {
  const row = await GoogleFormSubmission.findByPk(id);
  if (!row) return null;

  const changedFields = {};
  if (Object.prototype.hasOwnProperty.call(payload, 'mail_status')) {
    row.mail_status = GoogleFormSubmission.normalizeStatus(payload.mail_status);
    changedFields.mail_status = row.mail_status;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'remark')) {
    row.remark = payload.remark ?? null;
    changedFields.remark = row.remark;
  }

  await row.save();
  await syncMailSubmissionToSheet(row, changedFields);
  return row;
}

export async function refreshMailRequestVerificationById(id) {
  const row = await GoogleFormSubmission.findByPk(id);
  if (!row) return null;
  row.student_verification = await GoogleFormSubmission.refreshVerificationFor(row);
  await row.save({ fields: ['student_verification'] });
  return row;
}

export async function listTranscriptRequests(query = {}) {
  const {
    search = '',
    institute_name,
    tr_request_no,
    mail_status,
    page = 1,
    page_size = 50,
  } = query;

  const limit = Math.min(Math.max(parseIntSafe(page_size, 50), 1), 200);
  const currentPage = Math.max(parseIntSafe(page, 1), 1);
  const offset = (currentPage - 1) * limit;

  const where = {};
  if (mail_status != null && String(mail_status).trim() !== '') {
    where.mail_status = TranscriptRequest.normalizeStatus(mail_status);
  }
  if (institute_name) {
    where.institute_name = { [Op.iLike]: `%${String(institute_name).trim()}%` };
  }
  if (tr_request_no != null && String(tr_request_no).trim() !== '') {
    where.tr_request_no = parseIntSafe(tr_request_no, 0);
  }

  const searchText = String(search || '').trim();
  if (searchText) {
    const like = `%${searchText.toLowerCase()}%`;
    where[Op.or] = [
      sqlWhere(fn('LOWER', col('enrollment_no')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('student_name')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('request_ref_no')), { [Op.like]: like }),
      sqlWhere(fn('LOWER', col('submit_mail')), { [Op.like]: like }),
    ];
  }

  const { count, rows } = await TranscriptRequest.findAndCountAll({
    where,
    order: [['requested_at', 'DESC'], ['id', 'DESC']],
    offset,
    limit,
  });

  const numPages = Math.max(1, Math.ceil((count || 0) / limit));
  return {
    count,
    num_pages: numPages,
    page: currentPage,
    page_size: limit,
    results: rows,
    items: rows,
  };
}

export async function updateTranscriptRequestById(id, payload = {}) {
  const row = await TranscriptRequest.findByPk(id);
  if (!row) return null;

  const changedFields = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'mail_status')) {
    row.mail_status = TranscriptRequest.normalizeStatus(payload.mail_status);
    changedFields.mail_status = row.mail_status;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'transcript_remark')) {
    row.transcript_remark = payload.transcript_remark ?? null;
    changedFields.transcript_remark = row.transcript_remark;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'pdf_generate')) {
    row.pdf_generate = payload.pdf_generate ?? null;
    changedFields.pdf_generate = row.pdf_generate;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'tr_request_no')) {
    row.tr_request_no = parseIntSafe(payload.tr_request_no, row.tr_request_no || 0);
    changedFields.tr_request_no = row.tr_request_no;
  }

  await row.save();
  await syncTranscriptRequestToSheet(row, changedFields);
  return row;
}

export async function deleteTranscriptRequestById(id) {
  const row = await TranscriptRequest.findByPk(id);
  if (!row) return null;
  await row.destroy();
  return { ok: true, id, deleted: true };
}

export async function syncMailSubmissionToSheet(instance, changedFields = {}) {
  if (!GOOGLE_SYNC_ENABLED) {
    return { ok: true, skipped: true, reason: 'GOOGLE_SYNC_ENABLED=false', id: instance?.id };
  }

  return {
    ok: true,
    skipped: true,
    reason: 'Google Sheets write-back not configured in backend environment',
    id: instance?.id,
    changed_fields: Object.keys(changedFields || {}),
  };
}

export async function syncTranscriptRequestToSheet(instance, changedFields = {}) {
  if (!GOOGLE_SYNC_ENABLED) {
    return { ok: true, skipped: true, reason: 'GOOGLE_SYNC_ENABLED=false', id: instance?.id };
  }

  return {
    ok: true,
    skipped: true,
    reason: 'Google Sheets write-back not configured in backend environment',
    id: instance?.id,
    changed_fields: Object.keys(changedFields || {}),
  };
}

export async function importMailRequestsFromSheet(_options = {}) {
  return {
    created: 0,
    updated: 0,
    total: 0,
    skipped: 0,
    note: 'Sheet import is disabled until Google credentials are configured',
  };
}

export async function importTranscriptRequestsFromSheet(_options = {}) {
  return {
    created: 0,
    updated: 0,
    total: 0,
    skipped: 0,
    pruned: 0,
    created_trs: [],
    updated_trs: [],
    note: 'Sheet import is disabled until Google credentials are configured',
  };
}

export async function bulkRefreshMailVerification(ids = []) {
  const list = Array.isArray(ids) ? ids : [];
  const refreshed = [];

  for (const id of list) {
    const row = await GoogleFormSubmission.findByPk(id);
    if (!row) continue;
    row.student_verification = await GoogleFormSubmission.refreshVerificationFor(row);
    await row.save({ fields: ['student_verification'] });
    refreshed.push(row.id);
  }

  return { ok: true, refreshed };
}

export async function bulkUpdateTranscriptStatus(ids = [], mailStatus = null) {
  const list = Array.isArray(ids) ? ids : [];
  const status = TranscriptRequest.normalizeStatus(mailStatus);

  if (!list.length) return { ok: true, updated: 0 };

  const [updated] = await TranscriptRequest.update(
    { mail_status: status },
    { where: { id: list } },
  );

  return { ok: true, updated };
}

export default {
  normalizeListPayload,
  listMailRequests,
  updateMailRequestById,
  refreshMailRequestVerificationById,
  listTranscriptRequests,
  updateTranscriptRequestById,
  deleteTranscriptRequestById,
  syncMailSubmissionToSheet,
  syncTranscriptRequestToSheet,
  importMailRequestsFromSheet,
  importTranscriptRequestsFromSheet,
  bulkRefreshMailVerification,
  bulkUpdateTranscriptStatus,
};
