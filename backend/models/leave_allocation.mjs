import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';
import { EmpProfile } from './emp_profile.mjs';
import { LeaveType } from './leave_type.mjs';
import { LeavePeriod } from './leave_period.mjs';

export const LeaveAllocation = sequelize.define('LeaveAllocation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  profile_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  period_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  leave_type_code: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  allocated: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 0,
  },
  carried_forward: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 0,
  },
  notes: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'leave_allocation',
  timestamps: false,
});

LeaveAllocation.belongsTo(EmpProfile, { foreignKey: 'profile_id', as: 'profile' });
LeaveAllocation.belongsTo(LeaveType, { foreignKey: 'leave_type_code', targetKey: 'leave_code', as: 'leaveType' });
LeaveAllocation.belongsTo(LeavePeriod, { foreignKey: 'period_id', as: 'period' });

export default LeaveAllocation;
