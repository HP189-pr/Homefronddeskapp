// backend/models/permission.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const Permission = sequelize.define('Permission', {
  permitid: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userid: { type: DataTypes.INTEGER, allowNull: false },
  moduleid: { type: DataTypes.INTEGER, allowNull: true },
  menuid: { type: DataTypes.INTEGER, allowNull: true },
  canview: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  canedit: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  candelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  cancreate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  createdat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'api_userpermissions',
  timestamps: false,
});
