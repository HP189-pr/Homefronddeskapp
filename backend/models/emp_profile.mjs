// backend/models/emp_profile.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const EmpProfile = sequelize.define('EmpProfile', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  emp_id: { type: DataTypes.STRING(20), allowNull: false },
  emp_name: { type: DataTypes.STRING(100), allowNull: false },
  emp_designation: { type: DataTypes.STRING(100), allowNull: true },
  left_date: DataTypes.DATEONLY,
  leave_group: DataTypes.STRING(20),
  emp_birth_date: DataTypes.DATEONLY,
  el_balance: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  sl_balance: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  cl_balance: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  vacation_balance: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  actual_joining: DataTypes.DATEONLY,
  department_joining: { type: DataTypes.STRING(100), allowNull: true },
  institute_id: { type: DataTypes.STRING(50), allowNull: true },
  joining_year_allocation_el: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  joining_year_allocation_cl: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  joining_year_allocation_sl: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  joining_year_allocation_vac: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  leave_calculation_date: DataTypes.DATEONLY,
  emp_short: DataTypes.INTEGER,
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'Active' },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  created_by: { type: DataTypes.STRING(50), allowNull: true },
  usr_birth_date: DataTypes.DATEONLY,
  username: { type: DataTypes.STRING(150), allowNull: true },
  usercode: { type: DataTypes.STRING(50), allowNull: true },
}, {
  tableName: 'api_empprofile',
  timestamps: false
});

export default EmpProfile;
