const db = require("../db");

exports.createLeave = async (payload) => {
  const { LeaveEntry, LeaveType, calculateWorkingDays } = db;

  const type = await LeaveType.findByPk(payload.leave_code);

  let baseDays;

  if (payload.sandwich_leave) {
    const diff =
      (new Date(payload.end_date) - new Date(payload.start_date)) /
      (1000 * 60 * 60 * 24) + 1;
    baseDays = diff;
  } else {
    baseDays = await calculateWorkingDays(
      payload.start_date,
      payload.end_date,
      db.Holiday
    );
  }

  const dayValue = type.is_half ? 0.5 : (type.day_value || 1);

  payload.total_days = baseDays * dayValue;

  return db.LeaveEntry.create(payload);
};
