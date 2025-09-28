// backend/models/module.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const Module = sequelize.define('Module', {
  moduleid: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: true, unique: true }, // optional canonical id
  createdat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedby: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'modules',
  timestamps: false,
});

export default Module;
