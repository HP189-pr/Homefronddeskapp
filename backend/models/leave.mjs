const { DataTypes, Op } = require("sequelize");

module.exports = (sequelize) => {

  const LeaveType = sequelize.define("LeaveType", {
    leave_code: { type: DataTypes.STRING, primaryKey: true },
    leave_name: DataTypes.STRING,
    day_value: { type: DataTypes.DECIMAL(4,2), defaultValue: 1 },
    is_half: DataTypes.BOOLEAN,
  }, {
    tableName: "api_leavetype",
    timestamps: false,
  });

  const LeaveEntry = sequelize.define("LeaveEntry", {
    leave_report_no: { type: DataTypes.STRING, unique: true },
    emp_id: DataTypes.STRING,
    leave_code: DataTypes.STRING,
    start_date: DataTypes.DATEONLY,
    end_date: DataTypes.DATEONLY,
    total_days: DataTypes.DECIMAL(6,2),
    reason: DataTypes.TEXT,
    status: { type: DataTypes.STRING, defaultValue: "Pending" },
    sandwich_leave: DataTypes.BOOLEAN,
  }, {
    tableName: "api_leaveentry",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  });

  const LeavePeriod = sequelize.define("LeavePeriod", {
    period_name: DataTypes.STRING,
    start_date: DataTypes.DATEONLY,
    end_date: DataTypes.DATEONLY,
  }, {
    tableName: "api_leaveperiod",
    timestamps: false,
  });

  const LeaveAllocation = sequelize.define("LeaveAllocation", {
    leave_code: DataTypes.STRING,
    emp_id: DataTypes.STRING,
    allocated: DataTypes.DECIMAL(6,2),
  }, {
    tableName: "api_leaveallocation",
    timestamps: false,
  });

  /* ================= WORKING DAYS CALCULATION ================= */

  async function calculateWorkingDays(start, end, HolidayModel) {
    const holidays = await HolidayModel.findAll({
      where: { holiday_date: { [Op.between]: [start, end] } },
      attributes: ["holiday_date"],
      raw: true,
    });

    const holidaySet = new Set(holidays.map(h => h.holiday_date));

    let current = new Date(start);
    let working = 0;

    while (current <= new Date(end)) {
      const day = current.getDay(); // Sunday = 0
      const iso = current.toISOString().slice(0,10);

      if (day !== 0 && !holidaySet.has(iso)) working++;

      current.setDate(current.getDate() + 1);
    }

    return working;
  }

  /* ================= AUTO REPORT NO + DAYS ================= */

  LeaveEntry.beforeCreate(async (rec, options) => {
    const year = rec.start_date.slice(2,4);

    const last = await LeaveEntry.findOne({
      where: { leave_report_no: { [Op.like]: `${year}_%` } },
      order: [["leave_report_no", "DESC"]],
    });

    let seq = 1;
    if (last) seq = parseInt(last.leave_report_no.split("_")[1]) + 1;

    rec.leave_report_no = `${year}_${String(seq).padStart(4,"0")}`;
  });

  return {
    LeaveType,
    LeaveEntry,
    LeavePeriod,
    LeaveAllocation,
    calculateWorkingDays,
  };
};
