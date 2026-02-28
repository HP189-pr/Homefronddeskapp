import { Verification } from '../models/docrec/transcript.mjs';

export async function recordResubmit(id, note) {
  const rec = await Verification.findByPk(id);
  if (!rec) {
    const err = new Error('Verification record not found');
    err.status = 404;
    throw err;
  }

  rec.last_resubmit_date = new Date();
  rec.last_resubmit_status = 'CORRECTION';
  rec.status = 'IN_PROGRESS';

  if (note) {
    rec.doc_remark = `${rec.doc_remark || ''}\n[Resubmit] ${note}`.trim();
  }

  return rec.save();
}

export default { recordResubmit };
