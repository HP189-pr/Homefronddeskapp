import { UserLog } from '../models/userLog.mjs';

export async function createLog(req, res, next) {
  try {
    const { userid, action, meta, level, ip, user_agent, session_id } = req.body || {};
    // prefer explicit userid in body, else use authenticated user
    const uid = userid ?? (req.user ? req.user.id : null);
    if (!uid) return res.status(400).json({ error: 'Missing userid' });
    const rec = await UserLog.create({ userid: uid, action: action || 'log', meta: meta || null, level: level || 'info', ip: ip || req.ip, user_agent: user_agent || req.get('user-agent'), session_id: session_id || null });
    return res.json({ ok: true, log: rec });
  } catch (e) {
    return next(e);
  }
}

export async function getLogs(req, res, next) {
  try {
    const where = {};
    if (req.query.userid) where.userid = parseInt(req.query.userid, 10);
    if (req.query.action) where.action = req.query.action;
    if (req.query.level) where.level = req.query.level;

    // date range
    const { from, to } = req.query;
    const options = { where, order: [['createdat','DESC']], limit: parseInt(req.query.limit || '200', 10) };

    // support date filtering by createdat
    if (from || to) {
      const { Op } = await import('sequelize');
      where.createdat = {};
      if (from) where.createdat[Op.gte] = new Date(from);
      if (to) where.createdat[Op.lte] = new Date(to);
    }

    const logs = await UserLog.findAll(options);
    return res.json({ logs });
  } catch (e) {
    return next(e);
  }
}

export async function getUserLogs(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid user id' });
    const logs = await UserLog.findAll({ where: { userid: id }, order: [['createdat','DESC']], limit: parseInt(req.query.limit || '200', 10) });
    return res.json({ logs });
  } catch (e) {
    return next(e);
  }
}

export default { createLog, getLogs, getUserLogs };
