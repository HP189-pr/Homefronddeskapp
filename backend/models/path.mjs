// backend/models/path.mjs (key/value store for system paths and other settings)
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

// Keep the exported name `Setting` for backward compatibility across imports
export const Setting = sequelize.define(
  'Setting',
  {
    key: { type: DataTypes.STRING(191), primaryKey: true },
    value: { type: DataTypes.TEXT, allowNull: true },
    updatedat: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'path',
    timestamps: false,
    indexes: [{ unique: true, fields: ['key'] }],
  },
);

// Also export a `Path` alias if preferred elsewhere
export const Path = Setting;
export default Setting;
