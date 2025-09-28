import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const CourseSub = sequelize.define('CourseSub', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  subcourse_id: { type: DataTypes.INTEGER, allowNull: true },
  subcourse_name: { type: DataTypes.STRING, allowNull: true },
  maincourse_id: { type: DataTypes.INTEGER, allowNull: true },
  createdat: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
}, {
  tableName: 'course_sub',
  timestamps: false,
});
