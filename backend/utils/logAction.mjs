// backend/utils/logAction.mjs
import { UserLog } from '../models/userLog.mjs';

/**
 * logAction(req, action, meta?, level?)
 * Creates a user activity log using req.user when available.
 * Safe to call in background; errors are swallowed to avoid blocking main flow.
 */
export async function logAction(req, action, meta = null, level = 'info') {
  try {
    const uid = req?.user?.id ?? null;
    if (!uid) return; // only log for authenticated user context
    await UserLog.create({
      userid: uid,
      action: String(action || 'action'),
      meta: meta ? JSON.stringify(meta).length > 10000 ? { note: 'meta truncated' } : meta : null,
      level,
      ip: req?.ip || null,
      user_agent: req?.get?.('user-agent') || null,
      session_id: req?.session?.id || null,
    });
  } catch (_) {
    // non-fatal
  }
}

export default logAction;
