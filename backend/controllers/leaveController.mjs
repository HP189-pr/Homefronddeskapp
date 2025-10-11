import { Op } from 'sequelize';
import LeaveType from '../models/leave_type.mjs';
import LeavePeriod from '../models/leave_period.mjs';
import LeaveAllocation from '../models/leave_allocation.mjs';
import LeaveEntry from '../models/leave_entry.mjs';
import EmpProfile from '../models/emp_profile.mjs';
import { sequelize } from '../db.mjs';

const toPlain = (row) => (row?.get ? row.get({ plain: true }) : row);

const isAdminUser = (user) => Boolean(user && user.usertype === 'admin');

async function getActivePeriod() {
  const period = await LeavePeriod.findOne({
    where: { is_active: true },
    order: [['start_date', 'DESC']],
  });
  return period || null;
}

async function findProfileForUser(user) {
  if (!user || !user.userid) return null;
  return EmpProfile.findOne({ where: { userid: user.userid } });
}

export async function listTypes(_req, res) {
  try {
    const rows = await LeaveType.findAll({ order: [['leave_name', 'ASC']] });
    return res.json(rows.map(toPlain));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load leave types', detail: err.message });
  }
}

export async function createType(req, res) {
  try {
    const payload = {
      leave_code: req.body?.leave_code,
      leave_name: req.body?.leave_name,
      description: req.body?.description ?? null,
      is_active: req.body?.is_active ?? true,
      max_per_year: req.body?.max_per_year ?? null,
    };
    if (!payload.leave_code || !payload.leave_name) {
      return res.status(400).json({ error: 'leave_code and leave_name are required' });
    }
    const created = await LeaveType.create(payload);
    return res.status(201).json(toPlain(created));
  } catch (err) {
    return res.status(400).json({ error: 'Failed to create leave type', detail: err.message });
  }
}

export async function listPeriods(_req, res) {
  try {
    const rows = await LeavePeriod.findAll({ order: [['start_date', 'DESC']] });
    return res.json(rows.map(toPlain));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load leave periods', detail: err.message });
  }
}

export async function savePeriod(req, res) {
  try {
    const { id } = req.params ?? {};
    const payload = {
      name: req.body?.name,
      start_date: req.body?.start_date,
      end_date: req.body?.end_date,
      is_active: req.body?.is_active ?? false,
    };

    if (!payload.name || !payload.start_date || !payload.end_date) {
      return res.status(400).json({ error: 'name, start_date and end_date are required' });
    }

    if (payload.is_active) {
      await LeavePeriod.update({ is_active: false }, { where: { is_active: true } });
    }

    const existing = id ? await LeavePeriod.findByPk(id) : null;
    if (existing) {
      await existing.update(payload);
      return res.json(toPlain(existing));
    }

    const created = await LeavePeriod.create(payload);
    return res.status(201).json(toPlain(created));
  } catch (err) {
    return res.status(400).json({ error: 'Failed to save leave period', detail: err.message });
  }
}

export async function listProfiles(req, res) {
  try {
    const admin = isAdminUser(req.user);
    const where = admin ? {} : { userid: req.user?.userid ?? null };
    if (!admin && !where.userid) return res.json([]);
    const rows = await EmpProfile.findAll({ where, order: [['emp_name', 'ASC']] });
    return res.json(rows.map(toPlain));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load employee profiles', detail: err.message });
  }
}

export async function upsertProfile(req, res) {
  try {
    const { id } = req.params ?? {};
    const payload = {
      emp_id: req.body?.emp_id,
      emp_name: req.body?.emp_name,
      emp_designation: req.body?.emp_designation ?? null,
      institute_id: req.body?.institute_id ?? null,
      userid: req.body?.userid ?? null,
      status: req.body?.status ?? 'Active',
      leave_group: req.body?.leave_group ?? null,
      actual_joining: req.body?.actual_joining ?? null,
    };

    if (!payload.emp_id || !payload.emp_name) {
      return res.status(400).json({ error: 'emp_id and emp_name are required' });
    }

    const existing = id ? await EmpProfile.findByPk(id) : null;
    if (existing) {
      await existing.update(payload);
      return res.json(toPlain(existing));
    }

    const created = await EmpProfile.create(payload);
    return res.status(201).json(toPlain(created));
  } catch (err) {
    return res.status(400).json({ error: 'Failed to save employee profile', detail: err.message });
  }
}

export async function listEntries(req, res) {
  try {
    const admin = isAdminUser(req.user);
    const query = {
      order: [['start_date', 'DESC']],
      include: [
        { model: EmpProfile, as: 'employee', attributes: ['id', 'emp_id', 'emp_name'] },
        { model: LeaveType, as: 'leaveType', attributes: ['leave_code', 'leave_name'] },
      ],
    };

    if (!admin) {
      const profile = await findProfileForUser(req.user);
      if (!profile) return res.json([]);
      query.where = { emp_id: profile.emp_id };
    }

    const rows = await LeaveEntry.findAll(query);
    const formatted = rows.map((row) => {
      const plain = toPlain(row);
      return {
        ...plain,
        emp: plain.emp_id,
        emp_name: row.employee?.emp_name ?? plain.emp_name ?? '',
        leave_type_name: row.leaveType?.leave_name ?? plain.leave_type_name ?? '',
      };
    });
    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load leave entries', detail: err.message });
  }
}

export async function createEntry(req, res) {
  try {
    const admin = isAdminUser(req.user);
    const profile = await findProfileForUser(req.user);
    const payload = { ...req.body };

    const empIdFromPayload = payload.emp_id || payload.emp || payload.empId;
    const empId = admin ? empIdFromPayload : profile?.emp_id;
    if (!empId) {
      return res.status(400).json({ error: 'Employee profile not found' });
    }

    if (!payload.leave_type && payload.leave_type_code) {
      payload.leave_type = payload.leave_type_code;
    }

    if (!payload.leave_type) {
      return res.status(400).json({ error: 'leave_type is required' });
    }

    if (!payload.start_date || !payload.end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    const start = new Date(payload.start_date);
    const end = new Date(payload.end_date);
    const totalDays = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    const created = await LeaveEntry.create({
      emp_id: empId,
      leave_type: payload.leave_type,
      start_date: payload.start_date,
      end_date: payload.end_date,
      total_days: payload.total_days ?? totalDays,
      reason: payload.reason ?? null,
      status: payload.status ?? 'Pending',
      leave_report_no: payload.leave_report_no ?? `LR-${Date.now()}`,
      created_by: req.user?.userid ?? null,
    });

    return res.status(201).json(toPlain(created));
  } catch (err) {
    return res.status(400).json({ error: 'Failed to create leave entry', detail: err.message });
  }
}

export async function listAllocations(req, res) {
  try {
    if (!isAdminUser(req.user)) return res.json([]);
    const period = req.query?.period ? await LeavePeriod.findByPk(req.query.period) : await getActivePeriod();
    if (!period) return res.json([]);

    const allocations = await LeaveAllocation.findAll({
      where: { period_id: period.id },
      include: [
        { model: EmpProfile, as: 'profile', attributes: ['id', 'emp_id', 'emp_name'] },
        { model: LeaveType, as: 'leaveType', attributes: ['leave_code', 'leave_name'] },
      ],
    });

    if (!allocations.length) return res.json([]);

    const empIds = Array.from(new Set(allocations.map((a) => a.profile?.emp_id).filter(Boolean)));
    const leaveCodes = Array.from(new Set(allocations.map((a) => a.leave_type_code)));

    const usageRows = await LeaveEntry.findAll({
      attributes: [
        'emp_id',
        'leave_type',
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_days')), 0), 'used'],
      ],
      where: {
        emp_id: { [Op.in]: empIds },
        leave_type: { [Op.in]: leaveCodes },
        start_date: { [Op.gte]: period.start_date },
        end_date: { [Op.lte]: period.end_date },
      },
      group: ['emp_id', 'leave_type'],
      raw: true,
    });

    const usageMap = new Map();
    usageRows.forEach((row) => {
      const key = `${row.emp_id}:${row.leave_type}`;
      usageMap.set(key, Number(row.used || 0));
    });

    const formatted = allocations.map((alloc) => {
      const plain = toPlain(alloc);
      const empId = alloc.profile?.emp_id ?? plain.profile_id;
      const key = `${empId}:${plain.leave_type_code}`;
      const used = Number(usageMap.get(key) || 0);
      const allocated = Number(plain.allocated || 0) + Number(plain.carried_forward || 0);
      const balance = +(allocated - used).toFixed(2);
      return {
        profile_id: alloc.profile?.id ?? plain.profile_id,
        profile: alloc.profile?.emp_name ?? empId,
        emp_id: empId,
        leave_type: plain.leave_type_code,
        leave_type_name: alloc.leaveType?.leave_name ?? plain.leave_type_code,
        allocated: +allocated,
        carried_forward: Number(plain.carried_forward || 0),
        used,
        balance,
      };
    });

    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load leave allocations', detail: err.message });
  }
}

export async function myBalance(req, res) {
  try {
    const profile = await findProfileForUser(req.user);
    if (!profile) return res.json([]);
    const period = await getActivePeriod();
    if (!period) return res.json([]);

    const allocations = await LeaveAllocation.findAll({
      where: { profile_id: profile.id, period_id: period.id },
      include: [{ model: LeaveType, as: 'leaveType', attributes: ['leave_code', 'leave_name'] }],
    });

    if (!allocations.length) return res.json([]);

    const leaveCodes = allocations.map((a) => a.leave_type_code);
    const usageRows = await LeaveEntry.findAll({
      attributes: [
        'leave_type',
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_days')), 0), 'used'],
      ],
      where: {
        emp_id: profile.emp_id,
        leave_type: { [Op.in]: leaveCodes },
        start_date: { [Op.gte]: period.start_date },
        end_date: { [Op.lte]: period.end_date },
      },
      group: ['leave_type'],
      raw: true,
    });

    const usageMap = new Map();
    usageRows.forEach((row) => usageMap.set(row.leave_type, Number(row.used || 0)));

    const balances = allocations.map((alloc) => {
      const plain = toPlain(alloc);
      const used = Number(usageMap.get(plain.leave_type_code) || 0);
      const allocated = Number(plain.allocated || 0) + Number(plain.carried_forward || 0);
      const balance = +(allocated - used).toFixed(2);
      return {
        leave_type: plain.leave_type_code,
        leave_type_name: alloc.leaveType?.leave_name ?? plain.leave_type_code,
        allocated: +allocated,
        carried_forward: Number(plain.carried_forward || 0),
        used,
        balance,
      };
    });

    return res.json(balances);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to compute leave balance', detail: err.message });
  }
}

export async function saveAllocation(req, res) {
  try {
    const { id } = req.params ?? {};
    const payload = {
      profile_id: req.body?.profile_id,
      period_id: req.body?.period_id,
      leave_type_code: req.body?.leave_type_code,
      allocated: req.body?.allocated ?? 0,
      carried_forward: req.body?.carried_forward ?? 0,
      notes: req.body?.notes ?? null,
    };

    if (!payload.profile_id || !payload.period_id || !payload.leave_type_code) {
      return res.status(400).json({ error: 'profile_id, period_id and leave_type_code are required' });
    }

    const existing = id ? await LeaveAllocation.findByPk(id) : null;
    if (existing) {
      await existing.update(payload);
      return res.json(toPlain(existing));
    }

    const created = await LeaveAllocation.create(payload);
    return res.status(201).json(toPlain(created));
  } catch (err) {
    return res.status(400).json({ error: 'Failed to save leave allocation', detail: err.message });
  }
}
