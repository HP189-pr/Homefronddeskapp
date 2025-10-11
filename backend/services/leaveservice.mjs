// backend/services/leaveService.js
import { Op } from 'sequelize';
import LeaveAllocation from '../models/LeaveAllocation.js';
import LeaveEntry from '../models/LeaveEntry.js';
import LeavePeriod from '../models/LeavePeriod.js';
import LeaveType from '../models/LeaveType.js';
import EmpProfile from '../models/EmpProfile.js';
import LeaveBalanceSnapshot from '../models/LeaveBalanceSnapshot.js';
import sequelize from '../models/index.js'; // adjust if needed

export async function getSnapshotBefore(profileId, asOfDate) {
  return LeaveBalanceSnapshot.findOne({
    where: { profile_id: profileId, balance_date: { [Op.lte]: asOfDate } },
    order: [['balance_date', 'DESC']],
  });
}

export async function getUsedDaysForAllocation(profileId, leaveCode, periodId) {
  const period = await LeavePeriod.findByPk(periodId);
  if (!period) return 0;
  const profile = await EmpProfile.findByPk(profileId);
  if (!profile) return 0;
  const empId = profile.emp_id;

  const rows = await LeaveEntry.findAll({
    attributes: [[sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_days')), 0), 'used']],
    where: {
      emp_id: empId,
      leave_type: leaveCode,
      start_date: { [Op.gte]: period.start_date },
      end_date: { [Op.lte]: period.end_date },
      status: { [Op.in]: ['Approved', 'Pending'] } // change as needed
    },
    raw: true
  });

  return parseFloat(rows[0].used || 0);
}

/**
 * computeMyLeaveBalance(user)
 * returns array with allocation + balances (same logic as Django view).
 */
export async function computeMyLeaveBalance(user) {
  if (!user || !user.username) throw new Error('User required');
  const profile = await EmpProfile.findOne({ where: { userid: user.username }});
  if (!profile) throw new Error('Profile not found');

  const period = await LeavePeriod.findOne({ where: { is_active: true }});
  if (!period) throw new Error('No active leave period');

  const allocations = await LeaveAllocation.findAll({
    where: { profile_id: profile.id, period_id: period.id },
    include: [{ model: LeaveType, as: 'leaveType' }]
  });

  const result = [];
  for (const a of allocations) {
    const lt = a.leaveType;
    const snap = await getSnapshotBefore(profile.id, period.start_date);
    let prev_bal = 0;
    const code = String(lt.leave_code || '').toLowerCase();

    if (snap) {
      if (code.startsWith('el')) prev_bal = parseFloat(snap.el_balance || 0);
      else if (code.startsWith('sl')) prev_bal = parseFloat(snap.sl_balance || 0);
      else if (code.startsWith('cl')) prev_bal = parseFloat(snap.cl_balance || 0);
      else prev_bal = parseFloat(snap.vacation_balance || 0);
    }

    let joining_alloc = 0;
    if (code.includes('el')) joining_alloc = parseFloat(profile.joining_year_allocation_el || 0);
    else if (code.includes('sl')) joining_alloc = parseFloat(profile.joining_year_allocation_sl || 0);
    else if (code.includes('cl')) joining_alloc = parseFloat(profile.joining_year_allocation_cl || 0);
    else joining_alloc = parseFloat(profile.joining_year_allocation_vac || 0);

    // prorate
    const periodDays = (new Date(period.end_date) - new Date(period.start_date)) / (1000*3600*24) + 1;
    let prorated = parseFloat(a.allocated || 0);
    if (profile.actual_joining) {
      const aj = new Date(profile.actual_joining);
      const pstart = new Date(period.start_date);
      const pend = new Date(period.end_date);
      if (aj > pstart && aj <= pend) {
        const remainingDays = (pend - aj) / (1000*3600*24) + 1;
        prorated = +((parseFloat(a.allocated || 0) * (remainingDays / periodDays)).toFixed(2));
      }
    }

    const used = await getUsedDaysForAllocation(profile.id, lt.leave_code, period.id);
    const final_balance = +(prev_bal + joining_alloc + parseFloat(a.allocated || 0) - used).toFixed(2);

    result.push({
      leave_type: lt.leave_code,
      leave_type_name: lt.leave_name,
      previous_balance: +prev_bal,
      joining_allocation: +joining_alloc,
      period_allocation: +parseFloat(a.allocated || 0),
      prorated_allocation: prorated,
      used,
      final_balance
    });
  }

  return result;
}
