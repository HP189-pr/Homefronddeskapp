// backend/models/institute.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const Institute = sequelize.define('Institute', {
  institute_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
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
  updatedby: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'institute',
  timestamps: false,
});
