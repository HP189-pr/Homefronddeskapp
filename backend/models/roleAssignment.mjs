// backend/models/roleAssignment.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const RoleAssignment = sequelize.define('RoleAssignment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userid: { type: DataTypes.INTEGER, allowNull: false },
  roleid: { type: DataTypes.INTEGER, allowNull: false },
  createdat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'role_assignments',
  timestamps: false,
});
