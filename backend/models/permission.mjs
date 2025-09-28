// backend/models/permission.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const Permission = sequelize.define('Permission', {
  permissionid: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  roleid: { type: DataTypes.INTEGER, allowNull: false },
  moduleid: { type: DataTypes.INTEGER, allowNull: true },
  menuid: { type: DataTypes.INTEGER, allowNull: true },
  action: { type: DataTypes.STRING, allowNull: true },
  instituteid: { type: DataTypes.INTEGER, allowNull: true },
  createdat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'permissions',
  timestamps: false,
});
