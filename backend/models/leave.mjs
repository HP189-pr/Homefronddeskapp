import { DataTypes, Op } from 'sequelize';
import { sequelize } from '../db.mjs';

export const LeaveType = sequelize.define('LeaveType', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  leave_code: { type: DataTypes.STRING, allowNull: false },
  leave_name: DataTypes.STRING,
  main_type: { type: DataTypes.STRING, field: 'parent_leave' },
  day_value: { type: DataTypes.DECIMAL(4, 2), defaultValue: 1, field: 'leave_unit' },
  session: { type: DataTypes.STRING, field: 'leave_mode' },
  annual_allocation: { type: DataTypes.INTEGER, field: 'annual_limit' },
  is_half: DataTypes.BOOLEAN,
  is_active: DataTypes.BOOLEAN,
}, {
  tableName: 'api_leavetype',
  timestamps: false,
});

export const LeaveEntry = sequelize.define('LeaveEntry', {
  leave_report_no: { type: DataTypes.STRING, unique: true },
  emp_id: DataTypes.STRING,
  leave_code: DataTypes.STRING,
  start_date: DataTypes.DATEONLY,
  end_date: DataTypes.DATEONLY,
  total_days: DataTypes.DECIMAL(6, 2),
  reason: DataTypes.TEXT,
  status: { type: DataTypes.STRING, defaultValue: 'Pending' },
  sandwich_leave: DataTypes.BOOLEAN,
}, {
  tableName: 'api_leaveentry',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

export const LeavePeriod = sequelize.define('LeavePeriod', {
  period_name: DataTypes.STRING,
  start_date: DataTypes.DATEONLY,
  end_date: DataTypes.DATEONLY,
}, {
  tableName: 'api_leaveperiod',
  timestamps: false,
});

export const LeaveAllocation = sequelize.define('LeaveAllocation', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  leave_code: DataTypes.STRING,
  emp_id: DataTypes.STRING,
  allocated: DataTypes.DECIMAL(6, 2),
  period_id: DataTypes.INTEGER,
  allocated_start_date: DataTypes.DATEONLY,
  allocated_end_date: DataTypes.DATEONLY,
}, {
  tableName: 'api_leaveallocation',
  timestamps: false,
});

export async function calculateWorkingDays(start, end, HolidayModel) {
  const holidays = await HolidayModel.findAll({
    where: { holiday_date: { [Op.between]: [start, end] } },
    attributes: ['holiday_date'],
    raw: true,
  });

  const holidaySet = new Set(holidays.map((h) => h.holiday_date));

  let current = new Date(start);
  let working = 0;

  while (current <= new Date(end)) {
    const day = current.getDay();
    const iso = current.toISOString().slice(0, 10);
    if (day !== 0 && !holidaySet.has(iso)) working++;
    current.setDate(current.getDate() + 1);
  }

  return working;
}

LeaveEntry.beforeCreate(async (rec) => {
  const year = rec.start_date.slice(2, 4);
  const last = await LeaveEntry.findOne({
    where: { leave_report_no: { [Op.like]: `${year}_%` } },
    order: [['leave_report_no', 'DESC']],
  });

  let seq = 1;
  if (last) seq = parseInt(last.leave_report_no.split('_')[1], 10) + 1;

  rec.leave_report_no = `${year}_${String(seq).padStart(4, '0')}`;
});

export default { LeaveType, LeaveEntry, LeavePeriod, LeaveAllocation, calculateWorkingDays };
