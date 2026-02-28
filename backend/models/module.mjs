// backend/models/module.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const Module = sequelize.define('Module', {
  moduleid: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  createdat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedby: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'api_module',
  timestamps: false,
});

export default Module;
