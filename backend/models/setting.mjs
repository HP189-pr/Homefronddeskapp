// backend/models/setting.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const Setting = sequelize.define(
  'Setting',
  {
    key: { type: DataTypes.STRING(191), primaryKey: true },
    value: { type: DataTypes.TEXT, allowNull: true },
    updatedat: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'settings',
    timestamps: false,
    indexes: [{ unique: true, fields: ['key'] }],
  },
);

export default Setting;
