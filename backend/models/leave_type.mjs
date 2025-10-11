import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const LeaveType = sequelize.define('LeaveType', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  leave_code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  leave_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  max_per_year: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true,
  },
}, {
  tableName: 'leave_type',
  timestamps: false,
});

export default LeaveType;
