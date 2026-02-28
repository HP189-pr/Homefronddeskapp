import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const ConvocationMaster = sequelize.define('ConvocationMaster', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  convocation_no: { type: DataTypes.INTEGER, allowNull: false },
  convocation_title: { type: DataTypes.STRING(50), allowNull: true },
  convocation_date: { type: DataTypes.DATEONLY, allowNull: false },
  month_year: { type: DataTypes.STRING(20), allowNull: true },
}, {
  tableName: 'convocation_master',
  timestamps: false,
});

export default ConvocationMaster;