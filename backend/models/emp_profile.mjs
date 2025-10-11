// backend/models/emp_profile.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const EmpProfile = sequelize.define('EmpProfile', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  emp_id: { type: DataTypes.STRING(20), unique: true, allowNull: false },
  emp_name: { type: DataTypes.STRING(100), allowNull: false },
  emp_designation: DataTypes.STRING(100),
  left_date: DataTypes.DATEONLY,
  leave_group: DataTypes.STRING(20),
  emp_birth_date: DataTypes.DATEONLY,
  el_balance: { type: DataTypes.DECIMAL(8,2), defaultValue: 0 },
  sl_balance: { type: DataTypes.DECIMAL(8,2), defaultValue: 0 },
  cl_balance: { type: DataTypes.DECIMAL(8,2), defaultValue: 0 },
  vacation_balance: { type: DataTypes.DECIMAL(8,2), defaultValue: 0 },
  actual_joining: DataTypes.DATEONLY,
  department_joining: DataTypes.STRING(100),
  institute_id: DataTypes.STRING(50),
  joining_year_allocation_el: { type: DataTypes.DECIMAL(8,2), defaultValue: 0 },
  joining_year_allocation_cl: { type: DataTypes.DECIMAL(8,2), defaultValue: 0 },
  joining_year_allocation_sl: { type: DataTypes.DECIMAL(8,2), defaultValue: 0 },
  joining_year_allocation_vac: { type: DataTypes.DECIMAL(8,2), defaultValue: 0 },
  leave_calculation_date: DataTypes.DATEONLY,
  emp_short: DataTypes.INTEGER,
  userid: DataTypes.STRING(50),
  status: { type: DataTypes.STRING(20), defaultValue: 'Active' },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  created_by: DataTypes.STRING(50)
}, {
  tableName: 'emp_profile',
  timestamps: false
});

export default EmpProfile;
