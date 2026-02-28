const { Op } = require("sequelize");

class LeaveEngine {
  constructor(db, tracked = ["EL","CL","SL","VAC","DL","LWP","ML","PL"]) {
    this.db = db;
    this.tracked = tracked.map(c => c.toUpperCase());
  }

  /* =============================
     HELPERS
  ============================= */

  toDecimal(v) {
    if (!v) return 0;
    return parseFloat(v);
  }

  roundOutput(val, code) {
    const v = Number(val || 0);

    if (code === "EL") return Math.round(v);

    const half = Math.round(v * 2) / 2;
    return Number.isInteger(half) ? half : half;
  }

  dayValue(leaveType) {
    if (!leaveType) return 1;

    if (leaveType.is_half) return 0.5;

    return parseFloat(leaveType.day_value || 1);
  }

  /* =============================
     LOADERS
  ============================= */

  async loadPeriods() {
    const periods = await this.db.LeavePeriod.findAll({
      order: [["start_date", "ASC"]],
    });

    return periods.map(p => ({
      id: p.id,
      name: p.period_name,
      start: new Date(p.start_date),
      end: new Date(p.end_date),
    }));
  }

  async loadAllocations(periodIds) {
    return this.db.LeaveAllocation.findAll({
      where: { period_id: periodIds },
    });
  }

  async loadEntries(employeeIds) {
    const where = { status: "Approved" };
    if (employeeIds?.length) where.emp_id = employeeIds;

    return this.db.LeaveEntry.findAll({
      where,
      include: [this.db.LeaveType],
    });
  }

  async loadHolidays(start, end) {
    const rows = await this.db.Holiday.findAll({
      where: {
        holiday_date: { [Op.between]: [start, end] },
      },
      attributes: ["holiday_date"],
      raw: true,
    });

    return new Set(rows.map(r => r.holiday_date));
  }

  /* =============================
     WORKING DAYS
  ============================= */

  workingDays(start, end, holidays) {
    let current = new Date(start);
    let count = 0;

    while (current <= end) {
      const day = current.getDay(); // Sunday=0
      const iso = current.toISOString().slice(0,10);

      if (day !== 0 && !holidays.has(iso)) count++;

      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /* =============================
     SPLIT ENTRY INTO PERIODS
  ============================= */

  splitEntry(entry, periods, holidays) {
    const results = {};

    const leaveCode = entry.leave_code.toUpperCase();
    const dv = this.dayValue(entry.LeaveType);

    for (const p of periods) {
      if (p.end < entry.start_date) continue;
      if (p.start > entry.end_date) break;

      const start = new Date(Math.max(
        new Date(entry.start_date),
        p.start
      ));
      const end = new Date(Math.min(
        new Date(entry.end_date),
        p.end
      ));

      let days;

      if (entry.sandwich_leave) {
        days = (end - start) / 86400000 + 1;
      } else {
        days = this.workingDays(start, end, holidays);
      }

      const amount = days * dv;

      if (!results[p.id]) results[p.id] = {};
      results[p.id][leaveCode] =
        (results[p.id][leaveCode] || 0) + amount;
    }

    return results;
  }

  /* =============================
     MAIN ENGINE
  ============================= */

  async compute({ employee_ids = null } = {}) {
    const periods = await this.loadPeriods();
    if (!periods.length) return { employees: [] };

    const periodIds = periods.map(p => p.id);

    const allocations = await this.loadAllocations(periodIds);
    const entries = await this.loadEntries(employee_ids);

    const holidays = await this.loadHolidays(
      periods[0].start,
      periods[periods.length - 1].end
    );

    /* aggregate allocations */
    const globalAlloc = {};
    const empAlloc = {};

    for (const a of allocations) {
      const code = a.leave_code.toUpperCase();

      if (!globalAlloc[a.period_id])
        globalAlloc[a.period_id] = {};

      globalAlloc[a.period_id][code] =
        (globalAlloc[a.period_id][code] || 0) +
        this.toDecimal(a.allocated);

      if (a.emp_id) {
        const key = `${a.emp_id}_${a.period_id}`;
        if (!empAlloc[key]) empAlloc[key] = {};
        empAlloc[key][code] =
          (empAlloc[key][code] || 0) +
          this.toDecimal(a.allocated);
      }
    }

    /* used days */
    const used = {};

    for (const e of entries) {
      const splits = this.splitEntry(e, periods, holidays);

      for (const pid in splits) {
        for (const code in splits[pid]) {
          const key = `${e.emp_id}_${pid}_${code}`;
          used[key] = (used[key] || 0) + splits[pid][code];
        }
      }
    }

    const employees = await this.db.EmpProfile.findAll();

    const result = [];

    for (const emp of employees) {
      let balances = {
        EL: this.toDecimal(emp.el_balance),
        CL: this.toDecimal(emp.cl_balance),
        SL: this.toDecimal(emp.sl_balance),
        VAC: this.toDecimal(emp.vacation_balance),
      };

      const payload = {
        emp_id: emp.emp_id,
        emp_name: emp.emp_name,
        periods: [],
      };

      for (const p of periods) {
        const start = {};
        const alloc = {};
        const usedSnap = {};
        const end = {};

        for (const code of this.tracked) {
          const baseAlloc =
            (globalAlloc[p.id]?.[code] || 0) +
            (empAlloc[`${emp.emp_id}_${p.id}`]?.[code] || 0);

          const usedVal =
            used[`${emp.emp_id}_${p.id}_${code}`] || 0;

          const opening = balances[code] || 0;
          const closing = opening + baseAlloc - usedVal;

          start[code] = this.roundOutput(opening, code);
          alloc[code] = this.roundOutput(baseAlloc, code);
          usedSnap[code] = this.roundOutput(usedVal, code);
          end[code] = this.roundOutput(closing, code);

          balances[code] = code === "CL" ? 0 : closing;
        }

        payload.periods.push({
          period_id: p.id,
          period_name: p.name,
          starting: start,
          allocation: alloc,
          used: usedSnap,
          ending: end,
        });
      }

      result.push(payload);
    }

    return { employees: result };
  }
}

module.exports = LeaveEngine;
