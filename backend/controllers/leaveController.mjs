import { LeaveType, LeaveEntry, LeavePeriod, LeaveAllocation, calculateWorkingDays } from '../models/leave.mjs';
import { Holiday } from '../models/misctool.mjs';
import { EmpProfile } from '../models/emp_profile.mjs';

export async function listTypes(_req, res, next) {
  try {
    const rows = await LeaveType.findAll({ order: [['leave_code','ASC']] });
    res.json({ items: rows, results: rows, count: rows.length });
  } catch (err) {
    console.error('leave listTypes fallback:', err?.message || err);
    res.json({ items: [], results: [], count: 0 });
  }
}

export async function createType(req, res, next) {
  try { const row = await LeaveType.create(req.body); res.status(201).json(row); } catch (err) { next(err); }
}

export async function listProfiles(_req, res, next) {
  try { res.json({ items: await EmpProfile.findAll({ order: [['id','ASC']] }) }); } catch (err) { next(err); }
}

export async function upsertProfile(req, res, next) {
  try {
    const payload = req.body || {};
    const [row] = await EmpProfile.upsert(payload, { returning: true });
    res.json(row);
  } catch (err) { next(err); }
}

export async function listPeriods(_req, res, next) {
  try { res.json({ items: await LeavePeriod.findAll({ order: [['start_date','ASC']] }) }); } catch (err) { next(err); }
}

export async function savePeriod(req, res, next) {
  try {
    const payload = req.body || {};
    if (req.params.id) {
      const row = await LeavePeriod.findByPk(req.params.id);
      if (!row) return res.status(404).json({ error: 'Not found' });
      await row.update(payload);
      return res.json(row);
    }
    const row = await LeavePeriod.create(payload);
    return res.status(201).json(row);
  } catch (err) { next(err); }
}

export async function listAllocations(_req, res, next) {
  try { res.json({ items: await LeaveAllocation.findAll({ order: [['id','ASC']] }) }); } catch (err) { next(err); }
}

export async function saveAllocation(req, res, next) {
  try {
    const payload = req.body || {};
    if (req.params.id) {
      const row = await LeaveAllocation.findByPk(req.params.id);
      if (!row) return res.status(404).json({ error: 'Not found' });
      await row.update(payload);
      return res.json(row);
    }
    const row = await LeaveAllocation.create(payload);
    return res.status(201).json(row);
  } catch (err) { next(err); }
}

export async function listEntries(_req, res, next) {
  try { res.json({ items: await LeaveEntry.findAll({ order: [['created_at','DESC']] }) }); } catch (err) { next(err); }
}

export async function createEntry(req, res, next) {
  try {
    const payload = req.body || {};
    const type = await LeaveType.findOne({ where: { leave_code: payload.leave_code } });
    if (!type) return res.status(400).json({ error: 'Invalid leave_code' });

    const baseDays = payload.sandwich_leave
      ? (new Date(payload.end_date) - new Date(payload.start_date)) / 86400000 + 1
      : await calculateWorkingDays(payload.start_date, payload.end_date, Holiday);

    const dayValue = type.is_half ? 0.5 : Number(type.day_value || 1);
    payload.total_days = baseDays * dayValue;

    const row = await LeaveEntry.create(payload);
    res.status(201).json(row);
  } catch (err) { next(err); }
}

export async function myBalance(_req, res) { res.json({ balance: [], note: 'leave balance calculation pending' }); }
export async function leaveReport(_req, res) { res.json({ employees: [] }); }

export default {
  listTypes,
  createType,
  listProfiles,
  upsertProfile,
  listPeriods,
  savePeriod,
  listAllocations,
  saveAllocation,
  listEntries,
  createEntry,
  myBalance,
  leaveReport,
};
