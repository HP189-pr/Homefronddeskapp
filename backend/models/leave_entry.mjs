import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';
import { EmpProfile } from './emp_profile.mjs';
import { LeaveType } from './leave_type.mjs';

export const LeaveEntry = sequelize.define('LeaveEntry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  emp_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  leave_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  total_days: {
    type: DataTypes.DECIMAL(6, 2),
    defaultValue: 0,
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'Pending',
  },
  leave_report_no: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  created_by: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  approved_by: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'leave_entry',
  timestamps: false,
});

LeaveEntry.belongsTo(EmpProfile, { foreignKey: 'emp_id', targetKey: 'emp_id', as: 'employee' });
LeaveEntry.belongsTo(LeaveType, { foreignKey: 'leave_type', targetKey: 'leave_code', as: 'leaveType' });

export default LeaveEntry;
