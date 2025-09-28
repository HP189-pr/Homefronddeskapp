// backend/models/institute.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const Institute = sequelize.define('Institute', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  institute_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  institute_code: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  institute_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  institute_campus: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  institute_address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  institute_city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdat: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  updatedat: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'institutes',
  timestamps: false,
});
